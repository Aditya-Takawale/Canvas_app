import { Request, Response } from 'express';
import prisma from '../config/prisma';
import logger from '../utils/logger';

/**
 * Get canvas by ID
 * @route GET /api/canvas/:id
 */
export const getCanvasById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const canvas = await prisma.canvas.findUnique({
      where: { id: parseInt(id) },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            isPrivate: true,
            creatorId: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    
    if (!canvas) {
      res.status(404).json({
        status: 'error',
        message: 'Canvas not found',
      });
      return;
    }
    
    // Check if the user has access to this canvas
    // If it's in a private room, only the creator can access it
    if (canvas.room.isPrivate && canvas.room.creatorId !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'You do not have access to this canvas',
      });
      return;
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Canvas retrieved successfully',
      data: canvas,
    });
  } catch (error) {
    logger.error('Get canvas error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve canvas',
    });
  }
};

/**
 * Update canvas properties
 * @route PUT /api/canvas/:id
 */
export const updateCanvas = async (req: Request, res: Response): Promise<void> => {
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
    
    // Find canvas and check if user is the creator or admin
    const canvas = await prisma.canvas.findUnique({
      where: { id: parseInt(id) },
      include: { room: true },
    });
    
    if (!canvas) {
      res.status(404).json({
        status: 'error',
        message: 'Canvas not found',
      });
      return;
    }
    
    // Check if the user has permission to update this canvas
    if (canvas.creatorId !== userId && canvas.room.creatorId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'You do not have permission to update this canvas',
      });
      return;
    }
    
    const { name, width, height } = req.body;
    
    // Update canvas properties
    const updatedCanvas = await prisma.canvas.update({
      where: { id: parseInt(id) },
      data: {
        name: name !== undefined ? name : canvas.name,
        width: width !== undefined ? width : canvas.width,
        height: height !== undefined ? height : canvas.height,
      },
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Canvas updated successfully',
      data: updatedCanvas,
    });
  } catch (error) {
    logger.error('Update canvas error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update canvas',
    });
  }
};

/**
 * Save canvas state
 * @route POST /api/canvas/:id/save
 */
export const saveCanvasState = async (req: Request, res: Response): Promise<void> => {
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
    
    const { state, operations } = req.body as {
      state?: unknown;
      operations?: Array<{ objectType: string; objectData: unknown; action: string }>;
    };
    
    // Find canvas
    const canvas = await prisma.canvas.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!canvas) {
      res.status(404).json({
        status: 'error',
        message: 'Canvas not found',
      });
      return;
    }
    
    // Start a transaction to save both state and operations
    const updated = await prisma.$transaction(async (tx) => {
      // Update canvas state
      if (state !== undefined) {
        // Always stringify the state to ensure it's a string
        const serializedState = JSON.stringify(state);
        console.log('Saving canvas state as string:', typeof serializedState, 'length:', serializedState.length);
        await tx.canvas.update({
          where: { id: parseInt(id) },
          data: { state: serializedState },
        });
      }
      
      // Save new operations
      if (operations && Array.isArray(operations) && operations.length > 0) {
        const operationPromises = operations.map((operation) => {
          const serializedObjectData = typeof operation.objectData === 'string'
            ? operation.objectData
            : JSON.stringify(operation.objectData);
          return tx.drawingOperation.create({
            data: {
              canvasId: parseInt(id),
              userId: userId,
              objectType: operation.objectType,
              objectData: serializedObjectData,
              action: operation.action,
            },
          });
        });
        
        await Promise.all(operationPromises);
      }

      // Return the latest canvas
      return tx.canvas.findUnique({ where: { id: parseInt(id) } });
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Canvas state saved successfully',
      data: updated,
    });
  } catch (error) {
    logger.error('Save canvas state error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to save canvas state'
    });
  }
};

/**
 * Get canvas history
 * @route GET /api/canvas/:id/history
 */
export const getCanvasHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    // Find canvas to check access
    const canvas = await prisma.canvas.findUnique({
      where: { id: parseInt(id) },
      include: { room: true },
    });
    
    if (!canvas) {
      res.status(404).json({
        status: 'error',
        message: 'Canvas not found',
      });
      return;
    }
    
    // Check if the user has access to this canvas
    if (canvas.room.isPrivate && canvas.room.creatorId !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({
        status: 'error',
        message: 'You do not have access to this canvas',
      });
      return;
    }
    
    // Get drawing operations for this canvas
    const operations = await prisma.drawingOperation.findMany({
      where: { canvasId: parseInt(id) },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Canvas history retrieved successfully',
      data: {
        operations,
        state: canvas.state,
      },
    });
  } catch (error) {
    logger.error('Get canvas history error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve canvas history',
    });
  }
};