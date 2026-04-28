import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { isApprovedMember } from '../middleware/familyAuth.js';
import {
    sendMessage,
    sendMediaMessage,
    getMessages,
    deleteMessage,
    updateChatSettings,
    getChatSettings,
    addReaction,
    searchMessages
} from '../controllers/chatController.js';

const router = express.Router();

router.use(authenticate);

// Message operations
router.post('/send', sendMessage);
router.post('/send-media', sendMediaMessage);
router.get('/messages/:familyId', getMessages);
router.delete('/message/:messageId', deleteMessage);
router.post('/message/:messageId/reaction', addReaction);
router.get('/search', searchMessages);

// Chat settings
router.get('/settings/:familyId', getChatSettings);
router.patch('/settings', updateChatSettings);

export default router;
