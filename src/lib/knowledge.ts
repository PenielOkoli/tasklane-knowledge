import { z } from 'zod';
export const questionSchema = z.object({ question: z.string().trim().min(3).max(600), sources: z.array(z.string().max(40)).min(1).max(8), consent: z.boolean() }).strict();
export type Source = { id: string; title: string; category: string; updated: string; description: string };
export type Passage = { id: string; sourceId: string; heading: string; text: string };
export type Evidence = Passage & { title: string; coverage: number };
export type Answer = { status: 'answered' | 'limited' | 'no_result' | 'unavailable'; mode: 'ai' | 'retrieval'; claims: { text: string; citations: string[] }[]; evidence: Evidence[]; limitation: string; confidence: 'moderate' | 'low' | 'none'; steps: string[] };
const stop = new Set('a an the is are was were be to for of in on and or with do does did what when how who our we should can i me about please tell say project'.split(' '));
export function tokens(text: string) { return [...new Set((text.toLowerCase().match(/[a-z0-9]+/g) || []).filter(t => t.length > 2 && !stop.has(t)).map(t => t.replace(/s$/, '')))]; }
export function retrieve(question: string, selected: string[], sources: Source[], passages: Passage[]): Evidence[] {
  const terms = tokens(question);
  if (!terms.length) return [];
  return passages.filter(p => selected.includes(p.sourceId)).map(p => {
    const source = sources.find(s => s.id === p.sourceId)!;
    const words = new Set(tokens(p.heading + ' ' + p.text));
    const coverage = terms.filter(t => words.has(t)).length / terms.length;
    return { ...p, title: source.title, coverage };
  }).filter(p => p.coverage >= .25).sort((a,b) => b.coverage-a.coverage || a.id.localeCompare(b.id)).slice(0,4);
}
export const generatedSchema = z.object({ sufficient: z.boolean(), claims: z.array(z.object({ text: z.string().min(1).max(700), citations: z.array(z.string()).min(1).max(4) })).max(5), limitation: z.string().max(800) });
export function validateClaims(value: z.infer<typeof generatedSchema>, evidence: Evidence[]) {
  return value.claims.length > 0 && value.claims.every(c => c.citations.length > 0 && c.citations.every(id => evidence.some(e => e.id === id)));
}

