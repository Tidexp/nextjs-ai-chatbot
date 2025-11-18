---
id: les_css_03
title: Box Model & Positioning
type: theory
estimatedMinutes: 50
order: 3
---

# CSS Box Model & Positioning

Understanding the CSS box model and positioning is essential for creating precise layouts.

---

## The CSS Box Model

All HTML elements can be considered as boxes. The CSS box model is essentially a box that wraps around every HTML element. It consists of: margins, borders, padding, and the actual content.

![Box Model Diagram](https://www.w3schools.com/css/box-model.gif)

### Box Model Components

- **Content** - The content of the box, where text and images appear
- **Padding** - Clears an area around the content (transparent)
- **Border** - A border that goes around the padding and content
- **Margin** - Clears an area outside the border (transparent)

---

## Box Model Example

```css
div {
  width: 300px;
  padding: 20px;
  border: 5px solid gray;
  margin: 10px;
}
```

### Calculating Total Width

When you set the width and height properties of an element, you are just setting the width and height of the **content area**.

**Total element width** = width + left padding + right padding + left border + right border + left margin + right margin

**Total element height** = height + top padding + bottom padding + top border + bottom border + top margin + bottom margin

### Example Calculation

```css
div {
  width: 300px;
  padding: 20px;
  border: 5px solid gray;
  margin: 10px;
}
```

- Content width: 300px
- Padding: 20px × 2 = 40px
- Border: 5px × 2 = 10px
- Margin: 10px × 2 = 20px

**Total width** = 300 + 40 + 10 + 20 = **370px**

---

## box-sizing Property

The `box-sizing` property allows us to include the padding and border in an element's total width and height.

### Default Behavior

```css
div {
  width: 300px;
  padding: 20px;
  border: 5px solid gray;
  box-sizing: content-box; /* default */
}
/* Total width = 300 + 40 + 10 = 350px */
```

### border-box

```css
div {
  width: 300px;
  padding: 20px;
  border: 5px solid gray;
  box-sizing: border-box;
}
/* Total width = 300px (padding and border included) */
```

> **Best Practice:** Many developers prefer to use `box-sizing: border-box` on all elements:

```css
* {
  box-sizing: border-box;
}
```

---

## Margin

The CSS `margin` properties are used to create space around elements, outside of any defined borders.

### Individual Margins

```css
p {
  margin-top: 100px;
  margin-bottom: 100px;
  margin-right: 150px;
  margin-left: 80px;
}
```

### Shorthand Property

```css
/* All four margins are 25px */
p {
  margin: 25px;
}

/* top and bottom: 25px, right and left: 50px */
p {
  margin: 25px 50px;
}

/* top: 25px, right and left: 50px, bottom: 75px */
p {
  margin: 25px 50px 75px;
}

/* top: 25px, right: 50px, bottom: 75px, left: 100px */
p {
  margin: 25px 50px 75px 100px;
}
```

### Auto Value

You can set the margin property to `auto` to horizontally center the element within its container:

```css
div {
  width: 300px;
  margin: auto;
}
```

---

## Padding

The CSS `padding` properties are used to generate space around an element's content, inside of any defined borders.

### Individual Padding

```css
div {
  padding-top: 50px;
  padding-right: 30px;
  padding-bottom: 50px;
  padding-left: 80px;
}
```

### Shorthand Property

Padding shorthand works the same way as margin:

```css
div {
  padding: 25px 50px 75px 100px;
}
```

---

## Border

The CSS border properties allow you to specify the style, width, and color of an element's border.

### Border Style

```css
p.dotted {
  border-style: dotted;
}
p.dashed {
  border-style: dashed;
}
p.solid {
  border-style: solid;
}
p.double {
  border-style: double;
}
p.groove {
  border-style: groove;
}
p.ridge {
  border-style: ridge;
}
p.inset {
  border-style: inset;
}
p.outset {
  border-style: outset;
}
```

### Border Width

```css
p {
  border-style: solid;
  border-width: 5px;
}

/* Individual sides */
p {
  border-top-width: 5px;
  border-right-width: 10px;
  border-bottom-width: 5px;
  border-left-width: 10px;
}
```

### Border Color

```css
p {
  border-style: solid;
  border-color: red;
}

/* Individual sides */
p {
  border-top-color: red;
  border-right-color: green;
  border-bottom-color: blue;
  border-left-color: yellow;
}
```

### Border Shorthand

```css
p {
  border: 5px solid red;
}

/* Individual sides */
p {
  border-top: 5px solid red;
  border-right: 3px dashed blue;
}
```

### Border Radius

Create rounded corners:

```css
p {
  border: 2px solid red;
  border-radius: 5px;
}

/* Different corners */
p {
  border-radius: 15px 50px 30px 5px;
}

/* Create a circle */
div {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}
```

---

## CSS Positioning

The `position` property specifies the type of positioning method used for an element.

There are five different position values:

1. `static`
2. `relative`
3. `fixed`
4. `absolute`
5. `sticky`

---

## position: static

HTML elements are positioned static by default. Static positioned elements are not affected by the top, bottom, left, and right properties.

```css
div {
  position: static;
}
```

---

## position: relative

An element with `position: relative;` is positioned relative to its normal position.

```css
div {
  position: relative;
  left: 30px;
}
```

This element will be moved 30px to the right from its normal position. The space it would have occupied remains.

---

## position: fixed

An element with `position: fixed;` is positioned relative to the viewport, which means it always stays in the same place even if the page is scrolled.

```css
div {
  position: fixed;
  top: 0;
  right: 0;
}
```

**Common Use Case:** Fixed navigation bars

```css
nav {
  position: fixed;
  top: 0;
  width: 100%;
  background: white;
  z-index: 1000;
}
```

---

## position: absolute

An element with `position: absolute;` is positioned relative to the nearest positioned ancestor (instead of positioned relative to the viewport, like fixed).

If an absolute positioned element has no positioned ancestors, it uses the document body.

```css
.container {
  position: relative;
}

.box {
  position: absolute;
  top: 50px;
  right: 0;
}
```

---

## position: sticky

An element with `position: sticky;` is positioned based on the user's scroll position.

It toggles between `relative` and `fixed`, depending on the scroll position.

```css
div {
  position: sticky;
  top: 0;
}
```

**Common Use Case:** Sticky headers

```css
th {
  position: sticky;
  top: 0;
  background: white;
}
```

---

## Z-Index

When elements are positioned, they can overlap other elements. The `z-index` property specifies the stack order of an element.

An element with greater stack order is always in front of an element with a lower stack order.

```css
.box1 {
  position: absolute;
  z-index: 1;
}

.box2 {
  position: absolute;
  z-index: 2; /* This will be on top */
}
```

> **Note:** z-index only works on positioned elements (position: absolute, relative, fixed, or sticky).

---

## Practical Examples

### Centered Box with Shadow

```css
.centered-box {
  width: 300px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
```

### Overlaying Text on Image

```css
.image-container {
  position: relative;
}

.overlay-text {
  position: absolute;
  bottom: 20px;
  left: 20px;
  color: white;
  background: rgba(0, 0, 0, 0.5);
  padding: 10px;
}
```

### Fixed Header with Content Offset

```css
header {
  position: fixed;
  top: 0;
  width: 100%;
  height: 60px;
  background: white;
  z-index: 1000;
}

main {
  margin-top: 60px; /* Same as header height */
}
```

---

## Summary

- The **box model** consists of content, padding, border, and margin
- Use `box-sizing: border-box` to include padding and border in width/height
- **Margin** creates space outside the element
- **Padding** creates space inside the element
- **Border** can have style, width, color, and radius
- **Positioning**: static (default), relative, fixed, absolute, sticky
- Use **z-index** to control stacking order of positioned elements

---
