export interface JwtPayload {
  id: number;
  email: string;
  role: string;
  iat?: number;  // Issued at timestamp
  exp?: number;  // Expiration timestamp
}