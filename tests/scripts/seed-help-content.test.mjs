
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Move mock declarations to the very top for ESM hoisting
vi.mock('../../models/HelpContent.mjs', () => ({ default: { upsert: vi.fn() } }));
import fs from 'fs/promises';
import path from 'path';
import * as seedScript from '../../scripts/seed-help-content.mjs';

const HELP_DIR = path.resolve(process.cwd(), 'docs', 'help');

// Helper: create a temp markdown file
async function createTempMarkdown(name, header, body) {
  const filePath = path.join(HELP_DIR, name);
  await fs.writeFile(filePath, `${header}\n${body}`);
  return filePath;
}


import HelpContent from '../../models/HelpContent.mjs';

describe('seed-help-content', () => {
  beforeEach(() => {
    HelpContent.upsert.mockClear();
  });

  it('parses markdown header and content correctly', () => {
    const md = `---\npageIdentifier: test-page\ntitle: Test Title\n---\n\n## Overview\nTest content.`;
    const result = seedScript.parseMarkdown(md);
    expect(result.pageIdentifier).toBe('test-page');
    expect(result.title).toBe('Test Title');
    expect(result.content).toContain('## Overview');
  });

  it('throws error if header is missing', () => {
    const md = 'No header here.';
    expect(() => seedScript.parseMarkdown(md)).toThrow();
  });

  it('throws error if pageIdentifier or title missing', () => {
    const md = `---\ntitle: Only Title\n---\nContent.`;
    expect(() => seedScript.parseMarkdown(md)).toThrow();
  });

  it('calls upsert for each markdown file', async () => {
    // Create two temp markdown files
    const header1 = '---\npageIdentifier: test1\ntitle: Title1\n---';
    const header2 = '---\npageIdentifier: test2\ntitle: Title2\n---';
    const body = '\n## Overview\nContent.';
    const file1 = await createTempMarkdown('test1.md', header1, body);
    const file2 = await createTempMarkdown('test2.md', header2, body);
    await seedScript.seedHelpContent();
    expect(HelpContent.upsert).toHaveBeenCalledWith({ pageIdentifier: 'test1', title: 'Title1', content: expect.stringContaining('## Overview') });
    expect(HelpContent.upsert).toHaveBeenCalledWith({ pageIdentifier: 'test2', title: 'Title2', content: expect.stringContaining('## Overview') });
    // Cleanup
    await fs.unlink(file1);
    await fs.unlink(file2);
  });
});
