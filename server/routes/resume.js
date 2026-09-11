import express from 'express';
import multer from 'multer';
import { analyzeResume, tailorResume, createCoverLetter, bulkAnalyzeResumes } from '../controllers/resumeController.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per file
    fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf'];
        if (!allowed.includes(file.mimetype)) {
            return cb(new Error('Only PDF resumes are supported.'));
        }
        cb(null, true);
    },
});

// Wrap multer so its errors (file too large / wrong type) return clean JSON, not a stack trace
const handleUpload = (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'File upload failed' });
        }
        next();
    });
};

const handleBulkUpload = (req, res, next) => {
    upload.array('resumes', 100)(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Bulk file upload failed' });
        }
        next();
    });
};

router.post('/analyze', protect, handleUpload, analyzeResume);
router.post('/tailor', protect, tailorResume);
router.post('/cover-letter', protect, createCoverLetter);

// Bulk analyze — org only, up to 100 PDFs
router.post('/bulk-analyze', protect, requireRole('org'), handleBulkUpload, bulkAnalyzeResumes);

export default router;
