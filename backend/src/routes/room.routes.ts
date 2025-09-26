import { Router } from 'express';
import {
  createRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
} from '../controllers/room.controller';
import {
  getCanvasById,
  updateCanvas,
  saveCanvasState,
  getCanvasHistory,
} from '../controllers/canvas.controller';
import { validateRoomCreation, validateRoomUpdate } from '../middleware/validators';
import prisma from '../config/prisma';

const router = Router();

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Get all rooms
 *     description: Retrieve all available rooms with pagination and filtering
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of rooms per page
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by room name
 *       - in: query
 *         name: isPublic
 *         schema:
 *           type: boolean
 *         description: Filter by room privacy
 *     responses:
 *       200:
 *         description: List of rooms retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Room'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   GET /api/rooms
 * @desc    Get all rooms (with pagination and filtering)
 * @access  Private
 */
router.get('/', getAllRooms);

/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Get a room by ID
 *     description: Retrieve detailed information about a specific room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Room'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   GET /api/rooms/:id
 * @desc    Get a room by ID
 * @access  Private
 */
router.get('/:id', getRoomById);

/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     description: Create a new collaboration room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Room name
 *               description:
 *                 type: string
 *                 description: Room description
 *               isPublic:
 *                 type: boolean
 *                 description: Whether the room is public or private
 *               joinCode:
 *                 type: string
 *                 description: Join code for private rooms
 *               maxUsers:
 *                 type: integer
 *                 minimum: 1
 *                 description: Maximum number of users allowed
 *             required:
 *               - name
 *           example:
 *             name: "Design Collaboration"
 *             description: "A room for collaborative design work"
 *             isPublic: true
 *             maxUsers: 10
 *     responses:
 *       201:
 *         description: Room created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Room'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   POST /api/rooms
 * @desc    Create a new room
 * @access  Private
 */
router.post('/', validateRoomCreation, createRoom);

/**
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     summary: Update a room
 *     description: Update room details (only creator or admin)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Room name
 *               description:
 *                 type: string
 *                 description: Room description
 *               isPublic:
 *                 type: boolean
 *                 description: Whether the room is public or private
 *               joinCode:
 *                 type: string
 *                 description: Join code for private rooms
 *               maxUsers:
 *                 type: integer
 *                 minimum: 1
 *                 description: Maximum number of users allowed
 *           example:
 *             name: "Updated Room Name"
 *             description: "Updated description"
 *             maxUsers: 15
 *     responses:
 *       200:
 *         description: Room updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Room'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Not room creator or admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   PUT /api/rooms/:id
 * @desc    Update a room
 * @access  Private (only creator or admin)
 */
router.put('/:id', validateRoomUpdate, updateRoom);

/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Delete a room
 *     description: Delete a room (only creator or admin)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Room deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Room deleted successfully"
 *       403:
 *         description: Forbidden - Not room creator or admin
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   DELETE /api/rooms/:id
 * @desc    Delete a room
 * @access  Private (only creator or admin)
 */
router.delete('/:id', deleteRoom);

/**
 * @swagger
 * /api/rooms/{id}/join:
 *   post:
 *     summary: Join a room
 *     description: Join a room (requires join code for private rooms)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               joinCode:
 *                 type: string
 *                 description: Join code (required for private rooms)
 *           example:
 *             joinCode: "ABC123"
 *     responses:
 *       200:
 *         description: Successfully joined room
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Successfully joined room"
 *       400:
 *         description: Invalid join code or room full
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Room not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   POST /api/rooms/:id/join
 * @desc    Join a room (for private rooms, requires join code)
 * @access  Private
 */
router.post('/:id/join', joinRoom);

/**
 * @swagger
 * /api/rooms/{id}/leave:
 *   post:
 *     summary: Leave a room
 *     description: Leave a room that the user has joined
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Successfully left room
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Successfully left room"
 *       404:
 *         description: Room not found or user not in room
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   POST /api/rooms/:id/leave
 * @desc    Leave a room
 * @access  Private
 */
router.post('/:id/leave', leaveRoom);

// Canvas routes nested under rooms
/**
 * @swagger
 * /api/rooms/{roomId}/canvas:
 *   get:
 *     summary: Get canvas for a room
 *     description: Retrieve the canvas data for a specific room
 *     tags: [Canvas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     responses:
 *       200:
 *         description: Canvas data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Canvas'
 *       404:
 *         description: Room or canvas not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   GET /api/rooms/:roomId/canvas
 * @desc    Get canvas for a room
 * @access  Private
 */
router.get('/:roomId/canvas', async (req, res) => {
  // Get canvas by room ID instead of canvas ID
  const { roomId } = req.params;
  
  try {
    const room = await prisma.room.findUnique({
      where: { id: parseInt(roomId) },
      include: { canvas: true },
    });
    
    if (!room) {
      return res.status(404).json({
        status: 'error',
        message: 'Room not found',
      });
    }
    
    if (!room.canvas) {
      return res.status(404).json({
        status: 'error',
        message: 'Canvas not found for this room',
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: room.canvas,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch canvas',
    });
  }
});

/**
 * @swagger
 * /api/rooms/{roomId}/canvas:
 *   put:
 *     summary: Update canvas for a room
 *     description: Update the canvas data for a specific room
 *     tags: [Canvas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               canvasData:
 *                 type: string
 *                 description: Serialized canvas data (JSON string)
 *               width:
 *                 type: integer
 *                 description: Canvas width in pixels
 *               height:
 *                 type: integer
 *                 description: Canvas height in pixels
 *           example:
 *             canvasData: '{"objects": [], "background": "white"}'
 *             width: 1200
 *             height: 800
 *     responses:
 *       200:
 *         description: Canvas updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Canvas'
 *       404:
 *         description: Room or canvas not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   PUT /api/rooms/:roomId/canvas
 * @desc    Update canvas for a room
 * @access  Private
 */
router.put('/:roomId/canvas', async (req, res) => {
  // Get canvas ID from room first, then update
  const { roomId } = req.params;
  
  try {
    const room = await prisma.room.findUnique({
      where: { id: parseInt(roomId) },
      include: { canvas: true },
    });
    
    if (!room || !room.canvas) {
      return res.status(404).json({
        status: 'error',
        message: 'Room or canvas not found',
      });
    }
    
    // Set the canvas ID in params and call the canvas controller
    (req.params as any).id = room.canvas.id.toString();
    return updateCanvas(req, res);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to update canvas',
    });
  }
});

/**
 * @swagger
 * /api/rooms/{roomId}/canvas/state:
 *   post:
 *     summary: Save canvas state for a room
 *     description: Save a snapshot of the current canvas state
 *     tags: [Canvas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               canvasData:
 *                 type: string
 *                 description: Serialized canvas state data
 *               stateName:
 *                 type: string
 *                 description: Name for this canvas state
 *             required:
 *               - canvasData
 *           example:
 *             canvasData: '{"objects": [{"type": "rect", "width": 100}], "background": "white"}'
 *             stateName: "Design v1"
 *     responses:
 *       201:
 *         description: Canvas state saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Canvas state saved successfully"
 *       404:
 *         description: Room or canvas not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   POST /api/rooms/:roomId/canvas/state
 * @desc    Save canvas state for a room
 * @access  Private
 */
router.post('/:roomId/canvas/state', async (req, res) => {
  const { roomId } = req.params;
  
  try {
    const room = await prisma.room.findUnique({
      where: { id: parseInt(roomId) },
      include: { canvas: true },
    });
    
    if (!room || !room.canvas) {
      return res.status(404).json({
        status: 'error',
        message: 'Room or canvas not found',
      });
    }
    
    // Set the canvas ID in params and call the canvas controller
    (req.params as any).id = room.canvas.id.toString();
    return saveCanvasState(req, res);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to save canvas state',
    });
  }
});

/**
 * @swagger
 * /api/rooms/{roomId}/canvas/history:
 *   get:
 *     summary: Get canvas history for a room
 *     description: Retrieve the version history of canvas states
 *     tags: [Canvas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Room ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Number of history entries to return
 *     responses:
 *       200:
 *         description: Canvas history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           stateName:
 *                             type: string
 *                           canvasData:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           userId:
 *                             type: integer
 *       404:
 *         description: Room or canvas not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 * @route   GET /api/rooms/:roomId/canvas/history
 * @desc    Get canvas history for a room
 * @access  Private
 */
router.get('/:roomId/canvas/history', async (req, res) => {
  const { roomId } = req.params;
  
  try {
    const room = await prisma.room.findUnique({
      where: { id: parseInt(roomId) },
      include: { canvas: true },
    });
    
    if (!room || !room.canvas) {
      return res.status(404).json({
        status: 'error',
        message: 'Room or canvas not found',
      });
    }
    
    // Set the canvas ID in params and call the canvas controller
    (req.params as any).id = room.canvas.id.toString();
    return getCanvasHistory(req, res);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to get canvas history',
    });
  }
});

export default router;