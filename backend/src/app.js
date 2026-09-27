import express from "express";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import { rateLimit } from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { categories, normalizeSearch } from "./catalog.js";
import { hashPassword, verifyPassword } from "./password.js";

const tokenOptions = {
  algorithm: "HS256",
  issuer: "churreria-local",
  audience: "churreria-web",
  expiresIn: "1h",
};
const productJSON = (p) => ({ ...p, available: Boolean(p.available) });
const failure = (res, status, message) =>
  res.status(status).json({ error: message });

export function createApp({
  db,
  jwtSecret,
  origin = "http://localhost:4200",
  authLimit = 30,
}) {
  if (typeof jwtSecret !== "string" || jwtSecret.length < 32)
    throw new Error(
      "JWT_SECRET debe tener al menos 32 caracteres. Ejecuta npm run setup.",
    );
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin,
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "16kb" }));
  app.get("/api/health", (_req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ status: "ok" });
  });
  app.get("/api/categories", (_req, res) => res.json(categories));
  app.get("/api/products", (req, res) => {
    const { q = "", category = "" } = req.query;
    if (
      typeof q !== "string" ||
      q.length > 100 ||
      typeof category !== "string" ||
      (category && !categories.some((c) => c.id === category))
    ) {
      return failure(res, 400, "Búsqueda o categoría no válida.");
    }
    // instr treats %, _ and SQL punctuation as literal text.
    const rows = db
      .prepare(
        `SELECT * FROM products WHERE
      (? = '' OR instr(search_normalize(name || ' ' || description), ?) > 0)
      AND (? = '' OR category = ?) ORDER BY id`,
      )
      .all(
        normalizeSearch(q.trim()),
        normalizeSearch(q.trim()),
        category,
        category,
      );
    res.json(rows.map(productJSON));
  });
  app.get("/api/products/:id", (req, res) => {
    if (
      !/^[1-9]\d*$/.test(req.params.id) ||
      !Number.isSafeInteger(Number(req.params.id))
    )
      return failure(res, 400, "Identificador no válido.");
    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(Number(req.params.id));
    if (!product) return failure(res, 404, "Producto no encontrado.");
    res.json(productJSON(product));
  });
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: authLimit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: "Demasiados intentos. Inténtalo de nuevo en 15 minutos.",
      },
    }),
  );
  const credentials = (body) => {
    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.password !== "string"
    )
      return null;
    const email = body.email.trim().toLowerCase();
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      body.password.length < 10 ||
      body.password.length > 128
    )
      return null;
    return { email, password: body.password };
  };
  const session = (user) => ({
    user: { id: user.id, email: user.email },
    token: jwt.sign({}, jwtSecret, {
      ...tokenOptions,
      subject: String(user.id),
    }),
  });
  app.post("/api/auth/register", async (req, res) => {
    const data = credentials(req.body);
    if (!data)
      return failure(
        res,
        400,
        "Introduce un correo válido y una contraseña de 10 a 128 caracteres.",
      );
    if (db.prepare("SELECT id FROM users WHERE email = ?").get(data.email))
      return failure(res, 409, "Ya existe una cuenta con ese correo.");
    const hash = await hashPassword(data.password);
    try {
      const result = db
        .prepare("INSERT INTO users (email, passwordHash) VALUES (?, ?)")
        .run(data.email, hash);
      res
        .status(201)
        .json(
          session({ id: Number(result.lastInsertRowid), email: data.email }),
        );
    } catch (error) {
      if (
        error.code === "ERR_SQLITE_ERROR" &&
        String(error.message).includes("UNIQUE")
      )
        return failure(res, 409, "Ya existe una cuenta con ese correo.");
      throw error;
    }
  });
  app.post("/api/auth/login", async (req, res) => {
    const data = credentials(req.body);
    if (!data)
      return failure(
        res,
        400,
        "Introduce un correo válido y una contraseña de 10 a 128 caracteres.",
      );
    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(data.email);
    // Execute scrypt even for unknown accounts.
    const dummyHash =
      "scrypt$00000000000000000000000000000000$" + "0".repeat(128);
    const valid = await verifyPassword(
      data.password,
      user?.passwordHash ?? dummyHash,
    );
    if (!user || !valid)
      return failure(res, 401, "Correo o contraseña incorrectos.");
    res.json(session(user));
  });
  app.get("/api/me", (req, res) => {
    const match = /^Bearer (\S+)$/.exec(req.headers.authorization ?? "");
    if (!match)
      return failure(res, 401, "Inicia sesión para consultar tu perfil.");
    try {
      const token = jwt.verify(match[1], jwtSecret, {
        algorithms: ["HS256"],
        issuer: tokenOptions.issuer,
        audience: tokenOptions.audience,
      });
      const user = db
        .prepare("SELECT id, email, createdAt FROM users WHERE id = ?")
        .get(Number(token.sub));
      if (!user) return failure(res, 401, "La cuenta ya no está disponible.");
      res.json(user);
    } catch {
      return failure(
        res,
        401,
        "La sesión ha caducado o no es válida. Vuelve a entrar.",
      );
    }
  });
  app.post("/api/orders", (req, res) => {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0 || items.length > 50)
      return failure(
        res,
        400,
        "El pedido debe contener entre 1 y 50 productos.",
      );
    const ids = new Set();
    const lines = [];
    for (const item of items) {
      if (
        !item ||
        !Number.isSafeInteger(item.productId) ||
        item.productId < 1 ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 99 ||
        ids.has(item.productId)
      ) {
        return failure(
          res,
          400,
          "Productos únicos y cantidades enteras entre 1 y 99 son obligatorios.",
        );
      }
      ids.add(item.productId);
      const product = db
        .prepare("SELECT * FROM products WHERE id = ?")
        .get(item.productId);
      if (!product || !product.available)
        return failure(
          res,
          409,
          "Uno de los productos ya no está disponible. Revisa tu carrito.",
        );
      if (item.expectedPriceCents !== product.priceCents)
        return failure(
          res,
          409,
          "Ha cambiado un precio. Actualiza el carrito antes de confirmar.",
        );
      lines.push({
        productId: product.id,
        name: product.name,
        priceCents: product.priceCents,
        quantity: item.quantity,
      });
    }
    const totalCents = lines.reduce(
      (total, line) => total + line.priceCents * line.quantity,
      0,
    );
    const id = randomUUID();
    db.exec("BEGIN");
    try {
      db.prepare("INSERT INTO orders (id,totalCents) VALUES (?,?)").run(
        id,
        totalCents,
      );
      const insert = db.prepare(
        "INSERT INTO order_items (orderId,productId,name,priceCents,quantity) VALUES (?,?,?,?,?)",
      );
      for (const line of lines)
        insert.run(
          id,
          line.productId,
          line.name,
          line.priceCents,
          line.quantity,
        );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    res
      .status(201)
      .json({
        id,
        totalCents,
        items: lines,
        demo: true,
        message:
          "Pedido de demostración confirmado. No se ha realizado ningún cobro.",
      });
  });
  app.use((_req, res) => failure(res, 404, "Ruta no encontrada."));
  app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed")
      return failure(res, 400, "El cuerpo JSON no es válido.");
    if (error.type === "entity.too.large")
      return failure(res, 413, "La solicitud es demasiado grande.");
    console.error("Error interno:", error.message);
    return failure(res, 500, "No se pudo completar la solicitud.");
  });
  return app;
}
