import express from 'express';
import multer from 'multer';
import {
    uploadStatement,
    getTransactionPreview,
    confirmImport,
    updateStagingCategory,
    getUploadHistory,
    getAIInsights,
    exportStatementCSV,
    debugStatementUpload
} from '../controllers/statementController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Multer memory storage configuration with validation limits
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB size limit
    fileFilter: (req, file, cb) => {
        const fileExtension = file.originalname.split('.').pop().toLowerCase();
        const allowedExtensions = ['pdf', 'csv', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'];
        
        if (allowedExtensions.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, CSV, Excel (XLSX/XLS), and Image (JPG/PNG) files are supported!'));
        }
    }
});

// Protect all routes with auth middleware
router.use(authenticate);

// Endpoints
router.post('/upload', upload.single('file'), uploadStatement);
router.get('/history', getUploadHistory);
router.get('/preview/:uploadId', getTransactionPreview);
router.post('/confirm/:uploadId', confirmImport);
router.put('/staging/:id', updateStagingCategory);
router.get('/insights', getAIInsights);
router.get('/export/:uploadId', exportStatementCSV);
router.post('/debug', upload.single('file'), debugStatementUpload);

// Error handler for Multer upload errors
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, message: `File upload limit exceeded: ${err.message}` });
    }
    if (err) {
        return res.status(400).json({ success: false, message: err.message });
    }
    next();
});

export default router;
