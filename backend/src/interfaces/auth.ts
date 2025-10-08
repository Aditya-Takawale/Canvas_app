export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  // Optional username added to improve real-time features (cursor labels, presence)
  username?: string;
  iat?: number;  // Issued at timestamp
  exp?: number;  // Expiration timestamp
}