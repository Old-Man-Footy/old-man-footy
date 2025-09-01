/**
 * Seed script for HelpContent table
 * Populates initial markdown help content for key pages.
 */
import fs from 'fs/promises';
import path from 'path';
import HelpContent from '../models/HelpContent.mjs';

const HELP_DIR = path.resolve(process.cwd(), 'docs', 'help');

/**
 * Parse markdown file header and content
 * @param {string} fileContent
 * @returns {{ pageIdentifier: string, title: string, content: string }}
 */
export function parseMarkdown(fileContent) {
  const headerMatch = fileContent.match(/---([\s\S]*?)---/);
  if (!headerMatch) throw new Error('Missing header section');
  const header = headerMatch[1].trim();
  const content = fileContent.slice(headerMatch[0].length).trim();
  let pageIdentifier = '', title = '';
  for (const line of header.split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key.trim() === 'pageIdentifier') pageIdentifier = rest.join(':').trim();
    if (key.trim() === 'title') title = rest.join(':').trim();
  }
  if (!pageIdentifier || !title) throw new Error('Header missing pageIdentifier or title');
  return { pageIdentifier, title, content };
}

export async function seedHelpContent() {
  console.log('🔄 Seeding help content from markdown files...');
  const files = await fs.readdir(HELP_DIR);
  let seededCount = 0;
  
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const filePath = path.join(HELP_DIR, file);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const { pageIdentifier, title, content } = parseMarkdown(fileContent);
    await HelpContent.upsert({ pageIdentifier, title, content });
    console.log(`✅ Seeded help content: ${pageIdentifier}`);
    seededCount++;
  }
  
  console.log(`📝 HelpContent table seeded with ${seededCount} markdown help files.`);
}

// Only run directly when executed as a script (not when imported)
if (import.meta.url === `file://${process.argv[1]}` && process.env.NODE_ENV !== 'test') {
  seedHelpContent().catch((err) => {
    console.error('❌ Error seeding help content:', err);
    process.exit(1);
  });
}
