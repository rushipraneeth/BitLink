import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import userRouter from './routes/user.routes.js';
import { authenticationMiddleware } from './middlewares/auth.middleware.js';
import urlRouter from './routes/url.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ?? 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware to populate req.user from Bearer token
app.use(authenticationMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
    return res.json({ status: 'Server is up and running...', timestamp: new Date().toISOString() });
});

// User authentication and profile routes
app.use('/user', userRouter);

// SPA client routes - serve index.html for dashboard navigation when requested by a browser
const frontendRoutes = ['/', '/dashboard', '/links', '/analytics', '/settings'];
frontendRoutes.forEach(route => {
    app.get(route, (req, res, next) => {
        const accept = req.headers['accept'] || '';
        const isApi = Boolean(req.headers['authorization']) || accept.includes('application/json');
        if (!isApi && (accept.includes('text/html') || route === '/')) {
            const indexPath = path.join(__dirname, 'public', 'index.html');
            return res.sendFile(indexPath, (err) => {
                if (err) next();
            });
        }
        next();
    });
});

// URL shortening and redirection routes
app.use(urlRouter);

app.listen(PORT, () => {
    console.log(`Server is running on PORT ${PORT}`);
});

export default app;
