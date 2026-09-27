import { test, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

test("inicio, catálogo desde API/SQLite, detalle, carrito persistente y pedido invitado", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "sin prisa",
  );
  await expect(page.getByText("Calle de la Canela, 12")).toBeVisible();
  const productsResponse = page.waitForResponse(
    (r) => r.url().includes("/api/products") && r.status() === 200,
  );
  await page.getByRole("link", { name: "Descubre nuestro menú" }).click();
  const products = await (await productsResponse).json();
  expect(products).toHaveLength(8);
  await expect(page.locator("app-product-card")).toHaveCount(8);
  await page
    .getByRole("link", { name: "Churros de siempre", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Churros de siempre" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Añadir al carrito", exact: true })
    .click();
  await expect(
    page.getByText("Churros de siempre añadido al carrito."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ver carrito" }).click();
  await page
    .getByRole("button", { name: "Aumentar Churros de siempre" })
    .click();
  await expect(page.locator(".line-subtotal")).toContainText("7,00");
  await page.reload();
  await expect(page.locator(".quantity span")).toHaveText("2");
  await page
    .getByRole("button", { name: "Reducir Churros de siempre" })
    .click();
  await expect(page.locator(".line-subtotal")).toContainText("3,50");
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/orders") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Confirmar pedido de demostración" })
    .click();
  const order = await (await response).json();
  await expect(
    page.getByRole("heading", { name: "¡Pedido de demostración confirmado!" }),
  ).toBeVisible();
  await expect(page.locator(".count")).toHaveText("0");
  expect(order.totalCents).toBe(350);
  const db = new DatabaseSync(
    fileURLToPath(new URL("../.test-data/e2e.sqlite", import.meta.url)),
  );
  try {
    expect(
      db.prepare("SELECT totalCents FROM orders WHERE id = ?").get(order.id)?.[
        "totalCents"
      ],
    ).toBe(350);
    expect(
      db
        .prepare("SELECT quantity FROM order_items WHERE orderId = ?")
        .get(order.id)?.["quantity"],
    ).toBe(1);
  } finally {
    db.close();
  }
  expect(errors).toEqual([]);
});

test("búsqueda, categorías combinadas, sin resultados y restablecer catálogo", async ({
  page,
}) => {
  await page.goto("/productos");
  await expect(page.locator("app-product-card")).toHaveCount(8);
  await page.getByRole("button", { name: "Bebidas", exact: true }).click();
  await expect(page.locator("app-product-card")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Buscar productos" }).fill("CAFE");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.locator("app-product-card")).toHaveCount(1);
  await expect(page.locator("app-product-card h3")).toHaveText(
    "Café con leche",
  );
  await page.getByRole("button", { name: "Rellenos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No encontramos ese antojo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ver todos los productos" }).click();
  await expect(page.locator("app-product-card")).toHaveCount(8);
  await expect(
    page.getByRole("button", {
      name: "Añadir Rellenos de temporada",
      exact: true,
    }),
  ).toBeDisabled();
});

test("carrito vacío, eliminación, cantidad cero y vaciar", async ({ page }) => {
  await page.goto("/carrito");
  await expect(
    page.getByRole("heading", { name: "Tu carrito espera algo rico" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explorar productos" }).click();
  await page
    .getByRole("button", { name: "Añadir Churros de siempre", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Añadir Café con leche", exact: true })
    .click();
  await page.getByRole("link", { name: "Ver carrito" }).click();
  await page
    .getByRole("button", { name: "Eliminar Café con leche", exact: true })
    .click();
  await expect(page.locator(".cart-line")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Reducir Churros de siempre" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tu carrito espera algo rico" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Explorar productos" }).click();
  await page
    .getByRole("button", { name: "Añadir Churros de siempre", exact: true })
    .click();
  await page.getByRole("link", { name: "Ver carrito" }).click();
  await page.getByRole("button", { name: "Vaciar carrito" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tu carrito espera algo rico" }),
  ).toBeVisible();
});

test("registro local, perfil protegido, cerrar sesión y login inválido/válido", async ({
  page,
}) => {
  const email = "browser-" + Date.now() + "@example.com";
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("short");
  await expect(
    page.getByRole("button", { name: "Crear mi cuenta" }),
  ).toBeDisabled();
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("MiClaveDePrueba123!");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu perfil local" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Consultar perfil protegido" })
    .click();
  await expect(
    page.getByText("Perfil consultado con una sesión válida."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("ClaveIncorrecta123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Correo o contraseña incorrectos",
  );
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("MiClaveDePrueba123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tu perfil local" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Entrar", exact: true }),
  ).toBeVisible();
});

test("error de catálogo permite reintentar y el detalle inexistente es claro", async ({
  page,
}) => {
  await page.route("**/api/products?*", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Tienda temporalmente desconectada." }),
    }),
  );
  await page.goto("/productos");
  await expect(page.getByRole("alert")).toContainText(
    "Tienda temporalmente desconectada",
  );
  await page.unroute("**/api/products?*");
  await page.getByRole("button", { name: "Volver a intentar" }).click();
  await expect(page.locator("app-product-card")).toHaveCount(8);
  await page.goto("/productos/99999");
  await expect(page.getByRole("alert")).toContainText("Producto no encontrado");
});

test("pedido fallido conserva carrito y exige actualizar antes de reintentar", async ({
  page,
}) => {
  await page.goto("/productos");
  await page
    .getByRole("button", { name: "Añadir Churros de siempre", exact: true })
    .click();
  await page.getByRole("link", { name: "Ver carrito" }).click();
  await page.route("**/api/orders", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: "Ha cambiado un precio." }),
    }),
  );
  await page
    .getByRole("button", { name: "Confirmar pedido de demostración" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Ha cambiado un precio");
  await expect(page.locator(".cart-line")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Confirmar pedido de demostración" }),
  ).toBeDisabled();
  await page.unroute("**/api/orders");
  await page.getByRole("button", { name: "Actualizar carrito" }).click();
  await page
    .getByRole("button", { name: "Confirmar pedido de demostración" })
    .click();
  await expect(
    page.getByRole("heading", { name: "¡Pedido de demostración confirmado!" }),
  ).toBeVisible();
});

test("carga visible, enlaces por categoría, navegación móvil y sin desbordamiento", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("navigation")).not.toBeVisible();
  await page.getByRole("button", { name: "Menú" }).click();
  await expect(page.getByRole("navigation")).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Productos", exact: true })
    .click();
  await expect(page.getByRole("navigation")).not.toBeVisible();
  await expect(page.locator("app-product-card")).toHaveCount(8);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await page.getByRole("link", { name: "La pareja perfecta" }).click();
  await expect(page.locator("app-product-card")).toHaveCount(2);
  await page.screenshot({
    path: "test-results/mobile-catalog.png",
    fullPage: true,
  });
});

test("catálogo muestra estado de carga mientras espera al servidor", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/products?*", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/productos");
  await expect(page.getByRole("status")).toHaveText("Preparando el mostrador…");
  release();
  await expect(page.locator("app-product-card")).toHaveCount(8);
});

test("reconcilia precio y agotado de SQLite antes de confirmar", async ({
  page,
}) => {
  await page.goto("/productos");
  await page
    .getByRole("button", { name: "Añadir Churros de siempre", exact: true })
    .click();
  const db = new DatabaseSync(
    fileURLToPath(new URL("../.test-data/e2e.sqlite", import.meta.url)),
  );
  try {
    db.prepare(
      "UPDATE products SET priceCents=400,available=0 WHERE id=1",
    ).run();
    await page.getByRole("link", { name: "Ver carrito" }).click();
    await expect(page.locator(".line-subtotal")).toContainText("4,00");
    await expect(
      page.getByText("Ya no está disponible. Elimínalo para continuar."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Confirmar pedido de demostración" }),
    ).toBeDisabled();
  } finally {
    db.prepare(
      "UPDATE products SET priceCents=350,available=1 WHERE id=1",
    ).run();
    db.close();
  }
});

test("captura de escritorio y recursos completamente locales", async ({
  page,
}) => {
  const external: string[] = [];
  page.on("request", (request) => {
    if (!new URL(request.url()).hostname.match(/^(localhost|127\.0\.0\.1)$/))
      external.push(request.url());
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  expect(external).toEqual([]);
});
