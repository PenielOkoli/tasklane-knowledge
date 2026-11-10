import type { Metadata } from 'next';
import '@fontsource-variable/dm-sans';
import './globals.css';
export const metadata: Metadata = { title: 'Tasklane Knowledge — Answers with evidence.', description: 'Your project knowledge, grounded in selected documents with inspectable citations and honest limitations.' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }

