"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const canvas_controller_1 = require("../controllers/canvas.controller");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/canvas/:id
 * @desc    Get canvas by ID
 * @access  Private
 */
router.get('/:id', canvas_controller_1.getCanvasById);
/**
 * @route   PUT /api/canvas/:id
 * @desc    Update canvas properties (width, height, name)
 * @access  Private (only creator or admin)
 */
router.put('/:id', canvas_controller_1.updateCanvas);
/**
 * @route   POST /api/canvas/:id/save
 * @desc    Save the current state of a canvas
 * @access  Private
 */
router.post('/:id/save', canvas_controller_1.saveCanvasState);
/**
 * @route   GET /api/canvas/:id/history
 * @desc    Get canvas operation history
 * @access  Private
 */
router.get('/:id/history', canvas_controller_1.getCanvasHistory);
exports.default = router;
//# sourceMappingURL=canvas.routes.js.map