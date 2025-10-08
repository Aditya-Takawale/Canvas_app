import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { User } from '../interfaces/user';
import { JwtPayload } from '../interfaces/auth';

/**
 * Generate a JWT token for a user
 * @param user - User object
 * @returns JWT token string
 */
export const generateJwtToken = (user: User): string => {
  const payload: JwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    // Include username in token so socket layer can access it without extra DB call
    username: user.username,
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
};

/**
 * Verify a JWT token
 * @param token - JWT token string
 * @returns Decoded JWT payload
 */
export const verifyJwtToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET || 'fallback_secret'
  ) as JwtPayload;
  
  return decoded;
};

/**
 * Hash a password
 * @param password - Plain text password
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password
 * @returns Boolean indicating if passwords match
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};