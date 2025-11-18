---
id: les_css_01
title: CSS Syntax & Selectors
type: theory
estimatedMinutes: 40
order: 1
---

# CSS Syntax & Selectors

Learn the fundamentals of CSS syntax and how to select HTML elements for styling.

---

## What is CSS?

**CSS** stands for **Cascading Style Sheets**. CSS describes how HTML elements are to be displayed on screen, paper, or in other media.

CSS saves a lot of work. It can control the layout of multiple web pages all at once.

---

## CSS Syntax

A CSS rule consists of a selector and a declaration block:

```css
selector {
  property: value;
  property: value;
}
```

### Example

```css
h1 {
  color: blue;
  font-size: 24px;
}
```

**Explanation:**

- `h1` is the selector (it selects all `<h1>` elements)
- `color` and `font-size` are properties
- `blue` and `24px` are values
- Each declaration ends with a semicolon
- Declarations are surrounded by curly braces `{}`

---

## CSS Selectors

CSS selectors are used to "find" (or select) the HTML elements you want to style.

We can divide CSS selectors into five categories:

1. **Simple selectors** (select elements based on name, id, class)
2. **Combinator selectors** (select elements based on a specific relationship)
3. **Pseudo-class selectors** (select elements based on a certain state)
4. **Pseudo-elements selectors** (select and style a part of an element)
5. **Attribute selectors** (select elements based on an attribute or attribute value)

---

## The CSS Element Selector

The element selector selects HTML elements based on the element name.

### Example

Select all `<p>` elements and set their text color to red:

```css
p {
  color: red;
  text-align: center;
}
```

---

## The CSS id Selector

The id selector uses the id attribute of an HTML element to select a specific element.

The id of an element is unique within a page, so the id selector is used to select one unique element!

To select an element with a specific id, write a hash (#) character, followed by the id of the element.

### Example

The CSS rule below will be applied to the HTML element with id="para1":

```css
#para1 {
  text-align: center;
  color: red;
}
```

```html
<p id="para1">Hello World!</p>
```

> **Note:** An id name cannot start with a number!

---

## The CSS class Selector

The class selector selects HTML elements with a specific class attribute.

To select elements with a specific class, write a period (.) character, followed by the class name.

### Example

Select all elements with class="center":

```css
.center {
  text-align: center;
  color: red;
}
```

```html
<h1 class="center">Red and center-aligned heading</h1>
<p class="center">Red and center-aligned paragraph.</p>
```

You can also specify that only specific HTML elements should be affected by a class:

```css
p.center {
  text-align: center;
  color: red;
}
```

This means only `<p>` elements with class="center" will be styled.

---

## The CSS Universal Selector

The universal selector (\*) selects all HTML elements on the page.

### Example

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

This CSS rule will affect every HTML element on the page.

---

## The CSS Grouping Selector

The grouping selector selects all the HTML elements with the same style definitions.

It is better to group the selectors, to minimize the code.

To group selectors, separate each selector with a comma.

### Example

```css
h1,
h2,
h3,
p {
  text-align: center;
  color: blue;
}
```

---

## How to Add CSS to HTML

There are three ways of inserting a style sheet:

1. **External CSS**
2. **Internal CSS**
3. **Inline CSS**

---

## External CSS

With an external style sheet, you can change the look of an entire website by changing just one file!

Each HTML page must include a reference to the external style sheet file inside the `<link>` element, inside the head section.

### Example

**HTML file (index.html):**

```html
<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <h1>This is a heading</h1>
    <p>This is a paragraph.</p>
  </body>
</html>
```

**CSS file (styles.css):**

```css
body {
  background-color: lightblue;
}

h1 {
  color: navy;
  margin-left: 20px;
}
```

---

## Internal CSS

An internal style sheet may be used if one single HTML page has a unique style.

The internal style is defined inside the `<style>` element, inside the head section.

### Example

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        background-color: linen;
      }
      h1 {
        color: maroon;
        margin-left: 40px;
      }
    </style>
  </head>
  <body>
    <h1>This is a heading</h1>
    <p>This is a paragraph.</p>
  </body>
</html>
```

---

## Inline CSS

An inline style may be used to apply a unique style for a single element.

To use inline styles, add the style attribute to the relevant element.

### Example

```html
<h1 style="color:blue;text-align:center;">This is a heading</h1>
<p style="color:red;">This is a paragraph.</p>
```

> **Note:** An inline style loses many of the advantages of a style sheet (by mixing content with presentation). Use this method sparingly!

---

## CSS Comments

Comments are used to explain the code, and may help when you edit the source code at a later date.

Comments are ignored by browsers.

A CSS comment is placed inside the `<style>` element, and starts with `/*` and ends with `*/`:

### Example

```css
/* This is a single-line comment */
p {
  color: red;
}

/* 
This is 
a multi-line 
comment 
*/
h1 {
  color: blue;
}
```

---

## Summary

- CSS syntax consists of selectors and declaration blocks
- Element selector: `p { }`
- ID selector: `#myId { }`
- Class selector: `.myClass { }`
- Universal selector: `* { }`
- Grouping selector: `h1, h2, p { }`
- Three ways to add CSS: External, Internal, Inline
- External CSS is the most common and recommended method

---
