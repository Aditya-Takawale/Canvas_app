## Real-Time Drawing Protocol (Draft)

This document defines the wire protocol for collaborative drawing, extending the existing `DRAWING_EVENT` model with low-latency incremental stroke streaming.

### Goals
1. Near real-time visibility of in-progress strokes (sub-50ms perceived latency).
2. Backward compatibility: legacy clients still receive a final `DRAWING_EVENT` when a stroke completes.
3. Network efficiency: batch small point deltas; avoid flooding.
4. Robustness: tolerate packet loss and mid-stroke disconnects.

### Event Set
| Event | Purpose | Direction |
|-------|---------|-----------|
| `stroke_begin` | Initiate a new stroke with metadata | client -> server -> room
| `stroke_point` | Append one or more points to an active stroke | client -> server -> room
| `stroke_end` | Finalize a stroke (server also emits legacy DRAWING_EVENT) | client -> server -> room
| `stroke_cancel` (optional) | Abort a stroke (disconnect / tool switch) | client -> server -> room

### Shared Concepts
`strokeId`: Client-generated UUID (e.g., nanoid) ensuring uniqueness per stroke.

`points`: Array of compact point objects. Each point:
```json
{ "x": 123.45, "y": 67.89, "dt": 16 }
```
`dt` = milliseconds since previous emitted point (helps for smoothing or time-based replay). First point may omit `dt` or set `0`.

### Payload Schemas
```ts
interface StrokeBeginPayload {
  roomId: string;          // Target room
  strokeId: string;        // Client-generated
  userId?: number;         // Filled by server when re-broadcasting
  color: string;           // Current brush color (e.g. '#ffaa00')
  size: number;            // Brush width in px
  tool: 'pencil' | 'eraser' | string; // Tool name
  start: { x: number; y: number };    // Initial point
  ts?: number;             // Client timestamp (ms)
}

interface StrokePointPayload {
  roomId: string;
  strokeId: string;
  userId?: number;         // Added by server
  points: Array<{ x: number; y: number; dt?: number }>; // 1..N points batched
  ts?: number;             // Timestamp of batch emission
  seq?: number;            // Optional sequence number for ordering (monotonic per stroke)
}

interface StrokeEndPayload {
  roomId: string;
  strokeId: string;
  userId?: number;
  final?: { x: number; y: number };   // Optional last point if not already sent
  totalPoints?: number;               // Count for validation
  ts?: number;
}

interface StrokeCancelPayload {
  roomId: string;
  strokeId: string;
  reason?: 'disconnect' | 'tool-switch' | 'error';
  ts?: number;
}
```

### Legacy Bridging
On `stroke_end` the server reconstructs a Fabric-style path object (or minimal path data `{ pathData: ... }`) and emits the existing `DRAWING_EVENT` with:
```json
{
  "objectType": "path",
  "action": "added",
  "objectData": { "pathData": <fabric serialized>, "color": "#..", "size": 4, "strokeId": "..." }
}
```
This ensures persistence & history continue working without changes to database schema initially.

### Throttling & Batching Strategy
Client batches raw pointer points and emits at most every 16ms (≈60fps) and no rarer than every 33ms (≈30fps) depending on activity:
1. Collect points on `pointermove` when stroke active.
2. Use `requestAnimationFrame` (or a fixed interval fallback) to flush accumulated points.
3. If > 12 points accumulate before frame boundary, flush early.
4. Always send final unsent points before `stroke_end`.

### Client-Side Rendering
Maintain an in-progress map: `activeStrokes[strokeId]` holding a lightweight Path object / polyline. When `stroke_point` arrives:
1. Append points quickly (avoid full re-serialization).
2. Only call `canvas.requestRenderAll()` at most once per animation frame (coalesce multiple inbound batches).
3. After `stroke_end`, finalize stroke: mark selectable, flatten if needed.

If a `stroke_cancel` is received, remove the provisional path.

### Ordering & Recovery
Optional `seq` may be used to detect missed batches. If a gap is detected, client can request a stroke resync in future enhancement (not implemented in first iteration; rely on low packet loss assumption over WebSocket).

### Security / Validation
Server side minimal validation:
1. Limit points per batch (e.g. <= 50) and reject overflows.
2. Enforce stroke duration max (e.g. 2 minutes) before auto-cancel.
3. Size bounds (e.g. 0 < size <= 128) & color regex.

### Future Extensions
| Feature | Rationale |
|---------|-----------|
| Pressure / tilt data | Stylus support |
| Stroke compression (Douglas–Peucker) | Reduce bandwidth |
| Stroke resync request | Repair missed segments |
| Delta encoding | Smaller payloads for dense paths |

### Implementation Phases
1. Add new socket event constants (backend + frontend).
2. Implement server pass-through broadcast for new events + legacy bridge on `stroke_end`.
3. Frontend: hook pencil tool to emit lifecycle events + local predictive drawing.
4. Frontend: render remote in-progress strokes; finalize into existing persistence flow.
5. QA & performance measurements (frame rate, average batch size, latency logs).

---
Status: Draft (Implementation ongoing)
