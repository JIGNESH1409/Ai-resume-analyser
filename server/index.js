import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import resumeRoutes from './routes/resume.js';
import candidateRoutes from './routes/candidateRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import jobFinderRoutes from './routes/jobFinderRoutes.js';
import authRoutes from './routes/authRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
let MONGO_URI = process.env.MONGO_URI;

const loadMongoMemoryServer = async () => {
    try {
        const module = await import('mongodb-memory-server');
        return module.MongoMemoryServer || module.default?.MongoMemoryServer || module.default || null;
    } catch (err) {
        console.warn('mongodb-memory-server is unavailable, skipping in-memory MongoDB fallback:', err.message);
        return null;
    }
};

// Connect to MongoDB
const connectDB = async () => {
    let connected = false;
    if (MONGO_URI) {
        try {
            console.log('Attempting connection to configured MONGO_URI...');
            await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 4000 });
            console.log('Connected to MongoDB Atlas / Remote Database');
            connected = true;
        } catch (err) {
            console.warn('MongoDB Atlas/Remote connection failed (IP whitelist or network issue). Falling back to local in-memory database:', err.message);
        }
    }

    if (!connected) {
        try {
            const MongoMemoryServer = await loadMongoMemoryServer();
            if (MongoMemoryServer) {
                const mongoServer = await MongoMemoryServer.create();
                const memUri = mongoServer.getUri();
                await mongoose.connect(memUri);
                console.log('Successfully connected to local in-memory MongoDB server!');
                connected = true;
            } else {
                console.error('No MONGO_URI working and in-memory fallback failed.');
            }
        } catch (memErr) {
            console.error('Failed to start MongoMemoryServer:', memErr);
        }
    }
};
connectDB();

// --- Security middleware ---
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true, // reflect request origin if not explicitly configured
    credentials: true,
}));

// General API rate limit
app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
}));

// Tighter limit on the expensive resume-analysis endpoints
const analyzeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many resume analyses from this IP, please try again later.' },
});
app.use('/api/resume/analyze', analyzeLimiter);
app.use('/api/resume/bulk-analyze', analyzeLimiter);

app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/job-finder', jobFinderRoutes);

// Health check
app.get('/', (req, res) => {
    res.send('AI Resume Analyzer API running');
});

// Centralized error handler (catches anything thrown/passed to next())
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Temporary hack to keep the event loop alive
setInterval(() => { }, 1000 * 60 * 60);
