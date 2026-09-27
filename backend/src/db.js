import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { seedProducts, normalizeSearch } from "./catalog.js";

export function openDatabase(path = ":memory:") {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
      priceCents INTEGER NOT NULL CHECK(priceCents >= 0), category TEXT NOT NULL,
      available INTEGER NOT NULL CHECK(available IN (0,1)), image TEXT NOT NULL,
      portion TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, totalCents INTEGER NOT NULL, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      orderId TEXT NOT NULL REFERENCES orders(id), productId INTEGER NOT NULL REFERENCES products(id),
      name TEXT NOT NULL, priceCents INTEGER NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
      PRIMARY KEY(orderId, productId)
    );
  `);
  db.function("search_normalize", { deterministic: true }, normalizeSearch);
  if (db.prepare("SELECT COUNT(*) AS n FROM products").get().n === 0) {
    const insert = db.prepare(
      "INSERT INTO products (name,description,priceCents,category,available,image,portion) VALUES (?,?,?,?,?,?,?)",
    );
    db.exec("BEGIN");
    try {
      for (const product of seedProducts) insert.run(...product);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      db.close();
      throw error;
    }
  }
  return db;
}
