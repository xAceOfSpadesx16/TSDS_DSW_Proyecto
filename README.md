# Thrive Randomizer — Frontend (SPA)

Migración del antiguo frontend estático (HTML + JS vanilla + Tailwind CDN) a una
Single Page Application con **Vite + React 18 + TypeScript estricto**.

## Stack

- **Build/dev**: Vite 5
- **UI**: React 18 + Tailwind 3 (tema equivalente al original preservado en `tailwind.config.js`)
- **Estado**: Zustand 5 (auth + history)
- **Routing**: React Router 7 (BrowserRouter — URLs limpias)
- **Backend**: Laravel 12 (`../TSDS_DSW_Proyecto_Backend`) — autenticación JWT y persistencia del historial

## Scripts

```bash
npm install            # instalar dependencias
npm run dev            # dev server en http://localhost:5173
npm run build          # build de producción (tsc -b + vite build)
npm run preview        # servir dist/ localmente
npm run lint           # tsc -b (type check por proyectos, sin emitir)
npm test               # vitest run: 398 tests (40 archivos)
```

## Variables de entorno

Crear un archivo `.env.local` con:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Por defecto apunta a `http://127.0.0.1:8000/api` (asume backend corriendo vía
`make serve` en `../TSDS_DSW_Proyecto_Backend`).

## Estructura

```
src/
├── components/        # UI reutilizable (Header, NavLinkButton, PrimaryButton, Field, HistoryAside, RootLayout)
├── domain/            # Tipos espejo del backend + interfaz DrawStrategy
├── lib/               # Utilidades puras (mathUtils)
├── pages/             # Una por ruta: LandingPage, DicePage, RoulettePage, TeamsPage, WeightedPage, LoginPage, RegisterPage, NotFoundPage
├── repositories/      # httpClient + AuthRepository + HistoryRepository
├── router.tsx         # createBrowserRouter con todas las rutas
├── store/             # Zustand stores (authStore, historyStore)
├── strategies/        # 5 estrategias que implementan DrawStrategy + factory
├── App.tsx            # (no usado; el entry está en main.tsx)
├── index.css          # Directivas de Tailwind + keyframes/reglas preservadas
├── main.tsx           # Boot: bindAuthStoreToHttpClient() + RouterProvider
└── vite-env.d.ts      # Tipos de import.meta.env
```

## Patrón Strategy

Cada módulo (`dice`, `numbers`, `roulette`, `teams`, `weighted`) tiene su
estrategia en `src/strategies/`. La interfaz `DrawStrategy<TInput, TLocal, TBackend>`
expone:

- `moduleId` — identificador que el backend reconoce.
- `actionLabel(input)` — etiqueta humana para el campo `action` del historial.
- `buildPayload(input)` — payload exacto que `POST /api/history` valida.
- `execute(input)` — produce `{ local, backend }` con el resultado local
  (lo que la UI necesita para renderizar) y el resultado en el contrato del
  backend (lo que se persiste).

Agregar un módulo nuevo = crear la clase + sumarla al mapa de
`src/strategies/index.ts`. Cero impacto en páginas o stores.

## Autenticación

JWT contra el backend. El token se persiste en `localStorage` bajo
`thrive_auth_v1` y se inyecta automáticamente como `Authorization: Bearer <token>`
en cada request a la API (vía `bindAuthStoreToHttpClient()`).

Sin sesión activa, todas las funciones de sorteo siguen operativas; los
resultados se guardan en `localStorage` (`thrive_guest_history_v1`, máximo 100)
y se marcan con "solo local". Al iniciar sesión se ofrece importarlos a la
cuenta, y los próximos sorteos se sincronizan con `POST /api/history`. Si un
guardado falla con sesión activa, la entrada queda pendiente y se persiste por
usuario en `localStorage` (`thrive_pending_<userId>_v1`) para reintentarse al
recuperar la conexión o al recargar la página.

## CORS

El backend (`TSDS_DSW_Proyecto_Backend/config/cors.php`) está configurado para aceptar
`http://localhost:5173` y `http://127.0.0.1:5173`. Si agregás otros orígenes
de desarrollo, sumalos a `allowed_origins` en ese archivo.

## Workflow de desarrollo

1. Backend (en otra terminal o con subshell):
   `(cd ../TSDS_DSW_Proyecto_Backend && make serve)` — corre en `127.0.0.1:8000`.
2. Frontend, desde esta carpeta: `npm run dev` — corre en `127.0.0.1:5173`.
3. Abrir `http://localhost:5173`.

## Verificación

Todos los comandos salvo el primero se ejecutan desde esta carpeta
(`TSDS_DSW_Proyecto/`); el backend va en su propia subshell para no cambiar
de directorio:

```bash
(cd ../TSDS_DSW_Proyecto_Backend && php artisan test)   # backend: 94 tests
npm test                                                # frontend: 398 tests
npm run lint                                            # tsc -b, sin errores
npm run build                                           # tsc -b + vite build
npx playwright test                                     # 48 E2E
```