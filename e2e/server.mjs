import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { openDatabase } from "../backend/src/db.js";
import { createApp } from "../backend/src/app.js";
const directory = new URL("../.test-data/", import.meta.url);
mkdirSync(directory, { recursive: true });
const db = openDatabase(fileURLToPath(new URL("e2e.sqlite", directory)));
const app = createApp({
  db,
  jwtSecret: "e2e-public-test-secret-not-for-real-accounts-12345",
  origin: "http://localhost:4300",
  authLimit: 1000,
});
const server = app.listen(3101, "127.0.0.1", () =>
  console.log("API E2E lista"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
