-- Canvas App Initial PostgreSQL Schema
-- Safe to run on an empty database. If tables already exist, statements may fail; drop manually if needed.
-- NOTE: Rotate your DATABASE_URL password if it was shared publicly.

BEGIN;

-- Users table (maps to Prisma model User / table name 'users')
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Rooms table (maps to Prisma model Room / table name 'rooms')
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "isPrivate" BOOLEAN NOT NULL DEFAULT FALSE,
  "joinCode" TEXT UNIQUE,
  password TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "creatorId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Canvases table (maps to Prisma model Canvas / table name 'canvases')
CREATE TABLE IF NOT EXISTS canvases (
  id SERIAL PRIMARY KEY,
  name TEXT,
  width INTEGER NOT NULL DEFAULT 800,
  height INTEGER NOT NULL DEFAULT 600,
  state TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "roomId" INTEGER NOT NULL UNIQUE REFERENCES rooms(id) ON DELETE CASCADE,
  "creatorId" INTEGER NOT NULL REFERENCES users(id)
);

-- Drawing operations (maps to Prisma model DrawingOperation / table name 'drawing_operations')
CREATE TABLE IF NOT EXISTS drawing_operations (
  id SERIAL PRIMARY KEY,
  "objectType" TEXT NOT NULL,
  "objectData" TEXT NOT NULL,
  action TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "canvasId" INTEGER NOT NULL REFERENCES canvases(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES users(id)
);

-- Room connections (maps to Prisma model RoomConnection / table name 'room_connections')
CREATE TABLE IF NOT EXISTS room_connections (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "roomId" INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "leftAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "ipAddress" TEXT,
  "userAgent" TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_creator ON rooms("creatorId");
CREATE INDEX IF NOT EXISTS idx_canvases_room ON canvases("roomId");
CREATE INDEX IF NOT EXISTS idx_drawing_canvas ON drawing_operations("canvasId");
CREATE INDEX IF NOT EXISTS idx_drawing_user ON drawing_operations("userId");
CREATE INDEX IF NOT EXISTS idx_room_conn_room ON room_connections("roomId");
CREATE INDEX IF NOT EXISTS idx_room_conn_user ON room_connections("userId");

COMMIT;

-- Verification queries (optional)
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT COUNT(*) FROM users;
