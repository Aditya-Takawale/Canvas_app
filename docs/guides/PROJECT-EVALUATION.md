# Canvas App – Comprehensive Project Evaluation & Technical Documentation

> Version: 1.0  
> Date: 2025-10-08  
> Status: Feature Complete / Evaluation Ready

---
## 1. Executive Summary
A full‑stack, real‑time collaborative drawing platform supporting multi‑user presence, live cursor visualization, simulated multi‑user mode, secure private/public rooms, persistent canvas state, and performance‑optimized delivery. Built with a modular TypeScript codebase (frontend + backend) emphasizing scalability, security, and developer ergonomics.

---
## 2. High‑Level Goals
| Goal | Description | Outcome |
|------|-------------|---------|
| Real‑time Collaboration | Multiple users draw simultaneously with low latency | Achieved via Socket.io events + optimistic UI |
| Presence & Identity | Show who is active Aand where | Multi-user & cursor overlay systems with attribution |
| Persistence | Save / restore canvases, history replay base | Prisma models + state / operations storage |
| Security & Access Control | Auth, JWT, private rooms, CORS, env validation | Implemented (JWT auth, bcrypt, env validator, room password) |
| Performance | Fast initial load and responsive drawing | Code splitting, batching, debounced saves, lazy Fabric load |
| Observability | Structured logging & diagnostics | Winston logs, frontend logger, performance monitor |
| Deployability | Straightforward multi‑platform deploy | Vercel (frontend) + Railway (backend) + scripts |

---
## 3. System Architecture Overview
```
Browser (React + Fabric.js + Redux + Socket.io-client)
   |  REST (HTTPS) + WebSocket (WS/WSS)
Backend (Express + Socket.io + Prisma + Winston)
   |  DB Driver (Prisma Client)
Database (SQLite dev / PostgreSQL prod)
```
**Key Patterns**
- Hexagonal tendencies: routes → controllers → services → Prisma.
- Socket layer isolated (`backend/src/socket`) for events & validation.
- Shared TypeScript types across layers to reduce mismatch.
- Deployment config artifacts: `vercel.json`, `railway.json`, start scripts.

---
## 4. Technology Choices & Rationale
| Layer | Technology | Why Chosen | Notable Alternatives | Trade‑offs |
|-------|-----------|-----------|----------------------|------------|
| Frontend Framework | React 18 + TS | Ecosystem maturity, hooks, Suspense, DX | Vue 3, SvelteKit, Solid | Larger bundle than minimalist alternatives |
| State Management | Redux Toolkit | Standardized patterns, Immer safety, devtools | Zustand, Recoil, Jotai | Slight boilerplate overhead |
| Canvas Engine | Fabric.js | Object model, serialization, annotations | Konva, Rough.js, raw Canvas | Fabric heavier than lower-level APIs |
| Real-time | Socket.io | Auto reconnection, rooms, event semantics | Native WS, Colyseus, Liveblocks | Slight protocol overhead |
| Styling | Tailwind CSS | Utility speed, consistency, purge optimization | CSS Modules, Styled Components | Learning curve if unfamiliar |
| Backend Runtime | Node.js (Express) | Ubiquity, composability, middleware ecosystem | Fastify, NestJS, Deno | Express less opinionated (needs structure) |
| ORM | Prisma | Type-safe queries, migrations, DB portability | TypeORM, Drizzle, Sequelize | Prisma client bundle size, query abstraction |
| Auth | JWT + bcrypt | Stateless scaling, standard | Sessions (Redis), Paseto, OAuth2 providers | JWT revocation complexity |
| Logging | Winston + daily rotate | Multi transport, JSON logs | Pino, Bunyan | Slightly slower than Pino |
| Build Tool (frontend) | CRA + CRACO optimizations | Rapid bootstrap w/ custom Webpack config | Vite, Next.js | Build speed slower than Vite |
| Performance Monitoring | Custom overlay + Web APIs | Minimal vendor lock-in | Sentry Performance, NewRelic | Manual instrumentation scope |
| Deployment | Vercel + Railway | Separation of FE/BE scaling, fast CI | Docker + ECS, Fly.io, Render | Two platform configs to manage |

---
## 5. Data Model (Prisma)
Simplified schema (excluding some fields for brevity):
```prisma
model User { id Int @id @default(autoincrement()) username String @unique email String @unique password String role String @default("user") createdAt DateTime @default(now()) updatedAt DateTime @updatedAt canvases Canvas[] roomConnections RoomConnection[] rooms Room[] }
model Room { id Int @id @default(autoincrement()) name String description String? isPrivate Boolean @default(false) joinCode String? @unique password String? createdAt DateTime @default(now()) updatedAt DateTime @updatedAt creatorId Int canvas Canvas? connections RoomConnection[] creator User @relation(fields: [creatorId], references: [id], onDelete: Cascade) }
model Canvas { id Int @id @default(autoincrement()) name String? width Int @default(800) height Int @default(600) state String? createdAt DateTime @default(now()) updatedAt DateTime @updatedAt roomId Int @unique creatorId Int creator User @relation(fields: [creatorId], references: [id]) room Room @relation(fields: [roomId], references: [id], onDelete: Cascade) operations DrawingOperation[] }
model DrawingOperation { id Int @id @default(autoincrement()) objectType String objectData String action String createdAt DateTime @default(now()) canvasId Int userId Int canvas Canvas @relation(fields: [canvasId], references: [id], onDelete: Cascade) }
model RoomConnection { id Int @id @default(autoincrement()) userId Int roomId Int joinedAt DateTime @default(now()) leftAt DateTime? isActive Boolean @default(true) ipAddress String? userAgent String? room Room @relation(fields: [roomId], references: [id], onDelete: Cascade) user User @relation(fields: [userId], references: [id], onDelete: Cascade) }
```
**Rationale:**
- Separate `DrawingOperation` enables append‑only operation history + future replay/compression.
- `RoomConnection` provides audit + analytics potential (session length, active users).
- `Canvas.state` stores snapshot JSON → supports time‑to‑interact faster than rebuilding from every op.

**Potential Future Enhancements**
- Add `revision` on Canvas for optimistic concurrency.
- Partition operations into time buckets for archival.
- Introduce soft deletes (boolean flag) instead of cascade for compliance.

---
## 6. Real‑Time Event Contract
| Event | Direction | Payload (simplified) | Purpose |
|-------|-----------|----------------------|---------|
| `join_room` | client→server | { roomId, token } | Authenticate & enter a room |
| `user_joined` | server→clients | { userId, username, color } | Presence broadcast |
| `user_left` | server→clients | { userId } | Presence removal |
| `cursor_move` | client→server | { x, y } | Live cursor updates |
| `user_color_update` | client↔server | { userId, color } | Synchronize user color/palette |
| `drawing_event` | client↔server | { op } | Standardized drawing operation pathway |
| `INSTANT_DRAWING` | server→clients | { path/object } | Ultra low-latency path echo (fast preview) |
| `chat:message` | bidirectional | { text, roomId, user } | Text communication |

**Design Notes**
- Split between buffered (`drawing_event`) vs immediate (`INSTANT_DRAWING`) for perceptual smoothness.
- Removed legacy `updateCursor` to reduce duplication & confusion.
- `user_color_update` ensures consistent visual identity across sessions.

**Alternatives Considered**
- CRDT frameworks (Automerge, Yjs) – heavier; deferred until conflict complexity rises.
- WebRTC data channels – not adopted; Socket.io suffices and simplifies infra.

---
## 7. Core Frontend Architecture
| Concept | Implementation | Reason |
|---------|---------------|--------|
| Canvas Abstraction | Fabric.js wrapper components (`MultiUserFigmaCanvas`, `CursorsOnlyFigmaCanvas`) | Separation of simulation vs pure cursor mode |
| State Synchronization | Redux slices + batched operation dispatcher | Central audit & time‑travel potential |
| Operation Batching | Micro‑buffer + timeout flush (80ms) | Reduces Redux churn & websocket pressure |
| Save Strategy | Debounced snapshot + final flush on unload/unmount | Minimizes DB writes while preserving durability |
| Cursor Layer | DOM overlay + hashed color assignment | Avoids fabric re-render overhead for cursors |
| Responsive Sizing | ResizeObserver adjusting canvas dimensions | Reduces layout thrash / fixed dimension artifacts |
| Performance Monitoring | Custom `PerformanceMonitor` + metrics console | Low overhead vs external SaaS |

---
## 8. Backend Architecture
| Layer | Pattern / Tool | Detail |
|-------|----------------|--------|
| Validation | Environment validator & controller guards | Early fail-fast, secure defaults |
| Auth | JWT (HS256) + bcrypt hashing | Stateless scaling & simple revocation model (token rotation possible) |
| Logging | Winston multi-transport (combined/access/error) | Structured logs per category for rotation |
| Error Handling | Central middleware (`errorHandler`) | Consistent JSON responses + status mapping |
| Security Headers | Helmet CSP + referrer & permissions policies | Mitigates XSS / injection vectors |
| CORS | Dynamic origin callback parse list | Prevents multiple-origin header bug |
| Socket Security | Token decode + color validation regex | Sanitizes identity metadata |
| Persistence | Prisma repository pattern (implicit through service layer) | Maintain type integrity |

---
## 9. Performance Engineering
| Optimization | Technique | Impact |
|--------------|----------|--------|
| Bundle Size | Code splitting (lazy routes + chunk isolation) | ~60% reduction main bundle |
| Canvas Ops | Micro-batching Redux ops | Fewer renders & dispatch storms |
| Network | Instant path echo channel | Perceived latency reduction |
| CPU | Debounced tool application + selective re-renders | Smoother interaction |
| Caching | Service worker (static + network-first API) | Faster repeat loads / offline resilience |
| Logging Overhead | Dev gating verbose socket logs | Prevents prod performance tax |
| Save Frequency | Debounced writes + unload flush | DB/IO conservation |

---
## 10. Security & Hardening
| Control | Implementation | Risk Mitigated |
|---------|---------------|----------------|
| Env Validation | `validateEnv()` exits on missing/weak prod secrets | Misconfig / secret leakage |
| JWT Secret Enforcement | Production check rejects fallback | Token forgery |
| Password Hashing | bcrypt with salt | Credential theft risk |
| Room Privacy | Password + joinCode model | Unauthorized room entry |
| CORS Whitelist | Dynamic single-origin response | Origin spoofing / browser block |
| CSP | Strict directives (connect/img/style/script) | XSS / injection |
| Input Validation | Express-validator (extendable) | Malformed payloads |
| Logging Segregation | Separate error/auth/access logs | Incident forensics |
| Color Validation | Regex to restrict injection in user-specified color | Style / DOM injection |

**Deferred / Future**
- Rate limiting (e.g., express-rate-limit) for brute force.
- Web Application Firewall integration.
- Token blacklist / refresh cycle.

---
## 11. Developer Tooling & DX
| Feature | Description |
|---------|------------|
| One-command Startup | `start-app.ps1` orchestrates build + parallel servers with logs |
| Health Check Script | `backend/scripts/health-check.ts` + `npm run health` |
| Deployment Scripts | Validation scripts ensure config completeness |
| Logging Utilities | Frontend logger normalizes levels (debug/info/warn/error) |
| Snapshot Commits | Safety snapshot before refactors for rollback |
| Documentation Set | Focused guides (startup, deployment, performance, multi-user) |

---
## 12. Deployment Overview
| Aspect | Frontend | Backend |
|--------|----------|---------|
| Platform | Vercel | Railway (or Render compatible) |
| Env Templates | `frontend/.env.production.example` | `backend/.env.production.example` |
| Domain Config | CORS origins include production host(s) | Provide FE base URL |
| Build | CRA build → static export | tsc + prisma migrate deploy |
| Scaling | Edge caching static assets | Stateless API + DB vertical/horizontal scaling |

**Environment Variables (Backend Core)**
```
NODE_ENV, PORT, DATABASE_URL, JWT_SECRET, CORS_ORIGIN, MAX_BODY_SIZE, JWT_EXPIRES_IN
```
**Frontend Important Env**
```
REACT_APP_API_BASE, REACT_APP_SOCKET_URL, REACT_APP_ENV_NAME
```

---
## 13. Testing & Quality
| Domain | Current Coverage | Notes |
|--------|------------------|-------|
| Unit Tests | Minimal / foundations laid | Future: slice reducers, utils |
| Integration | Manual + socket handshake flows | Add supertest suites for auth/rooms |
| Performance | Manual metrics + overlay | Automate via Lighthouse CI optional |
| Security | Config enforcement + bcrypt | Add rate limit & dependency audit in CI |

**Suggested Additions**
- Storybook or visual regression for UI.
- Jest + Testing Library for component behavior (cursor overlay, batching logic).

---
## 14. Trade‑offs & Alternatives
| Decision | Accepted Trade‑off | Alternative (Pros / Cons) |
|----------|--------------------|---------------------------|
| Socket.io over CRDT | Simpler but potential conflict risk under latency | Yjs (conflict-free but heavier integration) |
| Prisma Snapshots + Ops | Dual storage but simpler queries | Event sourcing only (harder replay grooming) |
| Redux Global Ops | Central state ease vs memory growth | Local component state + WS diff (lighter memory, harder replay) |
| Fabric.js | Rich features vs bundle size | Konva (lighter, less built-in serialization) |
| CRA + CRACO | Familiar but slower builds | Vite (faster HMR, smaller config) |

---
## 15. Known Limitations
- No server-side rate limiting or brute force protection yet.
- Operation history not yet compacted / pruned (potential DB size growth).
- Undo/redo stack not implemented (foundation via operation log exists).
- No conflict resolution for simultaneous object edits (last-writer wins only).
- Limited test automation.

---
## 16. Roadmap / Future Enhancements
| Priority | Feature | Benefit |
|---------|---------|---------|
| High | Undo/Redo with operation diff | Usability & recovery |
| High | Rate limiting / login hardening | Security |
| Medium | CRDT layer or lock protocol | Conflict resilience |
| Medium | Operation compression & archiving | Storage & performance |
| Medium | Presence enhancements (idle/typing) | UX richness |
| Low | Replay / time travel UI | Analytics, demos |
| Low | AI assisted drawing agents | Innovation & showcase |

---
## 17. Risk Assessment
| Risk | Impact | Probability | Mitigation |
|------|--------|------------|-----------|
| Large Canvas Growth | Memory & lag | Medium | Periodic pruning, dynamic tiling |
| Burst Traffic (No Rate Limit) | Auth abuse / DoS | Medium | Add express-rate-limit / Redis store |
| DB Migration Errors | Downtime | Low | Pre-deploy migration verify script |
| Secret Misconfig | Security breach | Low | Env validator + deployment scripts |
| Log Volume Growth | Disk usage | Medium | Retention policies, log rotation (already partly) |

---
## 18. Metrics & Observability (Current State)
- Console+overlay FCP/LCP/CLS/TTI.
- Winston logs categorized (access, error, auth, database, socket).
- Manual health endpoint + `npm run health` script.

**Next:** integrate structured tracing (OpenTelemetry) + aggregated dashboard.

---
## 19. Developer Onboarding Checklist
1. Clone repository & install Node LTS.
2. Copy `.env.example` → `.env` in backend & adjust `DATABASE_URL`, `JWT_SECRET`.
3. Run `npm install` at root (or each folder) & migrate: `npx prisma migrate dev`.
4. Start via `npm start` (PowerShell script orchestrates) or run backend & frontend individually.
5. Login with seed users (admin/user) or register new.
6. Open a room (`/room/:id`) → draw & observe presence.
7. Toggle modes (cursor-only vs multi-user) for demonstration.

---
## 20. Glossary
| Term | Definition |
|------|------------|
| Operation | Atomic drawing change (add/remove path, shape, text) stored for history |
| Snapshot | Serialized canvas JSON for rapid load baseline |
| Presence | Real-time awareness of connected users and their cursors |
| Cursor Overlay | Out-of-canvas DOM layer rendering user cursors separately from Fabric objects |
| Debounced Save | Delayed persistence to batch rapid changes |

---
## 21. Conclusion
The Canvas App meets its collaboration, performance, and security objectives with a modular codebase ready for extension (CRDT integration, replay tooling, AI augmentation). The architecture balances implementation speed with solid foundations—positioned for iterative hardening and feature growth.

> Prepared for evaluation: this document aggregates architectural justification, implemented safeguards, trade-offs, and forward strategy.

---
**End of Document**
