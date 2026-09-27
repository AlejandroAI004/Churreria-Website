import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
const target = new URL("../backend/.env", import.meta.url);
if (existsSync(target)) {
  console.log("backend/.env ya existe; se conserva sin cambios.");
} else {
  const example = readFileSync(
    new URL("../backend/.env.example", import.meta.url),
    "utf8",
  );
  writeFileSync(
    target,
    example.replace(
      "JWT_SECRET=",
      "JWT_SECRET=" + randomBytes(48).toString("hex"),
    ),
    { mode: 0o600, flag: "wx" },
  );
  console.log("backend/.env creado con un secreto aleatorio local.");
}
