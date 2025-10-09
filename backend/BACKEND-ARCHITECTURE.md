# Backend Architecture

This backend has been restructured to follow a domain-oriented layout for clarity, scalability, and separation of concerns. All application code now lives under `src/app` instead of mixing feature code at the `src` root.

## High-Level Layout
```
backend/
  src/
    app/
      common/
        middleware/        # Cross-cutting Express middleware (auth, errors, validation, logging hooks)
      domains/
        auth/              # Authentication & session related endpoints
          controller.ts
          routes.ts
        users/             # User profile & account management
          controller.ts
          routes.ts
        rooms/             # Room lifecycle + nested canvas access endpoints
          controller.ts
          routes.ts
        canvas/            # Direct canvas operations (by canvas id)
          controller.ts
          routes.ts
        index.ts           # Aggregates all domain routes -> consumed by server.ts
    config/                # Environment validation, swagger, prisma (kept for now)
    utils/                 # Low-level shared utilities (auth helpers, logger)
    middleware/            # (Legacy) retained temporarily until fully absorbed into app/common
    socket/                # Realtime socket configuration (will later move under domains/realtime)
    server.ts
```

## Domain Principles
- Each domain owns its controller + route wiring.
- Shared validation & auth lives in `common/middleware`.
- Prisma access is performed directly in controllers for now; future iteration can introduce a service layer (e.g. `domains/<name>/service.ts`).
- Swagger doc collection updated to scan `src/app/domains/**/*.ts`.

## Migration Notes
- Former directories `src/controllers` and `src/routes` have been removed; their contents now live in the domain directories.
- The previous wrapper folder that existed outside `src` (`backend/app`) was eliminated to conform to the TypeScript `rootDir`.
- Imports in `server.ts` were updated to reference `./app/...` locations.
- Validators exported from `middleware/validators.ts` are re-exported through `app/common/middleware/index.ts` to provide a single import surface.

## Next Recommended Improvements
1. Introduce path aliases (e.g. `@app/*`, `@domains/*`) via `tsconfig.json` `paths` to reduce long relative imports.
2. Move `socket/` into `app/domains/realtime/` and provide a thin event handler modularization per concern (chat, drawing, webrtc).
3. Add a service layer to encapsulate Prisma queries and centralize transaction logic.
4. Add integration tests per domain (`tests/auth/*.test.ts`, etc.).
5. Relocate environment validation (`config/validateEnv`) and swagger config under `app/common/config` for full consolidation.

## Import Examples
```ts
// From server.ts
import apiRoutes from './app/domains';
import { authenticate } from './app/common/middleware';

// Inside a domain route needing another domain's controller (avoid when possible)
import { updateCanvas } from '../canvas/controller';
```

## Swagger Coverage Adjustment
`swagger.ts` was updated:
```
apis: [
  './src/app/domains/**/*.ts',
  './src/app/common/middleware/*.ts'
]
```
Ensure any new route or controller files remain within these globs to auto-document.

## Transitional Artifacts
- `src/middleware` and `src/utils` still exist. They can be merged later:
  * `utils/logger.ts` -> could move to `app/common/logging` (future infra module)
  * `middleware/*` -> already re-exported; can relocate physically once references updated.

## Quality Check
- TypeScript build passes (`tsc`).
- Prisma client generation unaffected.
- No unresolved import errors after restructuring.

---
Feel free to extend this document as more layers (services, repositories, events) are introduced.
