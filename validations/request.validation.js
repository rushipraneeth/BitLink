import { z } from 'zod';

export const signUpPostRequestBodySchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
    email: z.string().email('Invalid email address'),
    password: z.string().min(4, 'Password must be at least 4 characters long'),
});

export const loginPostRequestBodySchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const shortenPostRequestBodySchema = z.object({
    url: z.string().url('Please enter a valid URL (including http:// or https://)'),
    code: z
        .string()
        .trim()
        .regex(/^[a-zA-Z0-9_-]{2,60}$/, 'Alias must be between 2 and 60 alphanumeric characters, hyphens, or underscores')
        .optional()
        .or(z.literal('')),
    expiresAt: z
        .string()
        .datetime({ offset: true })
        .optional()
        .or(z.string().datetime({ offset: false }))
        .or(z.literal(''))
        .nullable()
        .optional(),
    password: z.string().optional().or(z.literal('')),
});

export const verifyPasswordRequestBodySchema = z.object({
    password: z.string().min(1, 'Password is required'),
});

export const updateProfileRequestBodySchema = z.object({
    firstName: z.string().min(1, 'First name cannot be empty').optional(),
    lastName: z.string().optional(),
});
