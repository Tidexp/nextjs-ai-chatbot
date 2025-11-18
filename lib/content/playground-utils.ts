/**
 * Generate a playground URL for code examples
 */
export function generatePlaygroundUrl(
  code: string,
  language: 'html' | 'css' | 'javascript' | 'python' = 'javascript',
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

/**
 * Extract code from markdown code blocks for playground links
 */
export function extractCodeFromMarkdown(markdown: string): string {
  // Remove code fence if present
  const codeMatch = markdown.match(/```[\w]*\n([\s\S]*?)```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }
  return markdown.trim();
}
