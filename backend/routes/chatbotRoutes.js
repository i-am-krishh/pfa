import express from 'express';
import { getChatbotResponse } from '../controllers/chatbotController.js';

const router = express.Router();

router.post('/message', getChatbotResponse);

export default router;
