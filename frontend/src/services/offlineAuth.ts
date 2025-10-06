// Offline auth support: provides mock users when backend is unreachable or intentionally disabled.
// Activate by setting REACT_APP_OFFLINE_MODE=1 before build (or manually in dev tools).

import { User } from '../interfaces/auth';
import { UserRoles } from '../utils/constants';

const OFFLINE_KEY = 'offline_users_seeded_v1';
const USERS_KEY = 'offline_users';

const mockUsers: Array<User & { password: string }> = [
  {
    id: 1,
    username: 'admin_alpha',
    email: 'admin.alpha@example.com',
    role: UserRoles.ADMIN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    password: 'AdminPass123!'
  },
  {
    id: 2,
    username: 'admin_beta',
    email: 'admin.beta@example.com',
    role: UserRoles.ADMIN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    password: 'AdminPass123!'
  },
  {
    id: 3,
    username: 'user_charlie',
    email: 'user.charlie@example.com',
    role: UserRoles.USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    password: 'UserPass123!'
  },
  {
    id: 4,
    username: 'user_delta',
    email: 'user.delta@example.com',
    role: UserRoles.USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    password: 'UserPass123!'
  }
];

export function isOfflineMode() {
  return process.env.REACT_APP_OFFLINE_MODE === '1';
}

export function ensureOfflineSeed() {
  if (!isOfflineMode()) return;
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(OFFLINE_KEY)) return;
  localStorage.setItem(USERS_KEY, JSON.stringify(mockUsers));
  localStorage.setItem(OFFLINE_KEY, 'true');
  // eslint-disable-next-line no-console
  console.warn('[offline-auth] Seeded mock users (admin/admin, user/user variants).');
}

export function listOfflineUsers(): User[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw).map((u: any) => ({ id: u.id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt, updatedAt: u.updatedAt }));
}

export function offlineLogin(email: string, password: string): { user: User; token: string } | null {
  if (!isOfflineMode()) return null;
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return null;
  const users = JSON.parse(raw) as typeof mockUsers;
  const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!found) return null;
  // simple token placeholder
  const token = btoa(`${found.id}:${found.email}:${Date.now()}`);
  return { user: { id: found.id, username: found.username, email: found.email, role: found.role, createdAt: found.createdAt, updatedAt: found.updatedAt }, token };
}

export function offlineRegister(username: string, email: string, password: string): { user: User; token: string } | null {
  if (!isOfflineMode()) return null;
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USERS_KEY) || '[]';
  const users = JSON.parse(raw) as typeof mockUsers;
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('User already exists (offline)');
  }
  const newUser: any = {
    id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1,
    username,
    email,
    role: UserRoles.USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    password,
  };
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  const token = btoa(`${newUser.id}:${newUser.email}:${Date.now()}`);
  return { user: { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role, createdAt: newUser.createdAt, updatedAt: newUser.updatedAt }, token };
}
