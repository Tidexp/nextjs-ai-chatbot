# Interactive Code Playground Feature

## Overview

The interactive code playground allows students to write, run, and test code directly in the browser with live preview and AI-powered assistance.

## Features

### 1. **Multi-Language Support**

- **HTML**: Live preview with full HTML rendering
- **CSS**: Live preview with styled elements
- **JavaScript**: Live preview with console.log output capture
- **Python**: Code editor (preview coming soon)

### 2. **Live Preview Panel**

- Real-time rendering for HTML, CSS, and JavaScript
- Console output capture for JavaScript
- Error handling and display
- Sandboxed iframe for security

### 3. **AI Code Checking**

- Click "Check with AI" to validate code
- Context-aware feedback based on lesson requirements
- Encouraging and educational responses
- Works with or without lesson context

### 4. **AI Chat Support** (Coming Soon)

- Dedicated chat panel for getting help
- Context-aware of current code and lesson
- Can ask questions about errors or approach

## Usage

### For Students

#### Accessing the Playground

1. Click any "Try it Yourself »" link in a lesson
2. Opens playground with pre-loaded code example
3. Edit, run, and experiment with the code

#### Using the Interface

- **Editor Panel**: Write your code (left side)
- **Preview Panel**: See live results (right side for HTML/CSS/JS)
- **Run Code**: Click to refresh preview
- **Check with AI**: Get feedback on your code
- **Get Help**: Open AI chat assistant (coming soon)
- **Back Arrow**: Return to lesson (if opened from lesson)

### For Content Creators

#### Adding Playground Links to Lessons

1. **Manual URL Encoding**:

```markdown
[Try it Yourself »](</playground?language=javascript&code=console.log(%22Hello%20World%22)>)
```

2. **Using the Utility Function**:

```typescript
import { generatePlaygroundUrl } from "@/lib/content/playground-utils";

const url = generatePlaygroundUrl(
  'console.log("Hello World");',
  "javascript",
  "les_js_02" // optional lesson ID
);
```

#### URL Parameters

- `language`: `html` | `css` | `javascript` | `python`
- `code`: URL-encoded code content
- `lessonId`: (optional) Lesson ID for context-aware AI checking

#### Example Lesson with Playground Link

```markdown
### Example

\`\`\`javascript
let x = 5;
let y = 6;
let z = x + y;
console.log("z equals:", z);
\`\`\`

**[Try it Yourself »](</playground?language=javascript&code=let%20x%20%3D%205%3B%0Alet%20y%20%3D%206%3B%0Alet%20z%20%3D%20x%20%2B%20y%3B%0Aconsole.log(%22z%20equals%3A%22%2C%20z)%3B>)**
```

#### Practice Lessons with AI Checking

For practice-type lessons with `exercisePrompt` in frontmatter:

```yaml
---
id: les_js_practice_01
title: Practice: Variables
type: practice
exercisePrompt: |
  Create variables using let and const.
  Calculate the sum of two numbers.
  Display the result using console.log.
---
```

When students use "Check with AI" from the playground, the AI will:

- Reference the `exercisePrompt` requirements
- Provide specific feedback on whether code meets requirements
- Offer constructive suggestions for improvement

## Technical Implementation

### Routes

- `/playground` - Main playground page (protected by auth)

### Components

- `CodePlayground` - Main playground container
- `CodeEditor` - CodeMirror-based editor with language support
- `CodePreview` - Live preview renderer for HTML/CSS/JS

### API Endpoints

- `POST /api/code-check` - AI-powered code validation and feedback

### File Structure

```
app/(chat)/
  playground/
    page.tsx           # Playground route
  api/
    code-check/
      route.ts         # AI code checking endpoint

components/
  code-playground.tsx  # Main playground UI
  code-editor.tsx      # CodeMirror editor
  code-preview.tsx     # Preview renderer

lib/content/
  playground-utils.ts  # URL generation utilities
```

## Best Practices

### For Lesson Authors

1. **Keep Examples Simple**: Start with basic examples that clearly demonstrate concepts
2. **Include console.log**: For JavaScript, always add console.log statements to show output
3. **Provide Context**: Use `exercisePrompt` in practice lessons for better AI feedback
4. **Test Links**: Always test playground links to ensure code runs correctly

### For Code Examples

**Good HTML Example**:

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>Hello World</h1>
    <p>This is a paragraph.</p>
  </body>
</html>
```

**Good JavaScript Example**:

```javascript
const name = "Alice";
const greeting = "Hello, " + name + "!";
console.log(greeting);
```

**Good CSS Example**:

```css
h1 {
  color: blue;
  font-size: 2em;
}
p {
  color: gray;
}
```

## Future Enhancements

- [ ] Add full chat integration in playground
- [ ] Support for more languages (TypeScript, PHP, etc.)
- [ ] Code sharing and permalinks
- [ ] Save code examples to user profile
- [ ] Multi-file projects
- [ ] NPM package imports for JavaScript
- [ ] Code diff view for practice solutions
- [ ] Collaborative coding features

## Troubleshooting

### Playground Not Loading

- Check if user is authenticated (playground requires login)
- Verify URL parameters are properly encoded
- Check browser console for errors

### Code Not Running

- Ensure language parameter matches code type
- For JavaScript, check console panel for errors
- Verify code syntax is correct

### AI Checking Not Working

- Ensure code is not empty
- Check network connection
- Verify lesson ID is correct (if provided)
- Check API endpoint logs for errors

## Examples in Production

**✅ All lessons now have working playground links!** (39 links updated across 11 lessons)

Updated lessons with interactive code playground:

- `variables-and-data-types.md` - 10 JavaScript examples
- `intro-to-javascript.md` - 1 HTML + 9 JavaScript examples
- `html-basics.md` - 2 HTML examples
- `forms-and-semantic-html.md` - 5 HTML examples
- `build-a-contact-form.md` - 6 HTML examples
- `style-your-contact-form.md` - 7 CSS examples
- `interactive-contact-form.md` - 7 JavaScript examples

All "Try it Yourself »" and "Submit Answer »" links now:

- ✅ Open the code playground with actual code from lessons
- ✅ Support HTML, CSS, and JavaScript with live preview
- ✅ Include lesson ID for context-aware AI checking (when available)
- ✅ Work across all markdown files in the content library

Check these lessons for reference implementation.
