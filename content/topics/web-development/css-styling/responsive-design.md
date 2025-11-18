---
id: les_css_04
title: Responsive Design
type: theory
estimatedMinutes: 55
order: 4
---

# Responsive Design

Learn how to create websites that look great on all devices - from mobile phones to desktop computers.

---

## What is Responsive Web Design?

Responsive Web Design is about using HTML and CSS to automatically resize, hide, shrink, or enlarge a website to make it look good on all devices (desktops, tablets, and phones).

### Key Principles

1. **Fluid Grids** - Use relative units like percentages instead of fixed pixels
2. **Flexible Images** - Images that scale with their container
3. **Media Queries** - Apply different styles for different screen sizes

---

## The Viewport

The viewport is the user's visible area of a web page. It varies with the device.

### Setting The Viewport

Always include this meta tag in your HTML `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

This gives the browser instructions on how to control the page's dimensions and scaling.

**Explanation:**

- `width=device-width` sets the width to follow the screen-width of the device
- `initial-scale=1.0` sets the initial zoom level when the page is first loaded

---

## Responsive Images

### Using max-width

The simplest way to make images responsive:

```css
img {
  max-width: 100%;
  height: auto;
}
```

This ensures images will never be larger than their container and maintain their aspect ratio.

### Example

```html
<style>
  img {
    max-width: 100%;
    height: auto;
  }
</style>

<img src="nature.jpg" alt="Nature" />
```

### Different Images for Different Sizes

Use the `<picture>` element to load different images for different screen sizes:

```html
<picture>
  <source media="(min-width: 650px)" srcset="large.jpg" />
  <source media="(min-width: 465px)" srcset="medium.jpg" />
  <img src="small.jpg" alt="Flowers" />
</picture>
```

---

## Media Queries

Media queries are used to apply different styles for different devices or screen sizes.

### Basic Syntax

```css
@media media-type and (condition) {
  /* CSS rules */
}
```

### Common Media Types

- `all` - for all media type devices
- `print` - for printers
- `screen` - for computer screens, tablets, smartphones, etc.

---

## Breakpoints

Breakpoints are the points where your website content will respond to provide the user with the best possible layout.

### Common Breakpoints

```css
/* Extra small devices (phones, 600px and down) */
@media only screen and (max-width: 600px) {
  .example {
    font-size: 14px;
  }
}

/* Small devices (portrait tablets and large phones, 600px and up) */
@media only screen and (min-width: 600px) {
  .example {
    font-size: 16px;
  }
}

/* Medium devices (landscape tablets, 768px and up) */
@media only screen and (min-width: 768px) {
  .example {
    font-size: 18px;
  }
}

/* Large devices (laptops/desktops, 992px and up) */
@media only screen and (min-width: 992px) {
  .example {
    font-size: 20px;
  }
}

/* Extra large devices (large laptops and desktops, 1200px and up) */
@media only screen and (min-width: 1200px) {
  .example {
    font-size: 22px;
  }
}
```

---

## Mobile-First Design

Mobile-first means designing for mobile before designing for desktop or any other device.

### Mobile-First Approach

```css
/* Mobile styles (default) */
.column {
  width: 100%;
}

/* Tablet styles */
@media (min-width: 768px) {
  .column {
    width: 50%;
  }
}

/* Desktop styles */
@media (min-width: 1024px) {
  .column {
    width: 33.33%;
  }
}
```

### Desktop-First Approach

```css
/* Desktop styles (default) */
.column {
  width: 33.33%;
}

/* Tablet styles */
@media (max-width: 1024px) {
  .column {
    width: 50%;
  }
}

/* Mobile styles */
@media (max-width: 768px) {
  .column {
    width: 100%;
  }
}
```

---

## Flexbox for Responsive Layouts

Flexbox is perfect for creating responsive layouts.

### Basic Flexbox Container

```css
.container {
  display: flex;
  flex-wrap: wrap;
}

.item {
  flex: 1 1 300px; /* grow, shrink, basis */
  margin: 10px;
}
```

### Responsive Navigation

```css
nav {
  display: flex;
  flex-direction: column;
}

nav a {
  padding: 10px;
  text-align: center;
}

@media (min-width: 768px) {
  nav {
    flex-direction: row;
    justify-content: space-between;
  }
}
```

---

## CSS Grid for Responsive Layouts

CSS Grid is excellent for complex responsive layouts.

### Responsive Grid

```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}
```

This creates a responsive grid where:

- Each column is at least 250px wide
- Columns automatically wrap to new rows
- Columns expand to fill available space

### Example: Responsive Card Layout

```css
.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  padding: 2rem;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

---

## Responsive Typography

### Using rem and em

```css
html {
  font-size: 16px; /* Base font size */
}

body {
  font-size: 1rem; /* 16px */
}

h1 {
  font-size: 2rem; /* 32px */
}

@media (min-width: 768px) {
  html {
    font-size: 18px;
  }
  /* All rem-based sizes scale automatically */
}
```

### Fluid Typography

```css
h1 {
  font-size: calc(1.5rem + 2vw);
}
```

This creates font sizes that scale with viewport width.

---

## Container Queries (Modern Feature)

Container queries allow you to apply styles based on the size of a container, not the viewport.

```css
.container {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    display: flex;
    gap: 1rem;
  }
}
```

---

## Hiding Elements Responsively

### Display Property

```css
.desktop-only {
  display: block;
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none;
  }

  .mobile-only {
    display: block;
  }
}
```

---

## Complete Responsive Example

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Responsive Page</title>
    <style>
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
      }

      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }

      header {
        background: #333;
        color: white;
        padding: 1rem;
        text-align: center;
      }

      nav {
        display: flex;
        flex-direction: column;
        background: #444;
      }

      nav a {
        color: white;
        padding: 1rem;
        text-decoration: none;
        text-align: center;
      }

      nav a:hover {
        background: #555;
      }

      .grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 20px;
        margin: 20px 0;
      }

      .card {
        background: #f4f4f4;
        padding: 20px;
        border-radius: 5px;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      /* Tablet */
      @media (min-width: 768px) {
        nav {
          flex-direction: row;
          justify-content: space-around;
        }

        .grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      /* Desktop */
      @media (min-width: 1024px) {
        .grid {
          grid-template-columns: repeat(3, 1fr);
        }
      }
    </style>
  </head>
  <body>
    <header>
      <h1>Responsive Website</h1>
    </header>

    <nav>
      <a href="#home">Home</a>
      <a href="#about">About</a>
      <a href="#services">Services</a>
      <a href="#contact">Contact</a>
    </nav>

    <div class="container">
      <div class="grid">
        <div class="card">
          <h2>Card 1</h2>
          <p>Content goes here</p>
        </div>
        <div class="card">
          <h2>Card 2</h2>
          <p>Content goes here</p>
        </div>
        <div class="card">
          <h2>Card 3</h2>
          <p>Content goes here</p>
        </div>
      </div>
    </div>
  </body>
</html>
```

---

## Best Practices

1. **Start with mobile** - Design for mobile first, then scale up
2. **Use relative units** - Prefer %, em, rem over px
3. **Test on real devices** - Don't rely only on browser dev tools
4. **Optimize images** - Use appropriate image sizes for different screens
5. **Use semantic HTML** - It helps with accessibility and SEO
6. **Keep it simple** - Don't over-complicate your responsive design
7. **Consider touch targets** - Make buttons at least 44×44 pixels on mobile

---

## Summary

- Use the viewport meta tag in all HTML pages
- Make images responsive with `max-width: 100%`
- Use media queries to apply different styles for different screen sizes
- Common breakpoints: 600px, 768px, 992px, 1200px
- Mobile-first design starts with mobile styles and scales up
- Flexbox and Grid are excellent for responsive layouts
- Use relative units (rem, em, %) instead of fixed pixels
- Test your design on multiple devices and screen sizes

---
