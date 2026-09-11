import express from 'express';
import Candidate from '../models/Candidate.js';
import { protect, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All candidate routes require authentication and are scoped to req.user.id
router.use(protect);

router.get('/', async (req, res) => {
    try {
        const candidates = await Candidate.find({ userId: req.user.id }).sort({ uploadedAt: -1 });
        res.json(candidates);
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ error: 'Failed to fetch candidates' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ _id: req.params.id, userId: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        res.json(candidate);
    } catch (error) {
        console.error('Error fetching candidate:', error);
        res.status(500).json({ error: 'Failed to fetch candidate' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const candidate = await Candidate.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        res.json({ message: 'Candidate deleted successfully' });
    } catch (error) {
        console.error('Error deleting candidate:', error);
        res.status(500).json({ error: 'Failed to delete candidate' });
    }
});

export default router;
