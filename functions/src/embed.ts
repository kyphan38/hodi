import { GoogleGenAI } from '@google/genai';

export const EMBED_MODEL = 'gemini-embedding-2';
/** Must match the vector index in firestore.indexes.json. */
export const EMBED_DIM = 768;
const BATCH = 100;
/** Batches sent at once. */
const PARALLEL = 4;

let client: GoogleGenAI | null = null;
let clientKey = '';

/** One vector per text, same order. */
export async function embedTexts(apiKey: string, texts: string[]): Promise<number[][]> {
  if (!client || clientKey !== apiKey) {
    client = new GoogleGenAI({ apiKey });
    clientKey = apiKey;
  }
  const ai = client;
  const parts: string[][] = [];
  for (let s = 0; s < texts.length; s += BATCH) parts.push(texts.slice(s, s + BATCH));
  const out: number[][] = [];
  for (let p = 0; p < parts.length; p += PARALLEL) {
    const answers = await Promise.all(parts.slice(p, p + PARALLEL).map((part) => embedOne(ai, part)));
    for (const a of answers) out.push(...a);
  }
  return out;
}

async function embedOne(ai: GoogleGenAI, part: string[]): Promise<number[][]> {
  const res = await ai.models.embedContent({
    model: EMBED_MODEL,
    // One Content per text: a plain string list would be merged into one vector.
    contents: part.map((text) => ({ parts: [{ text }] })),
    config: { outputDimensionality: EMBED_DIM, httpOptions: { timeout: 30_000 } },
  });
  const vectors = (res.embeddings ?? []).map((e) => e.values ?? []);
  if (vectors.length !== part.length || vectors.some((v) => v.length !== EMBED_DIM)) {
    throw new Error('Bad embedding answer');
  }
  return vectors;
}
