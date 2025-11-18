// Sample topic data for seeding
export const webDevelopmentTopic = {
  id: 'topic_web_dev_01', // You may want to generate UUIDs
  slug: 'web-development',
  title: 'Web Development',
  description: 'Learn full-stack web development from scratch',
  category: 'programming',
};

export const webDevModules = [
  {
    id: 'mod_html_01',
    topicId: 'topic_web_dev_01',
    order: 1,
    title: 'HTML Fundamentals',
    description: 'Learn the building blocks of web pages',
    difficulty: 'Beginner',
    estimatedHours: 4,
    learningObjectives: [
      'Understand HTML document structure',
      'Master common HTML elements',
      'Learn semantic markup',
    ],
  },
  {
    id: 'mod_css_01',
    topicId: 'topic_web_dev_01',
    order: 2,
    title: 'CSS Styling',
    description: 'Style your web pages with CSS',
    difficulty: 'Beginner',
    estimatedHours: 6,
    learningObjectives: [
      'Understand CSS selectors',
      'Master layout with Flexbox',
      'Learn responsive design',
    ],
  },
  {
    id: 'mod_js_01',
    topicId: 'topic_web_dev_01',
    order: 3,
    title: 'JavaScript Basics',
    description: 'Add interactivity with JavaScript',
    difficulty: 'Intermediate',
    estimatedHours: 8,
    learningObjectives: [
      'Learn JavaScript fundamentals',
      'DOM manipulation',
      'Event handling',
    ],
  },
];

export const webDevLessons = [
  // HTML Module
  {
    id: 'les_html_01',
    moduleId: 'mod_html_01',
    order: 1,
    title: 'Introduction to HTML',
    type: 'theory',
    content: `
# Introduction to HTML

HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure of Web pages using markup.

## What is HTML?
- HTML stands for Hyper Text Markup Language
- HTML is the standard markup language for creating Web pages
- HTML describes the structure of a Web page
- HTML consists of a series of elements
- HTML elements tell the browser how to display the content

## Your First HTML Element
HTML elements are represented by tags:
\`\`\`html
<tagname>content</tagname>
\`\`\`

For example, a paragraph is written like this:
\`\`\`html
<p>This is a paragraph.</p>
\`\`\`
`,
    estimatedMinutes: 30,
  },
  {
    id: 'les_html_02',
    moduleId: 'mod_html_01',
    order: 2,
    title: 'Your First Web Page',
    type: 'practice',
    content: `
# Creating Your First Web Page

In this lesson, you'll create a complete HTML page from scratch.

## Basic HTML Structure
Every HTML page needs a basic structure:
\`\`\`html
<!DOCTYPE html>
<html>
<head>
    <title>My First Web Page</title>
</head>
<body>
    <h1>Welcome!</h1>
    <p>This is my first web page.</p>
</body>
</html>
\`\`\`
`,
    exercisePrompt: `
Create an HTML page that includes:
1. A header with a title and navigation menu
2. A main content area with:
   - An article with a heading and paragraphs
   - A sidebar with a list of links
3. A footer with copyright information

Use semantic HTML elements like <header>, <nav>, <main>, <article>, <aside>, and <footer>.
`,
    estimatedMinutes: 45,
  },
  // CSS Module
  {
    id: 'les_css_01',
    moduleId: 'mod_css_01',
    order: 1,
    title: 'CSS Basics',
    type: 'theory',
    content: `
# Introduction to CSS

CSS (Cascading Style Sheets) is used to style and layout web pages.

## What is CSS?
- CSS stands for Cascading Style Sheets
- CSS describes how HTML elements are to be displayed
- CSS can control the layout of multiple web pages at once
- External stylesheets are stored in CSS files

## CSS Syntax
\`\`\`css
selector {
  property: value;
}
\`\`\`

For example:
\`\`\`css
p {
  color: blue;
  font-size: 16px;
}
\`\`\`
`,
    estimatedMinutes: 40,
  },
  {
    id: 'les_css_02',
    moduleId: 'mod_css_01',
    order: 2,
    title: 'Styling Your First Page',
    type: 'practice',
    content: `
# Styling Your Web Page

Learn how to apply CSS styles to your HTML page.

## Three Ways to Insert CSS
1. External CSS (using a .css file)
2. Internal CSS (using <style> tag)
3. Inline CSS (using style attribute)

## Common CSS Properties
- color: text color
- background-color: background color
- font-size: size of the text
- margin: space outside elements
- padding: space inside elements
`,
    exercisePrompt: `
Style the HTML page you created in the previous lesson:
1. Set different colors for headings and paragraphs
2. Add background colors to different sections
3. Style the navigation menu to display horizontally
4. Add hover effects to links
5. Make the layout responsive using CSS Flexbox

Create a file named styles.css and link it to your HTML page.
`,
    estimatedMinutes: 60,
  },
  {
    id: 'les_html_03',
    moduleId: 'mod_html_01',
    order: 3,
    title: 'Forms & Semantic HTML',
    type: 'theory',
    content: 'Learn about HTML forms and semantic elements.',
    estimatedMinutes: 45,
  },
  {
    id: 'les_html_04',
    moduleId: 'mod_html_01',
    order: 4,
    title: 'Build a Contact Form',
    type: 'project',
    content: 'Create a complete contact form with validation.',
    estimatedMinutes: 60,
  },
  {
    id: 'les_css_03',
    moduleId: 'mod_css_01',
    order: 3,
    title: 'Box Model & Positioning',
    type: 'theory',
    content: 'Understanding the CSS box model and positioning.',
    estimatedMinutes: 50,
  },
  {
    id: 'les_css_04',
    moduleId: 'mod_css_01',
    order: 4,
    title: 'Responsive Design',
    type: 'theory',
    content: 'Learn to create responsive layouts with media queries.',
    estimatedMinutes: 55,
  },
  {
    id: 'les_css_05',
    moduleId: 'mod_css_01',
    order: 5,
    title: 'Style Your Contact Form',
    type: 'project',
    content: 'Apply advanced CSS styling to your contact form.',
    estimatedMinutes: 70,
  },
  {
    id: 'les_js_01',
    moduleId: 'mod_js_01',
    order: 1,
    title: 'Intro to JavaScript',
    type: 'theory',
    content: 'Introduction to JavaScript programming.',
    estimatedMinutes: 40,
  },
  {
    id: 'les_js_02',
    moduleId: 'mod_js_01',
    order: 2,
    title: 'Variables & Data Types',
    type: 'theory',
    content: 'Learn about JavaScript variables and data types.',
    estimatedMinutes: 45,
  },
  {
    id: 'les_js_03',
    moduleId: 'mod_js_01',
    order: 3,
    title: 'Functions & Events',
    type: 'theory',
    content: 'Master JavaScript functions and event handling.',
    estimatedMinutes: 50,
  },
  {
    id: 'les_js_04',
    moduleId: 'mod_js_01',
    order: 4,
    title: 'Interactive Contact Form',
    type: 'project',
    content: 'Add JavaScript interactivity to your contact form.',
    estimatedMinutes: 75,
  },
];
