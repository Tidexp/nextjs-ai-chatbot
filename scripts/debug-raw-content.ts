import fs from 'node:fs';

const content = fs.readFileSync(
  'content/topics/web-development/html-fundamentals/build-a-contact-form.md',
  'utf8',
);

// Find the first occurrence of triple backticks
const idx = content.indexOf('```');
if (idx >= 0) {
  console.log(`Found triple backticks at position ${idx}`);
  console.log('Context (20 chars before and 100 after):');
  console.log(content.substring(Math.max(0, idx - 20), idx + 100));
  console.log('\nChar codes around the backticks:');
  for (let i = idx; i < idx + 10; i++) {
    console.log(`  [${i}] = '${content[i]}' (code: ${content.charCodeAt(i)})`);
  }
} else {
  console.log('No triple backticks found');
  console.log('First 500 chars:');
  console.log(content.substring(0, 500));
}
