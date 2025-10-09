import { Router } from 'express';
import { createRoom, getAllRooms, getRoomById, updateRoom, deleteRoom, joinRoom, leaveRoom } from './controller';
import { updateCanvas, saveCanvasState, getCanvasHistory } from '../canvas/controller';
import { validateRoomCreation, validateRoomUpdate } from '../../common/middleware';
import prisma from '../../../config/prisma';

const router = Router();

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: List rooms with pagination & filtering
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Rooms returned }
 */
router.get('/', getAllRooms);
/**
 * @swagger
 * /api/rooms/{id}:
 *   get:
 *     summary: Get a room by ID
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Room returned }
 *       404: { description: Not found }
 */
router.get('/:id', getRoomById);
/**
 * @swagger
 * /api/rooms:
 *   post:
 *     summary: Create a new room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoomRequest'
 *     responses:
 *       201: { description: Room created }
 */
router.post('/', validateRoomCreation, createRoom);
/**
 * @swagger
 * /api/rooms/{id}:
 *   put:
 *     summary: Update a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Room updated }
 */
router.put('/:id', validateRoomUpdate, updateRoom);
/**
 * @swagger
 * /api/rooms/{id}:
 *   delete:
 *     summary: Delete a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Room deleted }
 */
router.delete('/:id', deleteRoom);
/**
 * @swagger
 * /api/rooms/{id}/join:
 *   post:
 *     summary: Join a room (private rooms require join code/password)
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Joined }
 *       403: { description: Forbidden }
 */
router.post('/:id/join', joinRoom);
/**
 * @swagger
 * /api/rooms/{id}/leave:
 *   post:
 *     summary: Leave a room
 *     tags: [Rooms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Left }
 */
router.post('/:id/leave', leaveRoom);

// Nested canvas routes
/**
 * @swagger
 * /api/rooms/{roomId}/canvas:
 *   get:
 *     summary: Get canvas associated with room
 *     tags: [Rooms, Canvas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema: { type: integer }
 */
router.get('/:roomId/canvas', async (req, res) => {
	const { roomId } = req.params;
	try {
		const room = await prisma.room.findUnique({ where: { id: parseInt(roomId) }, include: { canvas: true } });
		if (!room) return res.status(404).json({ status: 'error', message: 'Room not found' });
		if (!room.canvas) return res.status(404).json({ status: 'error', message: 'Canvas not found for this room' });
		res.status(200).json({ status: 'success', data: room.canvas });
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to fetch canvas' });
	}
});

/**
 * @swagger
 * /api/rooms/{roomId}/canvas:
 *   put:
 *     summary: Update canvas (through room)
 *     tags: [Rooms, Canvas]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:roomId/canvas', async (req, res) => {
	const { roomId } = req.params;
	try {
		const room = await prisma.room.findUnique({ where: { id: parseInt(roomId) }, include: { canvas: true } });
		if (!room || !room.canvas) return res.status(404).json({ status: 'error', message: 'Room or canvas not found' });
		(req.params as any).id = room.canvas.id.toString();
		return updateCanvas(req, res);
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to update canvas' });
	}
});

/**
 * @swagger
 * /api/rooms/{roomId}/canvas/state:
 *   post:
 *     summary: Save canvas state (through room)
 *     tags: [Rooms, Canvas]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:roomId/canvas/state', async (req, res) => {
	const { roomId } = req.params;
	try {
		const room = await prisma.room.findUnique({ where: { id: parseInt(roomId) }, include: { canvas: true } });
		if (!room || !room.canvas) return res.status(404).json({ status: 'error', message: 'Room or canvas not found' });
		(req.params as any).id = room.canvas.id.toString();
		return saveCanvasState(req, res);
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to save canvas state' });
	}
});

/**
 * @swagger
 * /api/rooms/{roomId}/canvas/history:
 *   get:
 *     summary: Get canvas history (through room)
 *     tags: [Rooms, Canvas]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:roomId/canvas/history', async (req, res) => {
	const { roomId } = req.params;
	try {
		const room = await prisma.room.findUnique({ where: { id: parseInt(roomId) }, include: { canvas: true } });
		if (!room || !room.canvas) return res.status(404).json({ status: 'error', message: 'Room or canvas not found' });
		(req.params as any).id = room.canvas.id.toString();
		return getCanvasHistory(req, res);
	} catch (error) {
		res.status(500).json({ status: 'error', message: 'Failed to get canvas history' });
	}
});

export default router;

