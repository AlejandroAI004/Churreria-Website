import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openDatabase } from "./db.js";
import { createApp } from "./app.js";
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error("PORT no válido.");
const db = openDatabase(
  resolve(backendRoot, process.env.DB_PATH || "./data/churreria.sqlite"),
);
const app = createApp({
  db,
  jwtSecret: process.env.JWT_SECRET,
  origin: process.env.FRONTEND_ORIGIN,
});
const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log("Churrería API: http://localhost:" + port),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
