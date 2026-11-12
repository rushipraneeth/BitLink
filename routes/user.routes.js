import express from 'express';
import db from '../db/index.js';
import { usersTable } from '../models/user.model.js';
import {
    signUpPostRequestBodySchema,
    loginPostRequestBodySchema,
    updateProfileRequestBodySchema
} from '../validations/request.validation.js';

import { hashPasswordWithSalt, verifyPassword } from '../utils/hash.js';
import { getUserByEmail } from '../services/user.service.js';
import { createUserToken } from '../utils/token.js';
import { ensureAuthenticated } from '../middlewares/auth.middleware.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

router.post('/signup', async (req, res) => {
    const validationResult = await signUpPostRequestBodySchema.safeParseAsync(req.body);

    if (validationResult.error) {
        const issues = validationResult.error.issues;
        const message = issues.length > 0 ? issues[0].message : 'Invalid request data';
        return res.status(400).json({
            error: message,
            details: validationResult.error.format()
        });
    }

    const { firstName, lastName, email, password } = validationResult.data;

    const existingUser = await getUserByEmail(email);

    if (existingUser) {
        return res.status(409).json({
            error: `User with email "${email}" already exists`
        });
    }

    const { salt, password: hashedPassword } = hashPasswordWithSalt(password);

    const [user] = await db.insert(usersTable).values({
        email,
        firstName,
        lastName: lastName || null,
        salt,
        password: hashedPassword
    }).returning({
        id: usersTable.id,
        firstName: usersTable.firstName,
        lastName: usersTable.lastName,
        email: usersTable.email,
        createdAt: usersTable.createdAt
    });

    const token = createUserToken({ id: user.id });

    return res.status(201).json({
        data: {
            userId: user.id
        },
        token,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        }
    });
});

router.post('/login', async (req, res) => {
    const validationResult = await loginPostRequestBodySchema.safeParseAsync(req.body);

    if (validationResult.error) {
        const issues = validationResult.error.issues;
        const message = issues.length > 0 ? issues[0].message : 'Invalid login credentials';
        return res.status(400).json({
            error: message,
            details: validationResult.error.format()
        });
    }

    const { email, password } = validationResult.data;

    const user = await getUserByEmail(email);

    if (!user) {
        return res.status(404).json({
            error: `User with ${email} doesn't exist`
        });
    }

    const isPasswordValid = verifyPassword(password, user.salt, user.password);

    if (!isPasswordValid) {
        return res.status(400).json({
            error: 'Invalid password'
        });
    }

    const token = createUserToken({ id: user.id });

    return res.status(200).json({
        token,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
        }
    });
});

router.get('/me', ensureAuthenticated, async (req, res) => {
    try {
        const [user] = await db
            .select({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                email: usersTable.email,
                createdAt: usersTable.createdAt
            })
            .from(usersTable)
            .where(eq(usersTable.id, req.user.id));

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({ user });
    } catch (err) {
        console.error('Error fetching user profile:', err);
        return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

router.patch('/me', ensureAuthenticated, async (req, res) => {
    try {
        const validationResult = await updateProfileRequestBodySchema.safeParseAsync(req.body);
        if (validationResult.error) {
            return res.status(400).json({ error: validationResult.error.issues[0]?.message || 'Invalid input' });
        }

        const updates = {};
        if (validationResult.data.firstName !== undefined) {
            updates.firstName = validationResult.data.firstName;
        }
        if (validationResult.data.lastName !== undefined) {
            updates.lastName = validationResult.data.lastName;
        }

        const [updatedUser] = await db
            .update(usersTable)
            .set(updates)
            .where(eq(usersTable.id, req.user.id))
            .returning({
                id: usersTable.id,
                firstName: usersTable.firstName,
                lastName: usersTable.lastName,
                email: usersTable.email
            });

        return res.json({ user: updatedUser });
    } catch (err) {
        console.error('Error updating user profile:', err);
        return res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
