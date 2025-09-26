import { Request, Response } from 'express';
import prisma from '../config/prisma';
import logger from '../utils/logger';

/**
 * Create a new room
 * @route POST /api/rooms
 */
export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ 
        status: 'error',
        message: 'User authentication required' 
      });
      return;
    }
    
    const { name, description, isPrivate, width, height } = req.body;
    
    // Generate a random join code if the room is private
    const joinCode = isPrivate ? Math.random().toString(36).substring(2, 10).toUpperCase() : null;
    
    // Create room with associated canvas
    const room = await prisma.room.create({
      data: {
        name,
        description,
        isPrivate: isPrivate || false,
        joinCode,
        creatorId: userId,
        canvas: {
          create: {
            name: `Canvas for ${name}`,
            width: width || 800,
            height: height || 600,
            creatorId: userId,
          },
        },
      },
      include: {
        canvas: true,
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Room created successfully',
      data: room,
    });
  } catch (error) {
    logger.error('Create room error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create room',
    });
  }
};

/**
 * Get all rooms with pagination and filtering
 * @route GET /api/rooms
 */
export const getAllRooms = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Filter parameters
    const name = req.query.name as string;
    const isPrivate = req.query.isPrivate === 'true';
    
    // Build filter object
    const filter: any = {};
    if (name) filter.name = { contains: name };
    
    // Only show public rooms by default, unless explicitly searching for private ones
    if (req.query.isPrivate !== undefined) {
      filter.isPrivate = isPrivate;
    } else {
      filter.isPrivate = false;
    }
    
    // Get rooms with pagination
    const [rooms, totalCount] = await Promise.all([
      prisma.room.findMany({
        where: filter,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: {
              id: true,
              username: true,
            },
          },
          canvas: {
            select: {
              id: true,
              width: true,
              height: true,
            },
          },
        },
      }),
      prisma.room.count({ where: filter }),
    ]);
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    res.status(200).json({
      status: 'success',
      message: 'Rooms retrieved successfully',
      data: rooms,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    logger.error('Get rooms error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve rooms',
    });
  }
};

/**
 * Get a room by ID
 * @route GET /api/rooms/:id
 */
export const getRoomById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const room = await prisma.room.findUnique({
      where: { id: parseInt(id) },
      include: {
        canvas: true,
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
    
    if (!room) {
      res.status(404).json({
        status: 'error',
        message: 'Room not found',
      });
      return;
    }
    
    // If the room is private, only the creator can see it
    // Or if the user has the join code
    if (room.isPrivate && room.creatorId !== req.user?.id) {
      const joinCode = req.query.joinCode as string;
      
      if (!joinCode || joinCode !== room.joinCode) {
        res.status(403).json({
          status: 'error',
          message: 'You do not have access to this private room',
        });
        return;
      }
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Room retrieved successfully',
      data: room,
    });
  } catch (error) {
    logger.error('Get room error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve room',
    });
  }
};

/**
 * Update a room
 * @route PUT /api/rooms/:id
 */
export const updateRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ 
        status: 'error',
        message: 'User authentication required' 
      });
      return;
    }
    
    // Check if room exists and user is the creator or an admin
    const room = await prisma.room.findUnique({
      where: { id: parseInt(id) },
      include: { creator: true },
    });
    
    if (!room) {
      res.status(404).json({
        status: 'error',
        message: 'Room not found',
      });
      return;
    }
    
    if (room.creatorId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this room',
      });
      return;
    }
    
    const { name, description, isPrivate } = req.body;
    
    // Generate a new join code if the room is being made private
    const joinCode = isPrivate && !room.isPrivate
      ? Math.random().toString(36).substring(2, 10).toUpperCase()
      : room.joinCode;
    
    // Update the room
    const updatedRoom = await prisma.room.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        isPrivate: isPrivate !== undefined ? isPrivate : room.isPrivate,
        joinCode,
      },
      include: {
        canvas: true,
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Room updated successfully',
      data: updatedRoom,
    });
  } catch (error) {
    logger.error('Update room error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update room',
    });
  }
};

/**
 * Delete a room
 * @route DELETE /api/rooms/:id
 */
export const deleteRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ 
        status: 'error',
        message: 'User authentication required' 
      });
      return;
    }
    
    // Check if room exists and user is the creator or an admin
    const room = await prisma.room.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!room) {
      res.status(404).json({
        status: 'error',
        message: 'Room not found',
      });
      return;
    }
    
    if (room.creatorId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'You do not have permission to delete this room',
      });
      return;
    }
    
    // Delete the room (will cascade delete the canvas and operations)
    await prisma.room.delete({
      where: { id: parseInt(id) },
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Room deleted successfully',
    });
  } catch (error) {
    logger.error('Delete room error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete room',
    });
  }
};

/**
 * Join a room
 * @route POST /api/rooms/:id/join
 */
export const joinRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { joinCode } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ 
        status: 'error',
        message: 'User authentication required' 
      });
      return;
    }
    
    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id: parseInt(id) },
      include: { canvas: true },
    });
    
    if (!room) {
      res.status(404).json({
        status: 'error',
        message: 'Room not found',
      });
      return;
    }
    
    // If the room is private, check the join code
    if (room.isPrivate && room.creatorId !== userId) {
      if (!joinCode || joinCode !== room.joinCode) {
        res.status(403).json({
          status: 'error',
          message: 'Invalid join code for private room',
        });
        return;
      }
    }
    
    // Successfully joined the room
    res.status(200).json({
      status: 'success',
      message: 'Room joined successfully',
      data: {
        roomId: room.id,
        canvasId: room.canvas?.id,
      },
    });
  } catch (error) {
    logger.error('Join room error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to join room',
    });
  }
};

/**
 * Leave a room
 * @route POST /api/rooms/:id/leave
 */
export const leaveRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a real-world scenario, this might update a user_rooms join table
    // For this simple implementation, we just return a success response
    
    res.status(200).json({
      status: 'success',
      message: 'Room left successfully',
    });
  } catch (error) {
    logger.error('Leave room error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to leave room',
    });
  }
};