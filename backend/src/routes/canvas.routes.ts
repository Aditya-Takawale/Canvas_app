import { Router } from 'express';
import {
  getCanvasById,
  updateCanvas,
  saveCanvasState,
  getCanvasHistory,
} from '../controllers/canvas.controller';

const router = Router();

/**
 * @route   GET /api/canvas/:id
 * @desc    Get canvas by ID
 * @access  Private
 */
router.get('/:id', getCanvasById);

/**
 * @route   PUT /api/canvas/:id
 * @desc    Update canvas properties (width, height, name)
 * @access  Private (only creator or admin)
 */
router.put('/:id', updateCanvas);

/**
 * @route   POST /api/canvas/:id/save
 * @desc    Save the current state of a canvas
 * @access  Private
 */
router.post('/:id/save', saveCanvasState);

/**
 * @route   GET /api/canvas/:id/history
 * @desc    Get canvas operation history
 * @access  Private
 */
router.get('/:id/history', getCanvasHistory);

export default router;