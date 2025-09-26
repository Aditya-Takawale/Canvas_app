"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const validators_1 = require("../middleware/validators");
const router = (0, express_1.Router)();
/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', user_controller_1.getCurrentUser);
/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', validators_1.validateProfileUpdate, user_controller_1.updateUserProfile);
/**
 * @route   PUT /api/users/me/password
 * @desc    Change current user password
 * @access  Private
 */
router.put('/me/password', validators_1.validatePasswordChange, user_controller_1.changePassword);
/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (limited info)
 * @access  Private
 */
router.get('/:id', user_controller_1.getUserById);
exports.default = router;
//# sourceMappingURL=user.routes.js.map