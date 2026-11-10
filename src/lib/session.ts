import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { deflateSync, inflateSync } from 'node:zlib';
import { sessionSchema, type Session } from './contracts';
import { ActionError } from './engine';

export const COOKIE = 'tasklane_session';
function key(secret = process.env.SESSION_SECRET) {
  if (!secret || secret.length < 32) throw new ActionError(503, 'The workspace is not configured yet. A server session key is required.');
  return createHash('sha256').update(secret).digest();
}
export function encodeSession(session: Session, secret?: string) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(secret), nonce);
  const compressed = deflateSync(Buffer.from(JSON.stringify(sessionSchema.parse(session))));
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  const value = Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64url');
  if (value.length > 3700) throw new ActionError(409, 'This workspace has reached its storage limit. Shorten task descriptions or reset the demo.');
  return value;
}
export function decodeSession(value: string, secret?: string, now = Date.now()): Session {
  const secretKey = key(secret);
  try {
    if (value.length > 3700) throw new Error('Oversized cookie');
    const bytes = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', secretKey, bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const plain = Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]);
    const session = sessionSchema.parse(JSON.parse(inflateSync(plain, { maxOutputLength: 24000 }).toString('utf8')));
    if (session.expiresAt <= now) throw new Error('Expired');
    return session;
  } catch { throw new ActionError(401, 'Your workspace session expired or could not be verified. Reset the demo to start a new one.'); }
}
export function sessionFromRequest(request: Request): Session | null {
  const value = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  return value ? decodeSession(value) : null;
}
export function sessionCookie(session: Session) { return `${COOKIE}=${encodeSession(session)}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`; }
