import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const TOKEN_EXPIRY = '7d';

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, name: user.name, email: user.email, role: user.role || 'org' },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
};

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, companyName } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are all required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        const validRoles = ['user', 'org'];
        const assignedRole = validRoles.includes(role) ? role : 'org';

        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }

        const user = new User({
            name,
            email,
            password,
            role: assignedRole,
            companyName: assignedRole === 'org' ? (companyName || '') : ''
        });
        await user.save();

        const token = generateToken(user);
        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, companyName: user.companyName }
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: error.message || 'Failed to register user' });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = generateToken(user);
        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role || 'org', companyName: user.companyName || '' }
        });
    } catch (error) {
        console.error('Error logging in user:', error);
        res.status(500).json({ error: error.message || 'Failed to log in' });
    }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

export default router;
