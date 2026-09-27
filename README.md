# La Churrería

A local demo storefront built with Angular 21 + TypeScript, Express 5 + JavaScript, and SQLite. The catalog is served through a REST API; products, accounts, and demo orders are stored in a local database file.

> **Language notice:** The storefront is currently in **Spanish**. Its navigation, product descriptions, forms, and user-facing messages have not been translated. This README is in English. No real payments or cloud services are used while the app runs.

## Requirements and installation

Install **Node.js 24 LTS** from https://nodejs.org/ (npm is included). This project uses the built-in `node:sqlite` module, so Node.js 24 is required. In a new PowerShell terminal, check the installation:

```powershell
node -v
npm -v
```

From the project root:

```powershell
cd "C:\path\to\churreria"
npm ci
npm --prefix backend ci
npm --prefix frontend ci
npm run setup
```

Replace `C:\path\to\churreria` with the project folder on your computer. The first three commands install dependencies. `npm run setup` creates `backend/.env` from `backend/.env.example` and generates a random local JWT secret. It does not print the secret or overwrite an existing `.env`. Keep `.env` private. If PowerShell blocks `npm.ps1`, use `npm.cmd` instead.

Dependency installation requires internet access. Once installed, the application and tests run locally without cloud services.

## Start the application

Start the backend and frontend in **two separate PowerShell terminals**.

Terminal 1, backend:

```powershell
cd "C:\path\to\churreria\backend"
npm start
```

The API is at **http://127.0.0.1:3000/api/health**. SQLite creates `backend/data/churreria.sqlite` on first startup. The backend listens on the local machine by default.

Terminal 2, Angular frontend:

```powershell
cd "C:\path\to\churreria\frontend"
npm start
```

Open **http://localhost:4200**. Stop each server with **Ctrl+C**.

Alternatively, run `npm run start:backend` and `npm run start:frontend` from the project root, in separate terminals.

Angular forwards `/api` requests to Express through `frontend/proxy.conf.json`. Express allows the development origin configured by `FRONTEND_ORIGIN`. If you change ports, update the environment and proxy settings to match.

## Pages and features

- **Home:** Store introduction, example address and opening hours, and links to the catalog and product categories.
- **Products:** Search by product name or description (case- and accent-insensitive), filter by category, view product details, and check prices and availability. Search applies on submission; category filters apply immediately.
- **Cart:** Add and remove products, change quantities, clear the cart, and view subtotals and the total in cents. Cart contents persist in the same browser and site origin through `localStorage`. The app handles blocked storage and invalid saved data.
- **Demo orders:** Checkout is available without an account. The server verifies prices and availability and saves the order in a transaction. No payment is taken and no real order is prepared or shipped. If the price changes or checkout fails, the cart is preserved.
- **Optional account:** Register and sign in with an email and a 10–128 character password. The JWT stays in memory, expires after one hour, and is cleared when the page is reloaded or closed.
- **Protected feature:** Only viewing the profile requires authentication (`GET /api/me`). Browsing, the cart, and demo checkout are public.

The UI includes loading and error feedback, empty search results, sold-out products, an empty cart, added-to-cart notifications, and order confirmation. It also has mobile navigation, accessible labels and notifications, visible keyboard focus, a skip link, and reduced-motion support.

## Customize the store

Edit `frontend/src/app/store.config.ts` to change the store name, introduction, address, and opening hours. Page titles are in `frontend/src/app/app.routes.ts`; document title and metadata are in `frontend/src/index.html`.

Edit example products in `backend/src/catalog.js`. Seed products are added **only if the products table is empty**; changing the seed file does not overwrite an existing catalog. To keep the existing database, stop the backend and point `DB_PATH` in `.env` to a different file. There is no administration dashboard.

## Project structure

```text
churreria/
  backend/
    .env.example
    src/
      server.js       Starts the API and reads environment variables
      app.js          REST API, validation, JWT, and demo orders
      db.js           SQLite schema and initial seed data
      catalog.js      Example products and categories
      password.js     scrypt password hashing with random salts
    test/api.test.js  Backend API and authentication tests
    data/             Local database, created at startup
  frontend/
    src/app/
      store.config.ts Store name, description, address, and hours
      app.*           App shell and navigation
      home.ts         Home page
      catalog.ts      Catalog and filters
      detail.ts       Product details
      cart.logic.ts   Pure cart operations
      cart.service.ts Cart state and browser storage
      cart-page.ts    Cart and demo order confirmation
      account.ts      Sign-in forms and profile
      api.service.ts  HTTP requests
      auth.service.ts In-memory session
      *.spec.ts       Angular/Vitest tests
    src/styles.css    Responsive design
    public/art/       Local, editable SVG illustrations
    proxy.conf.json   Development API proxy
    proxy.e2e.json    Integration-test API proxy
  scripts/             Setup and smoke-check scripts
  e2e/                 Playwright end-to-end tests
  playwright.config.ts
  TESTING.md           Test results and coverage
```

## REST API

All responses use JSON. Errors have the form `{ "error": "Clear message" }`.

| Method and route | Purpose | Authentication |
| --- | --- | --- |
| `GET /api/health` | Check the API and SQLite | No |
| `GET /api/categories` | List product categories | No |
| `GET /api/products?q=&category=` | Search and filter products | No |
| `GET /api/products/:id` | Get product details | No |
| `POST /api/auth/register` | Create an account; returns user and JWT | No |
| `POST /api/auth/login` | Sign in | No |
| `GET /api/me` | Get the signed-in profile | Bearer JWT |
| `POST /api/orders` | Place a demo order | No |

Registration and login body:

```json
{ "email": "neighbor@example.com", "password": "LocalPassword123!" }
```

Demo order body:

```json
{ "items": [{ "productId": 1, "quantity": 2, "expectedPriceCents": 350 }] }
```

The server requires 1–50 unique product lines, integer quantities from 1 to 99, and current prices. It calculates the total from SQLite instead of trusting a total from the client. Database queries use parameters.

Passwords are hashed asynchronously with scrypt and a random 16-byte salt (N=32768, r=8, p=3). JWTs use HS256 with a verified issuer and audience. Authentication is limited to 30 requests per IP every 15 minutes. JSON request size is limited, Helmet sets security headers, and password hashes are never returned.

## Run tests and build

With Google Chrome installed, run these commands from the project root:

```powershell
npm test
npm run build
```

Run individual test suites:

```powershell
npm run test:backend
npm run test:frontend
npm run test:e2e
```

Backend tests use Node's test runner, Supertest, and temporary SQLite databases. Frontend unit tests use Angular CLI and Vitest. Integration tests use Playwright and headless Chrome with Angular on port **4300**, Express on **3101**, and a separate SQLite database at `.test-data/e2e.sqlite`. The test servers start and stop automatically; keep those ports free. `npm run build` writes the production build to `frontend/dist/frontend/browser`.

If Chrome is unavailable but Edge is installed, set `$env:PLAYWRIGHT_CHANNEL='msedge'` in PowerShell before running `npm run test:e2e`. See [TESTING.md](TESTING.md) for verified results and test coverage. Run `npx playwright show-report` to open the browser-test report.

To check the standard local ports, API proxy, catalog, and cart persistence in Chrome, start both app servers and run `node scripts/smoke.mjs`.

## Demo limitations

This local demo has no real payments, email verification, password recovery, stock management, administration dashboard, or online deployment. Account email addresses do not need to be real. Inventory is not decremented after checkout; the server only checks the availability flag. Orders are stored locally but are not listed in the UI. Use test data.

The login session is temporary; the cart persists in the browser. Store details and product descriptions are examples. SQLite's synchronous API suits this small local experiment, not a high-traffic production service.
