import jwt from 'jsonwebtoken';
import { userTokenSchema } from '../validations/token.validation.js';

const JWT_SECRET = process.env.JWT_SECRET;

export function createUserToken(payload) {
    const validationResult = userTokenSchema.safeParse(payload);

    if (validationResult.error) {
        throw new Error(validationResult.error.message);
    }

    const payloadValidated = validationResult.data;

    return jwt.sign(payloadValidated, JWT_SECRET);
}

export function validateUserToken(token) {
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        
        return payload;
    } catch (error) {
        
        return null;
    }
}