import { put, get, del } from '@vercel/blob';
export const bucket = {
  async put(key: string, body: ReadableStream | ArrayBuffer | Uint8Array | string, options?: { httpMetadata?: { contentType?: string } }) {
    const data = body instanceof ArrayBuffer ? Buffer.from(body) : body instanceof Uint8Array ? Buffer.from(body) : body;
    return put(key, data, { access: 'private', addRandomSuffix: false, allowOverwrite: true,
      contentType: options?.httpMetadata?.contentType || 'application/octet-stream' });
  },
  async get(key: string) {
    const object = await get(key, { access: 'private', useCache: false });
    if (!object || object.statusCode !== 200) return null;
    return { body: object.stream, arrayBuffer: () => new Response(object.stream).arrayBuffer() };
  },
  async delete(key: string) { await del(key); },
};
