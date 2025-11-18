import fs from 'node:fs';
import path from 'node:path';

// Function to extract code from markdown code blocks
function extractCode(markdown: string): string {
  const codeMatch = markdown.match(/```[\w]*\n([\s\S]*?)```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }
  return markdown.trim();
}

// Function to detect language from code block
function detectLanguage(codeBlock: string): 'html' | 'css' | 'javascript' {
  const langMatch = codeBlock.match(/```(\w+)/);
  if (langMatch) {
    const lang = langMatch[1].toLowerCase();
    if (lang === 'html') return 'html';
    if (lang === 'css') return 'css';
    if (lang === 'javascript' || lang === 'js') return 'javascript';
  }

  // Fallback detection
  if (codeBlock.includes('<!DOCTYPE') || codeBlock.includes('<html'))
    return 'html';
  if (
    codeBlock.includes('{') &&
    (codeBlock.includes('color:') || codeBlock.includes('font-'))
  )
    return 'css';
  return 'javascript';
}

// Function to generate playground URL
function generatePlaygroundUrl(
  code: string,
  language: string,
  lessonId?: string,
): string {
  const params = new URLSearchParams({
    language,
    code: encodeURIComponent(code),
  });

  if (lessonId) {
    params.append('lessonId', lessonId);
  }

  return `/playground?${params.toString()}`;
}

// Function to process a markdown file
function processMarkdownFile(filePath: string): void {
  console.log(`\nProcessing: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Extract lesson ID from frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  let lessonId: string | undefined;
  if (frontmatterMatch) {
    const idMatch = frontmatterMatch[1].match(/^id:\s*(.+)$/m);
    if (idMatch) {
      lessonId = idMatch[1].trim();
    }
  }

  let changeCount = 0;

  // Pattern: Code blocks followed by Try it Yourself or Submit Answer links
  // This captures: ```lang\ncode```\n\n**[Link Text »](URL)** with optional text between
  const pattern =
    /```(\w+)\n([\s\S]*?)```\n\n(.*?)\*\*\[(Try it Yourself|Submit Answer) »\]\([^)]*\)\*\*/g;

  content = content.replace(
    pattern,
    (fullMatch, lang, code, betweenText, linkText) => {
      const cleanCode = code.trim();
      const language =
        lang.toLowerCase() === 'html'
          ? 'html'
          : lang.toLowerCase() === 'css'
            ? 'css'
            : 'javascript';

      const url = generatePlaygroundUrl(cleanCode, language, lessonId);
      changeCount++;

      console.log(`  ✓ Fixed "${linkText}" link for ${language} code`);

      return `\`\`\`${lang}\n${code}\`\`\`\n\n${betweenText}**[${linkText} »](${url})**`;
    },
  );

  // Fix URLs that have extra angle brackets: ](<URL>)
  if (content.includes('](<')) {
    content = content.replace(/\]\(<([^>]+)>\)/g, ']($1)');
    console.log('  ✓ Removed angle brackets from URLs');
  }

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ✅ Saved ${changeCount} changes`);
  } else {
    console.log(`  ⏭️  No changes needed`);
  }
}

// Walk directory recursively
function walkDir(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (file.endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

// Main execution
const contentDir = path.join(process.cwd(), 'content', 'topics');
console.log('🔧 Fixing playground links in all markdown files...\n');

const mdFiles = walkDir(contentDir);
console.log(`Found ${mdFiles.length} markdown files\n`);

for (const file of mdFiles) {
  processMarkdownFile(file);
}

console.log('\n✨ Done! All playground links have been fixed.');
