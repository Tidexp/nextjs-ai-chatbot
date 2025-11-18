# Lesson Content Management

This directory contains Markdown-based lesson content for the learning platform.

## Directory Structure

```
content/
└── lessons/
    ├── html-introduction.md
    ├── html-editors.md
    ├── javascript-variables.md
    └── ... (more lessons)
```

## Creating New Lessons

### 1. File Naming Convention

Use kebab-case for file names:

- `html-introduction.md`
- `javascript-variables.md`
- `css-flexbox-layout.md`

### 2. Frontmatter Format

Every lesson file must start with YAML frontmatter:

```yaml
---
id: les_html_01 # Database lesson ID (for mapping)
title: HTML Introduction # Lesson title
type: theory # Lesson type: theory, practice, exercise, project, quiz
estimatedMinutes: 45 # Estimated completion time
order: 1 # Optional: order within module
starterCode: | # Optional: starter code for exercises
  console.log("Hello World");
language: javascript # Optional: programming language
exercisePrompt: | # Optional: exercise instructions
  Create a function that...
projectBrief: | # Optional: project description
  Build a website that...
---
```

### 3. Content Formatting

Use standard Markdown with these W3Schools-style conventions:

#### Headings

```markdown
# Main Title

## Section Heading

### Subsection
```

#### Code Blocks

```markdown
### Example

\`\`\`html

<!DOCTYPE html>
<html>
  <body>
    <h1>Hello World</h1>
  </body>
</html>
\`\`\`
```

#### Tables

```markdown
| Column 1 | Column 2 | Column 3 |
| -------- | -------- | -------- |
| Data 1   | Data 2   | Data 3   |
```

#### Blockquotes (Notes/Tips)

```markdown
> **Note:** Important information here.

> **Tip:** Helpful suggestion here.
```

#### Horizontal Rules (Section Breaks)

```markdown
---
```

### 4. Best Practices

1. **Start with an introduction** - Explain what students will learn
2. **Use multiple examples** - Show different use cases
3. **Add explanations after code** - Use "Example Explained" sections
4. **Include tables** - Great for comparing values or syntax
5. **Add exercises** - End with "Test Yourself" sections
6. **Use consistent formatting** - Follow W3Schools patterns
7. **Keep sections focused** - One concept per section
8. **Add visual breaks** - Use `---` between major sections

### 5. Mapping to Database

Update the ID mapping in `lib/content/loader.ts`:

```typescript
const idToSlugMap: Record<string, string> = {
  les_html_01: "html-introduction",
  les_html_02: "html-editors",
  les_js_01: "javascript-variables",
  // Add your new mapping here:
  les_css_01: "css-basics",
};
```

## Content Loading

The system automatically:

1. Loads Markdown files from this directory
2. Parses frontmatter metadata
3. Converts Markdown to HTML
4. Applies syntax highlighting to code blocks
5. Merges with database lesson records

## Example Lesson Template

```markdown
---
id: les_example_01
title: Your Lesson Title
type: theory
estimatedMinutes: 30
---

# Your Lesson Title

Brief introduction paragraph explaining what this lesson covers.

---

## What is [Concept]?

Explain the main concept with bullet points:

- Point 1
- Point 2
- Point 3

---

## Your First Example

### Example

\`\`\`language
// Your code here
\`\`\`

**[Try it Yourself »](#)**

### Example Explained

- Line 1 does...
- Line 2 does...
- The result is...

---

## More Details

Continue with more sections, examples, and explanations.

> **Note:** Add helpful notes like this.

---

## Test Yourself

### Exercise:

Fill in the blank:

\`\`\`language
\_\_\_ variable = value;
\`\`\`

**[Submit Answer »](#)**

---
```

## Tips for W3Schools-Style Content

1. **Use "Try it Yourself" buttons** - Encourage experimentation
2. **Explain every example** - Don't assume understanding
3. **Progress gradually** - Simple to complex
4. **Use real-world examples** - Make it practical
5. **Add comparison tables** - Visual learning aids
6. **Include history/context** - Help students understand why
7. **End with exercises** - Reinforce learning
8. **Keep language simple** - Accessible to beginners

## Syntax Highlighting

Supported languages:

- html
- css
- javascript
- typescript
- python
- java
- cpp
- sql
- bash
- json
- yaml

The system automatically highlights code blocks based on the language specified after the triple backticks.
