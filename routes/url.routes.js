import express from 'express';
import { shortenPostRequestBodySchema, verifyPasswordRequestBodySchema } from '../validations/request.validation.js';
import db from '../db/index.js';
import { urlsTable } from '../models/index.js';
import { nanoid } from 'nanoid';
import { ensureAuthenticated } from '../middlewares/auth.middleware.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import QRCode from 'qrcode';
import { hashPasswordWithSalt, verifyPassword } from '../utils/hash.js';
import { renderPasswordPage, renderExpiredPage, renderNotFoundPage } from '../utils/pages.js';

const router = express.Router();

const RESERVED_ALIASES = new Set([
    'api', 'user', 'shorten', 'codes', 'links', 'analytics', 'dashboard',
    'settings', 'verify', 'expired', 'qr', 'favicon.ico', 'assets',
    'static', 'index.html', 'login', 'signup', 'logout', 'app', 'health'
]);

function buildShortUrl(req, code) {
    const host = req.get('host') || 'localhost:8000';
    return `${req.protocol}://${host}/${code}`;
}

// 1. Create a shortened URL
router.post('/shorten', ensureAuthenticated, async (req, res) => {
    try {
        const validationResult = await shortenPostRequestBodySchema.safeParseAsync(req.body);

        if (validationResult.error) {
            const firstIssue = validationResult.error.issues?.[0];
            return res.status(400).json({
                error: firstIssue ? firstIssue.message : 'Invalid request payload',
                details: validationResult.error.format()
            });
        }

        const { url, code, expiresAt, password } = validationResult.data;

        let shortCode = (code || '').trim();

        if (shortCode) {
            if (RESERVED_ALIASES.has(shortCode.toLowerCase())) {
                return res.status(400).json({
                    error: `The alias "${shortCode}" is reserved by the system. Please pick a different alias.`
                });
            }

            const [existing] = await db
                .select({ id: urlsTable.id })
                .from(urlsTable)
                .where(eq(urlsTable.shortCode, shortCode));

            if (existing) {
                return res.status(409).json({
                    error: `The alias "${shortCode}" is already taken. Please choose another one.`
                });
            }
        } else {
            // Generate random alias and ensure uniqueness
            let attempts = 0;
            while (attempts < 5) {
                const candidate = nanoid(6);
                const [existing] = await db
                    .select({ id: urlsTable.id })
                    .from(urlsTable)
                    .where(eq(urlsTable.shortCode, candidate));
                if (!existing && !RESERVED_ALIASES.has(candidate.toLowerCase())) {
                    shortCode = candidate;
                    break;
                }
                attempts++;
            }
            if (!shortCode) {
                shortCode = nanoid(8);
            }
        }

        let parsedExpiresAt = null;
        if (expiresAt) {
            const dateObj = new Date(expiresAt);
            if (isNaN(dateObj.getTime())) {
                return res.status(400).json({ error: 'Invalid expiration date format.' });
            }
            if (dateObj.getTime() <= Date.now()) {
                return res.status(400).json({ error: 'Expiration date and time must be set in the future.' });
            }
            parsedExpiresAt = dateObj;
        }

        let hashedPassword = null;
        let passwordSalt = null;
        if (password && password.trim().length > 0) {
            const hashResult = hashPasswordWithSalt(password.trim());
            hashedPassword = hashResult.password;
            passwordSalt = hashResult.salt;
        }

        const [result] = await db.insert(urlsTable).values({
            shortCode,
            targetURL: url,
            userId: req.user.id,
            clicks: 0,
            expiresAt: parsedExpiresAt,
            password: hashedPassword,
            passwordSalt: passwordSalt,
        }).returning({
            id: urlsTable.id,
            shortCode: urlsTable.shortCode,
            targetURL: urlsTable.targetURL,
            clicks: urlsTable.clicks,
            expiresAt: urlsTable.expiresAt,
            createdAt: urlsTable.createdAt,
        });

        const shortUrl = buildShortUrl(req, result.shortCode);
        const qrCodeDataUrl = await QRCode.toDataURL(shortUrl, {
            width: 400,
            margin: 2,
            color: {
                dark: '#09090b',
                light: '#ffffff'
            }
        });

        return res.status(201).json({
            id: result.id,
            shortCode: result.shortCode,
            shortUrl,
            targetURL: result.targetURL,
            clicks: result.clicks,
            expiresAt: result.expiresAt,
            isPasswordProtected: Boolean(hashedPassword),
            qrCode: qrCodeDataUrl,
            createdAt: result.createdAt
        });
    } catch (err) {
        console.error('Error in /shorten:', err);
        return res.status(500).json({ error: 'Failed to create shortened URL. Please try again.' });
    }
});

// 2. Get all shortened URLs for the logged-in user
router.get(['/codes', '/links', '/api/links', '/api/codes'], ensureAuthenticated, async (req, res) => {
    try {
        const rows = await db
            .select({
                id: urlsTable.id,
                shortCode: urlsTable.shortCode,
                targetURL: urlsTable.targetURL,
                clicks: urlsTable.clicks,
                expiresAt: urlsTable.expiresAt,
                password: urlsTable.password,
                createdAt: urlsTable.createdAt,
                updatedAt: urlsTable.updatedAt
            })
            .from(urlsTable)
            .where(eq(urlsTable.userId, req.user.id))
            .orderBy(desc(urlsTable.createdAt));

        const now = Date.now();
        const codes = rows.map(r => ({
            id: r.id,
            shortCode: r.shortCode,
            shortUrl: buildShortUrl(req, r.shortCode),
            targetURL: r.targetURL,
            clicks: r.clicks || 0,
            expiresAt: r.expiresAt,
            isPasswordProtected: Boolean(r.password),
            isExpired: r.expiresAt ? new Date(r.expiresAt).getTime() <= now : false,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt
        }));

        return res.json({ codes });
    } catch (err) {
        console.error('Error fetching user codes:', err);
        return res.status(500).json({ error: 'Failed to retrieve links.' });
    }
});

// 3. Simple Analytics endpoint
router.get(['/analytics', '/api/analytics'], ensureAuthenticated, async (req, res) => {
    try {
        const rows = await db
            .select({
                id: urlsTable.id,
                shortCode: urlsTable.shortCode,
                targetURL: urlsTable.targetURL,
                clicks: urlsTable.clicks,
                expiresAt: urlsTable.expiresAt,
                password: urlsTable.password,
                createdAt: urlsTable.createdAt
            })
            .from(urlsTable)
            .where(eq(urlsTable.userId, req.user.id))
            .orderBy(desc(urlsTable.clicks));

        const now = Date.now();
        const totalLinks = rows.length;
        const totalClicks = rows.reduce((acc, row) => acc + (row.clicks || 0), 0);
        const expiredLinks = rows.filter(r => r.expiresAt && new Date(r.expiresAt).getTime() <= now).length;
        const activeLinks = totalLinks - expiredLinks;

        const formattedRows = rows.map(r => ({
            id: r.id,
            shortCode: r.shortCode,
            shortUrl: buildShortUrl(req, r.shortCode),
            targetURL: r.targetURL,
            clicks: r.clicks || 0,
            expiresAt: r.expiresAt,
            isPasswordProtected: Boolean(r.password),
            isExpired: r.expiresAt ? new Date(r.expiresAt).getTime() <= now : false,
            createdAt: r.createdAt
        }));

        const topLinks = formattedRows.slice(0, 10);
        const recentLinks = [...formattedRows]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);

        return res.json({
            totalLinks,
            totalClicks,
            activeLinks,
            expiredLinks,
            topLinks,
            recentLinks,
            links: formattedRows
        });
    } catch (err) {
        console.error('Error in /analytics:', err);
        return res.status(500).json({ error: 'Failed to retrieve analytics.' });
    }
});

// 4. Delete shortened URL
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        const id = req.params.id;
        await db.delete(urlsTable).where(and(eq(urlsTable.id, id), eq(urlsTable.userId, req.user.id)));
        return res.status(200).json({ deleted: true });
    } catch (err) {
        console.error('Error deleting link:', err);
        return res.status(500).json({ error: 'Failed to delete link.' });
    }
});

// 5. QR Code endpoint (PNG image stream or JSON)
router.get('/qr/:shortCode', async (req, res) => {
    try {
        const code = req.params.shortCode;
        const [result] = await db
            .select({ id: urlsTable.id, shortCode: urlsTable.shortCode })
            .from(urlsTable)
            .where(eq(urlsTable.shortCode, code));

        if (!result) {
            return res.status(404).json({ error: 'Link not found' });
        }

        const shortUrl = buildShortUrl(req, result.shortCode);

        if (req.query.format === 'json') {
            const qrDataUrl = await QRCode.toDataURL(shortUrl, {
                width: 400,
                margin: 2,
                color: { dark: '#09090b', light: '#ffffff' }
            });
            return res.json({ shortCode: result.shortCode, shortUrl, qrCode: qrDataUrl });
        }

        const pngBuffer = await QRCode.toBuffer(shortUrl, {
            type: 'png',
            width: 400,
            margin: 2,
            color: { dark: '#09090b', light: '#ffffff' }
        });

        res.setHeader('Content-Type', 'image/png');
        if (req.query.download === '1' || req.query.download === 'true') {
            res.setHeader('Content-Disposition', `attachment; filename="qrcode-${result.shortCode}.png"`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename="qrcode-${result.shortCode}.png"`);
        }
        return res.send(pngBuffer);
    } catch (err) {
        console.error('Error generating QR code:', err);
        return res.status(500).json({ error: 'Failed to generate QR code.' });
    }
});

// 6. Password Verification Action (POST)
router.post('/verify/:shortCode', async (req, res) => {
    try {
        const code = req.params.shortCode;
        const validation = await verifyPasswordRequestBodySchema.safeParseAsync(req.body);

        if (validation.error) {
            return res.status(400).json({ error: 'Password is required.' });
        }

        const { password } = validation.data;

        const [urlRecord] = await db
            .select()
            .from(urlsTable)
            .where(eq(urlsTable.shortCode, code));

        if (!urlRecord) {
            return res.status(404).json({ error: 'Link not found.' });
        }

        if (urlRecord.expiresAt && new Date(urlRecord.expiresAt).getTime() <= Date.now()) {
            return res.status(410).json({ error: 'This link has expired.', expired: true });
        }

        if (!urlRecord.password) {
            // No password actually required, increment and return
            await db
                .update(urlsTable)
                .set({ clicks: sql`${urlsTable.clicks} + 1` })
                .where(eq(urlsTable.id, urlRecord.id));
            return res.json({ success: true, targetURL: urlRecord.targetURL });
        }

        const isValid = verifyPassword(password, urlRecord.passwordSalt, urlRecord.password);

        if (!isValid) {
            return res.status(401).json({ error: 'Incorrect password. Please try again.' });
        }

        // Increment click count atomically upon successful verification
        await db
            .update(urlsTable)
            .set({ clicks: sql`${urlsTable.clicks} + 1` })
            .where(eq(urlsTable.id, urlRecord.id));

        return res.json({ success: true, targetURL: urlRecord.targetURL });
    } catch (err) {
        console.error('Error in /verify:', err);
        return res.status(500).json({ error: 'Server error during password verification.' });
    }
});

// 7. Render Password Verification Page (GET)
router.get('/verify/:shortCode', async (req, res) => {
    try {
        const code = req.params.shortCode;
        const [urlRecord] = await db
            .select({
                shortCode: urlsTable.shortCode,
                expiresAt: urlsTable.expiresAt,
                password: urlsTable.password
            })
            .from(urlsTable)
            .where(eq(urlsTable.shortCode, code));

        if (!urlRecord) {
            return res.status(404).send(renderNotFoundPage(code));
        }

        if (urlRecord.expiresAt && new Date(urlRecord.expiresAt).getTime() <= Date.now()) {
            return res.status(410).send(renderExpiredPage(code, buildShortUrl(req, code)));
        }

        if (!urlRecord.password) {
            // Not password protected, redirect to the short link
            return res.redirect(`/${code}`);
        }

        return res.send(renderPasswordPage(code, buildShortUrl(req, code)));
    } catch (err) {
        console.error('Error rendering verify page:', err);
        return res.status(500).send('Internal server error');
    }
});

// 8. Render Expired Link Page (GET)
router.get('/expired/:shortCode', (req, res) => {
    const code = req.params.shortCode;
    return res.status(410).send(renderExpiredPage(code, buildShortUrl(req, code)));
});

// 9. Redirect Shortened URL (GET /:shortCode)
router.get('/:shortCode', async (req, res) => {
    try {
        const code = req.params.shortCode;

        if (RESERVED_ALIASES.has(code.toLowerCase())) {
            return res.status(404).send(renderNotFoundPage(code));
        }

        const [urlRecord] = await db
            .select()
            .from(urlsTable)
            .where(eq(urlsTable.shortCode, code));

        if (!urlRecord) {
            if (req.accepts('html')) {
                return res.status(404).send(renderNotFoundPage(code));
            }
            return res.status(404).json({ error: 'Invalid URL' });
        }

        const fullShortUrl = buildShortUrl(req, code);

        // Check if expired
        if (urlRecord.expiresAt && new Date(urlRecord.expiresAt).getTime() <= Date.now()) {
            if (req.accepts('html')) {
                return res.status(410).send(renderExpiredPage(code, fullShortUrl));
            }
            return res.status(410).json({ error: 'This link has expired', expired: true });
        }

        // Check if password protected
        if (urlRecord.password) {
            if (req.accepts('html')) {
                return res.send(renderPasswordPage(code, fullShortUrl));
            }
            return res.status(403).json({ requiresPassword: true, shortCode: urlRecord.shortCode });
        }

        // Increment click count
        await db
            .update(urlsTable)
            .set({ clicks: sql`${urlsTable.clicks} + 1` })
            .where(eq(urlsTable.id, urlRecord.id));

        if (req.accepts('html')) {
            return res.redirect(urlRecord.targetURL);
        }
        return res.json({ targetURL: urlRecord.targetURL });
    } catch (err) {
        console.error('Error resolving short URL:', err);
        return res.status(500).json({ error: 'Failed to process request.' });
    }
});

export default router;
