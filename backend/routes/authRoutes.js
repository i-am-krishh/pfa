import express from 'express';
import { registerUser, loginUser, getCurrentUser, updateUserProfile } from '../controllers/authController.js';
import { validateRegister, validateLogin, handleValidationErrors } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', validateRegister, handleValidationErrors, registerUser);
router.post('/login', validateLogin, handleValidationErrors, loginUser);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.put('/profile', authenticate, updateUserProfile);

export default router;
