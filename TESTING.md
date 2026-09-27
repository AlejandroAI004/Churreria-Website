# Verificación realizada

Fecha: 27 de septiembre de 2026. Entorno: Windows, Node.js 24.16.0, npm 11.13.0, Google Chrome instalado.

| Comprobación | Resultado |
| --- | --- |
| Backend — Node test + Supertest | 26 aprobadas, 0 fallidas |
| Frontend — Angular CLI + Vitest | 23 aprobadas, 0 fallidas |
| Integración — Playwright + Chrome | 13 aprobadas, 0 fallidas |
| Total automatizado | **62 aprobadas, 0 fallidas** |
| Compilación Angular de producción | Correcta; sin errores de TypeScript o plantillas |
| Arranque de backend normal (3000) | Correcto; crea/abre SQLite local |
| Arranque de frontend normal (4200) | Correcto; proxy local configurado |
| Revisión de capturas | Inicio de escritorio y catálogo móvil revisados |

## Qué se comprobó

**Carrito:** añadir, acumular, cambiar cantidades, eliminar, vaciar, subtotal/total exactos, límites de 0/99, fracciones, negativos, 50 productos, productos no disponibles, persistencia al recargar, JSON dañado, almacenamiento bloqueado y reconciliación con el catálogo vigente.

**Catálogo:** carga real desde SQLite, detalle, categorías y búsqueda combinadas, acentos, mayúsculas, espacios, resultados vacíos, entradas demasiado largas, categorías no válidas, parámetros repetidos y caracteres de SQL tratados como texto. Errores y reintentos tanto de productos como de categorías, más el estado de carga.

**Autenticación:** registro, normalización de correo, duplicados y registros concurrentes, login correcto/incorrecto, hash scrypt con sal diferente por contraseña, respuestas sin hash, JWT ausente/malformado/falsificado/caducado/con audiencia incorrecta, cuenta eliminada, perfil protegido, cierre de sesión y límite de intentos.

**Pedidos:** invitado sin sesión, cantidades y productos inválidos, precios alterados/desactualizados, producto agotado, cálculo en servidor, persistencia de pedido y líneas, transacción que revierte ante un fallo, confirmación visual, conservación del carrito tras errores y bloqueo de confirmación sin conexión.

**Integración:** Angular → proxy → Express → SQLite, detalle → carrito → recarga → confirmación; la prueba consulta directamente SQLite para comprobar el pedido. Registro/login/perfil completo, navegación móvil, búsqueda y filtros, ausencia de desbordamiento a 390 px y recursos locales en Inicio.

## Reproducir

Desde la raíz, con las dependencias instaladas y Chrome disponible:

```powershell
npm test
npm run build
```

Para pruebas parciales: `npm run test:backend`, `npm run test:frontend` y `npm run test:e2e`.

El servidor de integración usa los puertos 3101/4300 y una base independiente en `.test-data/e2e.sqlite`. No toca la base normal en `backend/data/`. Las cuentas de navegador usan correos de prueba únicos. Los servidores de integración se detienen al terminar.

Los casos de fallo usan respuestas simuladas cuando prueban la recuperación visual; los flujos principales usan Express y SQLite reales. La prueba de rollback provoca deliberadamente el mensaje «Error interno: test rollback» en consola; su resultado es correcto.

## Comprobación adicional del arranque normal

Con frontend y backend arrancados como indica el README:

```powershell
node scripts/smoke.mjs
```

Consulta productos a través del puerto 4200, abre Chrome sin interfaz, añade un producto, comprueba el carrito tras recargar y lo vacía. No genera pedidos ni cuentas en la base de uso normal.

Capturas: `test-results/home-desktop.png` y `test-results/mobile-catalog.png`.
Informe navegable: `npx playwright show-report`.

## Límites de la verificación

Pruebas de navegador ejecutadas en Chrome, en escritorio y viewport móvil. No se hizo una auditoría completa con lectores de pantalla ni se ejecutó en Safari/Firefox o dispositivos físicos. No es una certificación para un despliegue público; es una aplicación local de demostración.

