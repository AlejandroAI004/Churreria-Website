import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const baseURL = process.env.SMOKE_URL || 'http://localhost:4200';
const response = await fetch(baseURL + '/api/products');
assert.equal(response.status, 200);
const products = await response.json();
assert.ok(products.length > 0);
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
try {
  const page = await browser.newPage();
  await page.goto(baseURL + '/productos');
  const available = products.find(product => product.available);
  assert.ok(available, 'Debe haber al menos un producto disponible');
  await page.getByRole('button', { name: 'Añadir ' + available.name, exact: true }).click();
  await page.getByRole('link', { name: 'Ver carrito' }).click();
  await page.locator('.cart-line').waitFor();
  assert.equal(await page.locator('.quantity span').innerText(), '1');
  await page.reload();
  await page.locator('.cart-line').waitFor();
  assert.equal(await page.locator('.quantity span').innerText(), '1');
  await page.getByRole('button', { name: 'Vaciar carrito' }).click();
  await page.getByRole('heading', { name: 'Tu carrito espera algo rico' }).waitFor();
  console.log('OK: frontend 4200, proxy, API 3000, ' + products.length + ' productos de SQLite, añadir y persistir carrito.');
} finally {
  await browser.close();
}

