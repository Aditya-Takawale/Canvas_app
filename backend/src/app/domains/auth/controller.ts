import { Request, Response } from 'express';
import { comparePassword, generateJwtToken, hashPassword } from '../../../utils/auth';
import { User, UserCreationAttributes } from '../../../interfaces/user';
import logger, { authLogger } from '../../../utils/logger';
import prisma from '../../../config/prisma';

export const register = async (req: Request, res: Response): Promise<void> => {
	try {
		const { username, email, password } = req.body as UserCreationAttributes;
		const ipAddress = req.ip;
		const userAgent = req.headers['user-agent'] || 'Unknown';

		authLogger.info({ message: 'User registration attempt', username, email, ipAddress, userAgent, timestamp: new Date().toISOString() });

		const existingUser = await prisma.user.findFirst({
			where: { OR: [{ email }, { username }] },
		});
		if (existingUser) {
			authLogger.warn({ message: 'Registration failed - user already exists', username, email, ipAddress, userAgent, reason: 'Duplicate user', timestamp: new Date().toISOString() });
			res.status(409).json({ status: 'error', message: 'User with this email or username already exists' });
			return;
		}

		const hashedPassword = await hashPassword(password);
		const newUser = await prisma.user.create({ data: { username, email, password: hashedPassword, role: 'user' } });
		const token = generateJwtToken(newUser as unknown as User);
		const { password: _pw, ...userWithoutPassword } = newUser;
		authLogger.info({ message: 'User registered successfully', userId: newUser.id, username, email, ipAddress, userAgent, timestamp: new Date().toISOString() });
		res.status(201).json({ status: 'success', message: 'User registered successfully', data: { user: userWithoutPassword, token } });
	} catch (error) {
		authLogger.error({ message: 'Registration error', error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined, timestamp: new Date().toISOString() });
		logger.error('Registration error:', error);
		res.status(500).json({ status: 'error', message: 'Failed to register user' });
	}
};

export const login = async (req: Request, res: Response): Promise<void> => {
	try {
		const { email, password } = req.body;
		const ipAddress = req.ip;
		const userAgent = req.headers['user-agent'] || 'Unknown';
		authLogger.info({ message: 'Login attempt', email, ipAddress, userAgent, timestamp: new Date().toISOString() });
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) {
			authLogger.warn({ message: 'Login failed - user not found', email, ipAddress, userAgent, reason: 'User not found', timestamp: new Date().toISOString() });
			res.status(401).json({ status: 'error', message: 'Invalid credentials' });
			return;
		}
		const isPasswordValid = await comparePassword(password, user.password);
		if (!isPasswordValid) {
			authLogger.warn({ message: 'Login failed - invalid password', userId: user.id, username: user.username, email, ipAddress, userAgent, reason: 'Invalid password', timestamp: new Date().toISOString() });
			res.status(401).json({ status: 'error', message: 'Invalid credentials' });
			return;
		}
		const token = generateJwtToken(user as unknown as User);
		const { password: _pw, ...userWithoutPassword } = user;
		authLogger.info({ message: 'Login successful', userId: user.id, username: user.username, email, ipAddress, userAgent, timestamp: new Date().toISOString() });
		res.status(200).json({ status: 'success', message: 'Login successful', data: { user: userWithoutPassword, token } });
	} catch (error) {
		authLogger.error({ message: 'Login error', error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined, timestamp: new Date().toISOString() });
		logger.error('Login error:', error);
		res.status(500).json({ status: 'error', message: 'Failed to login' });
	}
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
	try {
		const { userId } = req.body;
		const ipAddress = req.ip;
		const userAgent = req.headers['user-agent'] || 'Unknown';
		authLogger.info({ message: 'Token refresh attempt', userId, ipAddress, userAgent, timestamp: new Date().toISOString() });
		if (!userId) {
			authLogger.warn({ message: 'Token refresh failed - missing user ID', ipAddress, userAgent, reason: 'Missing user ID', timestamp: new Date().toISOString() });
			res.status(400).json({ status: 'error', message: 'User ID required' });
			return;
		}
		const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
		if (!user) {
			authLogger.warn({ message: 'Token refresh failed - user not found', userId, ipAddress, userAgent, reason: 'User not found', timestamp: new Date().toISOString() });
			res.status(404).json({ status: 'error', message: 'User not found' });
			return;
		}
		const token = generateJwtToken(user as unknown as User);
		authLogger.info({ message: 'Token refresh successful', userId: user.id, username: user.username, ipAddress, userAgent, timestamp: new Date().toISOString() });
		res.status(200).json({ status: 'success', message: 'Token refreshed', data: { token } });
	} catch (error) {
		authLogger.error({ message: 'Token refresh error', error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined, timestamp: new Date().toISOString() });
		logger.error('Token refresh error:', error);
		res.status(500).json({ status: 'error', message: 'Failed to refresh token' });
	}
};

export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
	try {
		const userId = (req as any).user?.id;
		if (!userId) {
			res.status(401).json({ status: 'error', message: 'Not authenticated' });
			return;
		}
		const user = await prisma.user.findUnique({
			where: { id: parseInt(userId) },
			select: { id: true, username: true, email: true, role: true, createdAt: true, updatedAt: true },
		});
		if (!user) {
			res.status(404).json({ status: 'error', message: 'User not found' });
			return;
		}
		res.status(200).json({ status: 'success', data: { user } });
	} catch (error) {
		logger.error('Get current user error:', error);
		res.status(500).json({ status: 'error', message: 'Failed to get user information' });
	}
};

export const logout = async (req: Request, res: Response): Promise<void> => {
	const userId = (req as any).user?.id;
	const ipAddress = req.ip;
	const userAgent = req.headers['user-agent'] || 'Unknown';
	if (userId) {
		authLogger.info({ message: 'User logout', userId, ipAddress, userAgent, timestamp: new Date().toISOString() });
	}
	res.status(200).json({ status: 'success', message: 'Logout successful' });
};


