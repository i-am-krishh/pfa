import express from 'express';
import { getChatbotResponse } from '../controllers/chatbotController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/message', authenticate, getChatbotResponse);

export default router;
