import express from 'express';
import { 
    getNotifications, 
    markAsRead, 
    payEmi 
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.post('/:id/pay', payEmi);

export default router;
