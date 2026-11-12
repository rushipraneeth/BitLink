import { validateUserToken } from '../utils/token.js';

export function authenticationMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return next();
    }

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(400).json({
            error: 'Authorization header must start with Bearer'
        });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: 'Token is missing'
        });
    }

    const payload = validateUserToken(token);

    if (!payload) {
        return res.status(401).json({
            error: 'Invalid or expired token'
        });
    }

    req.user = payload;

    next();
}

export function ensureAuthenticated(req, res, next) {
    if (!req.user || !req.user.id) {
        return res.status(401).json({
            error: 'You must be logged in to access the resource'
        });
    }

    next();
}