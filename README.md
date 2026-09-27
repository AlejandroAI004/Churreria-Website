# La Churrería

Tienda local de demostración con Angular 21 + TypeScript, Express 5 + JavaScript y SQLite. El catálogo se obtiene por API REST; productos, cuentas y pedidos se guardan en un archivo local. Sin pagos, servicios de nube, fuentes remotas ni imágenes externas.

## Requisitos e instalación

Instala **Node.js 24 LTS** desde https://nodejs.org/ (incluye npm). Este proyecto usa `node:sqlite`, por lo que se recomienda específicamente la versión 24. Comprueba en una terminal nueva:

```powershell
node -v
npm -v
```

Desde PowerShell:

```powershell
cd "C:\Users\aleja\OneDrive\Desktop\VS\Projects\churreria"
npm ci
npm --prefix backend ci
npm --prefix frontend ci
npm run setup
```

`npm run setup` copia `backend/.env.example` a `backend/.env` y genera un secreto JWT aleatorio. No muestra el secreto, y conserva un `.env` existente. Si prefieres copiarlo manualmente, usa `Copy-Item backend/.env.example backend/.env` y completa `JWT_SECRET` con un valor aleatorio de al menos 32 caracteres. El backend rechaza secretos vacíos o demasiado cortos. No publiques `.env`.

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd` en los mismos comandos; no necesitas cambiar la política de ejecución del sistema.

Las instalaciones requieren internet. Después, la aplicación y las pruebas funcionan sin servicios externos.

## Arranque (dos terminales)

Terminal 1, backend:

```powershell
cd "C:\Users\aleja\OneDrive\Desktop\VS\Projects\churreria\backend"
npm start
```

API: **http://127.0.0.1:3000/api/health**. SQLite se crea automáticamente en `backend/data/churreria.sqlite`. El backend escucha únicamente en la interfaz local por defecto.

Terminal 2, frontend:

```powershell
cd "C:\Users\aleja\OneDrive\Desktop\VS\Projects\churreria\frontend"
npm start
```

Abre **http://localhost:4200**. Detén cada servidor con **Ctrl+C**.

Alternativa desde la raíz: `npm run start:backend` y `npm run start:frontend`, en terminales separadas.

Angular envía `/api` a Express usando `frontend/proxy.conf.json`. Express también permite el origen configurado en `FRONTEND_ORIGIN` para desarrollo. Si cambias los puertos, actualiza `.env`, el proxy y el comando de arranque. El puerto del frontend se fija en su `package.json`.

## Páginas y comportamiento

- **Inicio**: presentación, dirección y horarios de ejemplo, enlaces al catálogo y a sus categorías.
- **Productos**: búsqueda por nombre/descripción (ignora tildes y mayúsculas), categorías combinables, detalle, precios en euros y disponibilidad. El botón Buscar o Enter aplica el texto; las categorías se aplican inmediatamente.
- **Carrito**: añadir, aumentar/reducir (0 elimina; máximo 99), eliminar, vaciar, subtotales y total en céntimos. Persistencia en `localStorage` del mismo navegador y origen. Maneja almacenamiento bloqueado o datos corruptos.
- **Pedido de demostración**: disponible sin cuenta; valida precios y disponibilidad en el servidor y guarda pedido y líneas en una transacción. No hay cobro, envío ni preparación real. Si cambió un precio o hay un error, conserva el carrito y permite actualizarlo.
- **Cuenta opcional**: registro e inicio de sesión con correo y contraseña (10–128 caracteres). El JWT se mantiene solo en memoria, expira a la hora y se pierde al recargar/cerrar la página.
- **Única función protegida**: consultar el perfil con el botón «Consultar perfil protegido» (`GET /api/me`). Catálogo, carrito y pedido son públicos.

Estados de carga, conexión fallida, búsquedas vacías, productos agotados, carrito vacío, producto añadido, error de autenticación y pedido confirmado. Navegación móvil, etiquetas, foco visible, enlace de salto, avisos accesibles y movimiento reducido.

## Personalización y estructura

```text
churreria/
  backend/
    .env.example
    src/
      server.js       Arranque y variables de entorno
      app.js          API REST, validación, JWT y pedidos
      db.js           Tablas SQLite y carga inicial
      catalog.js      Categorías y productos de ejemplo
      password.js     Hash scrypt con sal aleatoria
    test/api.test.js
    data/             Base local, creada al arrancar
  frontend/
    src/app/
      store.config.ts Nombre, descripción, dirección y horarios
      app.*           Navegación y estructura
      home.ts         Inicio
      catalog.ts      Catálogo y filtros
      detail.ts       Detalle
      cart.logic.ts   Operaciones puras del carrito
      cart.service.ts Estado y almacenamiento
      cart-page.ts    Carrito y confirmación
      account.ts      Formularios de acceso y perfil
      api.service.ts  Comunicación HTTP
      auth.service.ts Sesión en memoria
      *.spec.ts       Pruebas Angular/Vitest
    src/styles.css    Diseño adaptable
    public/art/       Ilustraciones SVG locales y editables
    proxy.conf.json   API local para desarrollo
    proxy.e2e.json    API aislada para integración
  scripts/setup.mjs
  e2e/                Flujos Playwright y servidor de prueba
  playwright.config.ts
  TESTING.md
```

Cambia los datos de la tienda en `frontend/src/app/store.config.ts`. Los títulos del navegador se personalizan en `app.routes.ts` y `src/index.html`.

Edita los productos iniciales en `backend/src/catalog.js`. Solo se insertan si **la tabla de productos está vacía**; modificar ese archivo no sustituye un catálogo existente. Para empezar otra base sin perder datos, detén el backend y cambia `DB_PATH` en `.env` a otro archivo, por ejemplo `./data/otra-tienda.sqlite`. No hay panel de administración.

## API REST

Todas las respuestas son JSON. Los errores usan `{ "error": "Mensaje claro" }`.

| Método y ruta                  | Uso                                         | Autenticación |
| ------------------------------ | ------------------------------------------- | ------------- |
| GET /api/health                | Estado y comprobación de SQLite             | No            |
| GET /api/categories            | Categorías del catálogo                     | No            |
| GET /api/products?q=&category= | Búsqueda y filtros                          | No            |
| GET /api/products/:id          | Detalle                                     | No            |
| POST /api/auth/register        | Correo y contraseña; devuelve usuario y JWT | No            |
| POST /api/auth/login           | Inicia sesión                               | No            |
| GET /api/me                    | Perfil sin contraseñas ni hash              | Bearer JWT    |
| POST /api/orders               | Confirma pedido de demostración             | No            |

Registro/login: `{ "email": "vecino@example.com", "password": "UnaClaveLocal123!" }`.

Pedido: `{ "items": [{ "productId": 1, "quantity": 2, "expectedPriceCents": 350 }] }`.
El servidor exige productos únicos, de 1 a 50 líneas, cantidades enteras entre 1 y 99 y precios vigentes. Calcula su propio total usando SQLite; no acepta un total del cliente. Las consultas usan parámetros.

Las contraseñas usan scrypt asíncrono con sal aleatoria de 16 bytes (N=32768, r=8, p=3). JWT usa HS256, emisor y audiencia verificados. Hay límite de 30 solicitudes de autenticación por IP cada 15 minutos, límite de JSON y cabeceras Helmet. No se devuelve el hash.

## Pruebas y compilación

Con Google Chrome instalado:

```powershell
npm test
npm run build
```

Por separado:

```powershell
npm run test:backend
npm run test:frontend
npm run test:e2e
```

- Backend: runner de Node + Supertest y bases SQLite temporales.
- Frontend: Angular CLI + Vitest y pruebas de lógica/servicios HTTP.
- Integración: Playwright con Chrome sin interfaz, Angular en **4300**, Express en **3101** y SQLite independiente en `.test-data/e2e.sqlite`. Ambos servidores de pruebas se arrancan/detienen automáticamente. Deja libres esos puertos.
- `npm run build` compila a `frontend/dist/frontend/browser`; el uso local documentado es con `npm start`.
- Informe de navegador: `npx playwright show-report`; capturas en `test-results/`.

Si no tienes Chrome, puedes usar Edge instalado con `$env:PLAYWRIGHT_CHANNEL='msedge'` antes de ejecutar las pruebas (en PowerShell). También puedes instalar Chrome una sola vez. No se descarga un navegador durante las pruebas.

Lee `TESTING.md` para el resultado y alcance de la verificación.

## Alcance de este experimento

Sin pagos reales, correo de verificación, recuperación de contraseñas, gestión de inventario, administración ni despliegue público. Las cuentas no requieren correos reales. No se descuentan existencias al confirmar; solo se comprueba el indicador de disponibilidad. Los pedidos se guardan localmente pero no hay historial en la interfaz. Usa datos de prueba.

La sesión es temporal por diseño; el carrito sí persiste. Los SVG son ilustraciones, y los datos de dirección, horarios y productos son ejemplos. SQLite síncrono es adecuado para este experimento pequeño. La carpeta está dentro de OneDrive por la ubicación elegida en tu equipo: la aplicación no usa su API, pero el cliente de OneDrive podría sincronizarla si lo tienes activado. Para que los archivos permanezcan exclusivamente en la laptop, mueve el proyecto a una carpeta que no se sincronice.

Referencias técnicas: [compatibilidad Angular](https://angular.dev/reference/versions), [pruebas de Angular](https://angular.dev/guide/testing), [SQLite de Node.js](https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html).
