import { Router } from 'express';
import { getCanvasById, updateCanvas, saveCanvasState, getCanvasHistory } from './controller';

const router = Router();
/**
 * @swagger
 * /api/canvas/{id}:
 *   get:
 *     summary: Get canvas by ID
 *     tags: [Canvas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Canvas returned }
 *       404: { description: Not found }
 */
router.get('/:id', getCanvasById);
/**
 * @swagger
 * /api/canvas/{id}:
 *   put:
 *     summary: Update canvas metadata
 *     tags: [Canvas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Canvas updated }
 */
router.put('/:id', updateCanvas);
/**
 * @swagger
 * /api/canvas/{id}/save:
 *   post:
 *     summary: Save canvas state & operations
 *     tags: [Canvas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: State saved }
 */
router.post('/:id/save', saveCanvasState);
/**
 * @swagger
 * /api/canvas/{id}/history:
 *   get:
 *     summary: Get canvas operation history
 *     tags: [Canvas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: History returned }
 */
router.get('/:id/history', getCanvasHistory);
export default router;

