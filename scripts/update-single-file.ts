import fs from 'node:fs';

// Read a specific file and update all playground links
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node update-single-file.ts <filepath>');
  process.exit(1);
}

const content = fs.readFileSync(filePath, 'utf8');

// Extract lesson ID
const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
let lessonId: string | undefined;
if (frontmatterMatch) {
  const idMatch = frontmatterMatch[1].match(/^id:\s*(.+)$/m);
  if (idMatch) {
    lessonId = idMatch[1].trim();
  }
}

console.log(`Lesson ID: ${lessonId || 'none'}`);

// Find all code blocks (handle both \n and \r\n line endings)
const codeBlocks: Array<{
  code: string;
  lang: string;
  start: number;
  end: number;
}> = [];
const codeBlockRegex = /```(\w+)\r?\n([\s\S]*?)```/g;
let codeMatch = codeBlockRegex.exec(content);

while (codeMatch !== null) {
  codeBlocks.push({
    code: codeMatch[2].trim(),
    lang: codeMatch[1],
    start: codeMatch.index,
    end: codeMatch.index + codeMatch[0].length,
  });
  codeMatch = codeBlockRegex.exec(content);
}

console.log(`Found ${codeBlocks.length} code blocks`);

// Now find all playground links and match them to nearest preceding code block
const linkRegex =
  /\*\*\[(Try it Yourself|Submit Answer) »\]\(\/playground[^)]*\)\*\*/g;
let newContent = content;
let offset = 0;

let linkMatch = linkRegex.exec(content);
while (linkMatch !== null) {
  const linkStart = linkMatch.index;
  const linkEnd = linkStart + linkMatch[0].length;

  // Find the closest code block before this link
  const closestBlock = codeBlocks
    .filter((block) => block.end < linkStart && linkStart - block.end < 200)
    .sort((a, b) => b.end - a.end)[0];

  if (closestBlock) {
    const language =
      closestBlock.lang.toLowerCase() === 'html'
        ? 'html'
        : closestBlock.lang.toLowerCase() === 'css'
          ? 'css'
          : 'javascript';

    const params = new URLSearchParams({
      language,
      code: closestBlock.code,
    });

    if (lessonId) {
      params.append('lessonId', lessonId);
    }

    const newUrl = `/playground?${params.toString()}`;
    const newLink = `**[${linkMatch[1]} »](${newUrl})**`;

    const adjustedStart = linkStart + offset;
    const adjustedEnd = linkEnd + offset;

    newContent =
      newContent.substring(0, adjustedStart) +
      newLink +
      newContent.substring(adjustedEnd);
    offset += newLink.length - linkMatch[0].length;

    console.log(`✓ Updated ${linkMatch[1]} link for ${language} code`);
  }

  linkMatch = linkRegex.exec(content);
}

fs.writeFileSync(filePath, newContent, 'utf8');
console.log(`\n✅ File updated: ${filePath}`);
