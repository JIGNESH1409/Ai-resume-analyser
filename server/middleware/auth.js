import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export const protect = (req, res, next) => {
    let token;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Not authorized, invalid or expired token' });
    }
};

/**
 * Middleware factory that restricts access to a specific role.
 * Usage: requireRole('org') or requireRole('user')
 */
export const requireRole = (role) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authorized' });
    }
    // Legacy accounts (no role field) default to 'org'
    const userRole = req.user.role || 'org';
    if (userRole !== role) {
        return res.status(403).json({ error: `Access denied. This endpoint requires the '${role}' role.` });
    }
    next();
};

export default JWT_SECRET;
