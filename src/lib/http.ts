import { ActionError } from './engine';
export async function readJSON(request: Request): Promise<unknown> {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new ActionError(403, 'Only same-origin workspace requests are allowed.');
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ActionError(415, 'Send JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new ActionError(400, 'Empty request.');
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 12000) { await reader.cancel(); throw new ActionError(413, 'The request is too large.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ActionError(400, 'Malformed JSON.'); }
}
