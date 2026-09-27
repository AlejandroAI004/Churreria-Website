import { test, expect } from "@playwright/test";

test("fallo de categorías ofrece reintento y recupera todos los filtros", async ({
  page,
}) => {
  await page.route("**/api/categories", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "No se pudieron cargar las categorías." }),
    }),
  );
  await page.goto("/productos");
  await expect(page.getByRole("alert")).toContainText(
    "No se pudieron cargar las categorías",
  );
  await page.unroute("**/api/categories");
  await page.getByRole("button", { name: "Volver a intentar" }).click();
  await expect(
    page.getByRole("button", { name: "Bebidas", exact: true }),
  ).toBeVisible();
  await expect(page.locator("app-product-card")).toHaveCount(8);
});

test("perfil rechaza sesión caducada y vuelve a mostrar el formulario", async ({
  page,
}) => {
  await page.goto("/cuenta");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page
    .getByLabel("Correo electrónico")
    .fill("expired-" + Date.now() + "@example.com");
  await page
    .getByLabel("Contraseña", { exact: true })
    .fill("MiClaveDePrueba123!");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(
    page.getByRole("heading", { name: "Tu perfil local" }),
  ).toBeVisible();
  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "La sesión ha caducado." }),
    }),
  );
  await page
    .getByRole("button", { name: "Consultar perfil protegido" })
    .click();
  await expect(page.getByRole("alert")).toContainText("La sesión ha caducado");
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
});

test("sin conexión no confirma ni pierde el carrito, y se recupera", async ({
  page,
}) => {
  await page.goto("/productos");
  await page
    .getByRole("button", { name: "Añadir Churros de siempre", exact: true })
    .click();
  await page.route("**/api/products?*", (route) => route.abort());
  await page.getByRole("link", { name: "Ver carrito" }).click();
  await expect(page.getByRole("alert")).toContainText("No podemos conectar");
  await expect(page.locator(".cart-line")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Confirmar pedido de demostración" }),
  ).toBeDisabled();
  await page.unroute("**/api/products?*");
  await page.getByRole("button", { name: "Actualizar carrito" }).click();
  await expect(
    page.getByRole("button", { name: "Confirmar pedido de demostración" }),
  ).toBeEnabled();
});
