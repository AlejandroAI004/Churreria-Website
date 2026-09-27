import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import jwt from "jsonwebtoken";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../src/app.js";
import { openDatabase } from "../src/db.js";
import { hashPassword, verifyPassword } from "../src/password.js";

const secret = "unit-test-only-secret-that-is-never-used-by-the-local-app";
let db, app;
beforeEach(() => {
  db = openDatabase();
  app = createApp({ db, jwtSecret: secret });
});
afterEach(() => db.close());
const account = { email: "vecino@example.com", password: "UnaClaveLocal123!" };
const validOrder = () => ({
  items: [{ productId: 1, quantity: 2, expectedPriceCents: 350 }],
});

test("health and categories are public and backed by an open DB", async () => {
  assert.equal(
    (await request(app).get("/api/health").expect(200)).body.status,
    "ok",
  );
  assert.equal(
    (await request(app).get("/api/categories").expect(200)).body.length,
    4,
  );
});
test("products come from SQLite with integer prices and availability", async () => {
  db.prepare("UPDATE products SET priceCents = ? WHERE id = ?").run(777, 1);
  const { body } = await request(app).get("/api/products").expect(200);
  assert.equal(body.length, 8);
  assert.equal(body[0].priceCents, 777);
  assert.equal(body[7].available, false);
});
test("search ignores accents, case and outer whitespace", async () => {
  const { body } = await request(app)
    .get("/api/products")
    .query({ q: "  CAFE  " })
    .expect(200);
  assert.deepEqual(
    body.map((p) => p.id),
    [7],
  );
});
test("search and category combine, including empty results", async () => {
  const { body } = await request(app)
    .get("/api/products")
    .query({ q: "chocolate", category: "bebidas" })
    .expect(200);
  assert.deepEqual(
    body.map((p) => p.id),
    [6],
  );
  assert.deepEqual(
    (
      await request(app)
        .get("/api/products")
        .query({ q: "cafe", category: "rellenos" })
        .expect(200)
    ).body,
    [],
  );
  assert.equal(
    (
      await request(app)
        .get("/api/products")
        .query({ category: "rellenos" })
        .expect(200)
    ).body.length,
    3,
  );
});
test("search treats SQL and wildcard characters as literal text", async () => {
  for (const q of ["' OR 1=1 --", "%", "_"])
    assert.deepEqual(
      (await request(app).get("/api/products").query({ q }).expect(200)).body,
      [],
    );
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM products").get().n, 8);
});
test("rejects unknown categories, oversized searches and repeated query params", async () => {
  for (const url of [
    "/api/products?category=nope",
    "/api/products?q=a&q=b",
    "/api/products?category=a&category=b",
    "/api/products?q=" + "a".repeat(101),
  ])
    await request(app).get(url).expect(400);
});
test("detail includes data from the database and distinguishes missing/invalid ids", async () => {
  assert.equal(
    (await request(app).get("/api/products/1").expect(200)).body.name,
    "Churros de siempre",
  );
  await request(app).get("/api/products/999").expect(404);
  for (const id of ["abc", "0", "-1", "1.5", "1x", "9007199254740993"])
    await request(app)
      .get("/api/products/" + id)
      .expect(400);
});
test("registration normalizes email and never exposes a password/hash", async () => {
  const { body } = await request(app)
    .post("/api/auth/register")
    .send({ ...account, email: " VECINO@EXAMPLE.COM " })
    .expect(201);
  assert.equal(body.user.email, account.email);
  assert.deepEqual(Object.keys(body).sort(), ["token", "user"]);
  assert.deepEqual(Object.keys(body.user).sort(), ["email", "id"]);
  const stored = db.prepare("SELECT * FROM users").get();
  assert.notEqual(stored.passwordHash, account.password);
  assert.match(stored.passwordHash, /^scrypt\$/);
  assert.ok(await verifyPassword(account.password, stored.passwordHash));
  assert.equal(jwt.verify(body.token, secret).sub, String(body.user.id));
});
test("same passwords use different salts and incorrect passwords fail", async () => {
  const a = await hashPassword(account.password),
    b = await hashPassword(account.password);
  assert.notEqual(a, b);
  assert.ok(await verifyPassword(account.password, a));
  assert.equal(await verifyPassword("WrongPassword123", a), false);
  assert.equal(await verifyPassword(account.password, "invalid"), false);
});
test("registration validates required fields, email and password length", async () => {
  for (const body of [
    {},
    null,
    { email: 42, password: account.password },
    { ...account, email: "bad" },
    { ...account, password: "short" },
    { ...account, password: "x".repeat(129) },
    { ...account, email: "a".repeat(250) + "@e.com" },
  ]) {
    await request(app)
      .post("/api/auth/register")
      .send(body ?? {})
      .expect(400);
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users").get().n, 0);
});
test("duplicate emails are rejected case-insensitively", async () => {
  await request(app).post("/api/auth/register").send(account).expect(201);
  await request(app)
    .post("/api/auth/register")
    .send({ ...account, email: account.email.toUpperCase() })
    .expect(409);
});
test("concurrent registrations preserve the uniqueness constraint", async () => {
  const responses = await Promise.all(
    [1, 2].map(() => request(app).post("/api/auth/register").send(account)),
  );
  assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
});
test("valid login and JWT allow profile access", async () => {
  await request(app).post("/api/auth/register").send(account).expect(201);
  const login = await request(app)
    .post("/api/auth/login")
    .send(account)
    .expect(200);
  const { body } = await request(app)
    .get("/api/me")
    .set("Authorization", "Bearer " + login.body.token)
    .expect(200);
  assert.equal(body.email, account.email);
  assert.ok(body.createdAt);
  assert.equal(body.passwordHash, undefined);
});
test("invalid login does not disclose whether an account exists", async () => {
  await request(app).post("/api/auth/register").send(account).expect(201);
  const wrong = await request(app)
    .post("/api/auth/login")
    .send({ ...account, password: "wrongpassword!" })
    .expect(401);
  const unknown = await request(app)
    .post("/api/auth/login")
    .send({ ...account, email: "unknown@example.com" })
    .expect(401);
  assert.deepEqual(wrong.body, unknown.body);
  await request(app).post("/api/auth/login").send({}).expect(400);
});
test("profile rejects missing, malformed, expired, forged and wrong-audience JWTs", async () => {
  await request(app).get("/api/me").expect(401);
  const tokens = [
    "invalid",
    jwt.sign({ sub: "1" }, secret, { expiresIn: -1 }),
    jwt.sign({ sub: "1" }, "another-secret"),
    jwt.sign({ sub: "1" }, secret, {
      audience: "wrong",
      issuer: "churreria-local",
    }),
  ];
  for (const token of tokens)
    await request(app)
      .get("/api/me")
      .set("Authorization", "Bearer " + token)
      .expect(401);
  await request(app)
    .get("/api/me")
    .set("Authorization", "Basic abc")
    .expect(401);
});
test("a removed account cannot reuse an otherwise valid JWT", async () => {
  const { body } = await request(app)
    .post("/api/auth/register")
    .send(account)
    .expect(201);
  db.prepare("DELETE FROM users WHERE id = ?").run(body.user.id);
  await request(app)
    .get("/api/me")
    .set("Authorization", "Bearer " + body.token)
    .expect(401);
});
test("authentication requests are rate limited", async () => {
  const limited = createApp({ db, jwtSecret: secret, authLimit: 2 });
  await request(limited).post("/api/auth/login").send({}).expect(400);
  await request(limited).post("/api/auth/login").send({}).expect(400);
  const { body } = await request(limited)
    .post("/api/auth/login")
    .send({})
    .expect(429);
  assert.match(body.error, /Demasiados/);
});
test("guest checkout calculates and persists prices on the server", async () => {
  const { body } = await request(app)
    .post("/api/orders")
    .send({ ...validOrder(), totalCents: 1 })
    .expect(201);
  assert.equal(body.totalCents, 700);
  assert.equal(body.demo, true);
  assert.equal(
    db.prepare("SELECT totalCents FROM orders WHERE id = ?").get(body.id)
      .totalCents,
    700,
  );
  assert.equal(
    db
      .prepare("SELECT quantity FROM order_items WHERE orderId = ?")
      .get(body.id).quantity,
    2,
  );
});
test("empty, duplicate, fractional, negative and excessive quantities are rejected", async () => {
  const invalid = [
    {},
    { items: [] },
    { items: [null] },
    { items: [{ productId: 1, quantity: "2" }] },
    { items: [{ productId: 1, quantity: 1.5 }] },
    { items: [{ productId: 1, quantity: 0 }] },
    { items: [{ productId: 1, quantity: -1 }] },
    { items: [{ productId: 1, quantity: 100 }] },
    { items: [{ productId: "1", quantity: 1 }] },
    { items: [...validOrder().items, ...validOrder().items] },
    { items: Array(51).fill(validOrder().items[0]) },
  ];
  for (const body of invalid)
    await request(app).post("/api/orders").send(body).expect(400);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM orders").get().n, 0);
});
test("unavailable products and stale/tampered prices cannot be ordered", async () => {
  for (const item of [
    { productId: 8, quantity: 1, expectedPriceCents: 450 },
    { productId: 999, quantity: 1, expectedPriceCents: 100 },
    { productId: 1, quantity: 1, expectedPriceCents: 1 },
    { productId: 1, quantity: 1 },
  ]) {
    await request(app)
      .post("/api/orders")
      .send({ items: [item] })
      .expect(409);
  }
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM orders").get().n, 0);
});
test("checkout supports quantity boundaries and multiple products", async () => {
  const { body } = await request(app)
    .post("/api/orders")
    .send({
      items: [
        { productId: 1, quantity: 99, expectedPriceCents: 350 },
        { productId: 7, quantity: 1, expectedPriceCents: 220 },
      ],
    })
    .expect(201);
  assert.equal(body.totalCents, 34870);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM order_items").get().n, 2);
});
test("failed order item insertion rolls back the entire transaction", async () => {
  db.exec(
    "CREATE TRIGGER reject_items BEFORE INSERT ON order_items BEGIN SELECT RAISE(ABORT, 'test rollback'); END;",
  );
  await request(app).post("/api/orders").send(validOrder()).expect(500);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM orders").get().n, 0);
});
test("malformed JSON, oversized bodies and missing routes return clear errors", async () => {
  await request(app)
    .post("/api/auth/login")
    .set("Content-Type", "application/json")
    .send("{bad")
    .expect(400);
  await request(app)
    .post("/api/auth/login")
    .send({ x: "a".repeat(17000) })
    .expect(413);
  await request(app).get("/api/unknown").expect(404);
});
test("CORS allows the configured development frontend and includes security headers", async () => {
  const response = await request(app)
    .get("/api/products")
    .set("Origin", "http://localhost:4200")
    .expect(200);
  assert.equal(
    response.headers["access-control-allow-origin"],
    "http://localhost:4200",
  );
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.equal(response.headers["x-powered-by"], undefined);
});
test("a short/missing JWT secret prevents startup", () => {
  assert.throws(() => createApp({ db, jwtSecret: "" }), /JWT_SECRET/);
  assert.throws(() => createApp({ db }), /JWT_SECRET/);
});
test("file database persists changes and only seeds an empty product table", () => {
  const dir = mkdtempSync(join(tmpdir(), "churreria-unit-"));
  const path = join(dir, "store.sqlite");
  let disk;
  try {
    disk = openDatabase(path);
    disk
      .prepare("UPDATE products SET name = ? WHERE id = ?")
      .run("Cambio persistente", 1);
    disk.close();
    disk = openDatabase(path);
    assert.equal(disk.prepare("SELECT COUNT(*) AS n FROM products").get().n, 8);
    assert.equal(
      disk.prepare("SELECT name FROM products WHERE id = 1").get().name,
      "Cambio persistente",
    );
    disk.exec("DELETE FROM products");
    disk.close();
    disk = openDatabase(path);
    assert.equal(disk.prepare("SELECT COUNT(*) AS n FROM products").get().n, 8);
  } finally {
    disk?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
