import { randomBytes, createHmac, timingSafeEqual } from 'crypto';

export function hashPasswordWithSalt(password, userSalt = undefined) {
    const salt = userSalt ?? randomBytes(256).toString('hex');
    const hashedPassword = createHmac('sha256', salt).update(password).digest('hex');

    return { salt, password: hashedPassword };
}

export function verifyPassword(providedPassword, salt, expectedHashedPassword) {
    if (!providedPassword || !salt || !expectedHashedPassword) {
        return false;
    }
    const { password: hashedPassword } = hashPasswordWithSalt(providedPassword, salt);
    const hashBuf = Buffer.from(hashedPassword, 'utf8');
    const expectedBuf = Buffer.from(expectedHashedPassword, 'utf8');
    if (hashBuf.length !== expectedBuf.length) {
        return false;
    }
    return timingSafeEqual(hashBuf, expectedBuf);
}
