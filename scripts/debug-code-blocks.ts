import fs from 'node:fs';

const content = fs.readFileSync(
  'content/topics/web-development/html-fundamentals/build-a-contact-form.md',
  'utf8',
);

const regex = /```(\w+)\n([\s\S]*?)```/g;
const matches = [...content.matchAll(regex)];

console.log(`Found ${matches.length} code blocks`);

for (let i = 0; i < Math.min(3, matches.length); i++) {
  console.log(
    `\nBlock ${i + 1}: ${matches[i][1]} - ${matches[i][2].length} chars`,
  );
  console.log(`First 50 chars: ${matches[i][2].substring(0, 50)}...`);
}
