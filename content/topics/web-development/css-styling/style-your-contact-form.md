---
id: les_css_05
title: Style Your Contact Form
type: practice
estimatedMinutes: 70
order: 5
starterCode: |
  /* Add your CSS styles here */
  * {
    box-sizing: border-box;
  }

  body {
    font-family: Arial, sans-serif;
    background-color: #f4f4f4;
    margin: 0;
    padding: 20px;
  }
language: css
exercisePrompt: |
  Style the contact form to make it professional and user-friendly. Your CSS must include:

  1. Form Container Styling:
     - Create a centered container with max-width: 600px
     - Add white background with padding
     - Include box-shadow for depth
     - Add border-radius for rounded corners

  2. Input Field Styling:
     - Style all input, select, and textarea elements
     - Add consistent padding (at least 10px)
     - Set border: 2px solid with a neutral color
     - Make width: 100%
     - Add border-radius for rounded corners

  3. Focus States:
     - Change border color on focus (use a highlight color like green or blue)
     - Remove default outline
     - Add a subtle box-shadow on focus
     - Include smooth transitions (0.3s ease)

  4. Label Styling:
     - Display labels as block elements
     - Add font-weight: 600 or bold
     - Include proper spacing (margin-bottom)

  5. Button Styling:
     - Create an attractive submit button
     - Use a primary color (green, blue, etc.)
     - Add padding, white text color
     - Include hover state with darker shade
     - Add cursor: pointer
     - Include transition effects

  6. Responsive Design:
     - Add media query for screens under 768px
     - Adjust padding and spacing for mobile

  The AI will check for:
  - Proper container styling (max-width, centering, shadow)
  - Consistent input field styling
  - Clear focus states with transitions
  - Professional button design with hover effects
  - Responsive breakpoints
  - Good spacing and visual hierarchy
---

# Style Your Contact Form

## CSS Styling Fundamentals for Forms

Before styling your contact form, let's understand key CSS concepts that make forms look professional and user-friendly.

### Form Styling Best Practices

**Consistent Spacing**: Use padding and margin to create breathing room:

```css
input {
  padding: 12px; /* Inside the input */
  margin-bottom: 16px; /* Between form fields */
}
```

### Try It Yourself: Basic Input Styling

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      input {
        width: 100%;
        padding: 12px;
        margin-bottom: 16px;
        border: 2px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
      }
    </style>
  </head>
  <body>
    <h2>Styled Input</h2>
    <input type="text" placeholder="Enter your name" />
    <input type="email" placeholder="Enter your email" />
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Chead%3E%0D%0A++++%3Cstyle%3E%0D%0A++++++input+%7B%0D%0A++++++++width%3A+100%25%3B%0D%0A++++++++padding%3A+12px%3B%0D%0A++++++++margin-bottom%3A+16px%3B%0D%0A++++++++border%3A+2px+solid+%23ddd%3B%0D%0A++++++++border-radius%3A+4px%3B%0D%0A++++++++font-size%3A+16px%3B%0D%0A++++++%7D%0D%0A++++%3C%2Fstyle%3E%0D%0A++%3C%2Fhead%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Ch2%3EStyled+Input%3C%2Fh2%3E%0D%0A++++%3Cinput+type%3D%22text%22+placeholder%3D%22Enter+your+name%22+%2F%3E%0D%0A++++%3Cinput+type%3D%22email%22+placeholder%3D%22Enter+your+email%22+%2F%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)** - Change the border color and padding values!

---

**Visual Hierarchy**: Make important elements stand out:

- Headings should be larger and bolder
- Labels should be clear and readable
- Buttons should have strong visual weight

**Focus States**: Always style focus states for accessibility:

```css
input:focus {
  outline: none; /* Remove default */
  border-color: #4caf50; /* Add custom highlight */
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
}
```

### Try It Yourself: Focus States & Transitions

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      input {
        width: 100%;
        padding: 12px;
        border: 2px solid #ddd;
        border-radius: 4px;
        transition: all 0.3s ease;
      }

      input:focus {
        outline: none;
        border-color: #4caf50;
        box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
      }
    </style>
  </head>
  <body>
    <h2>Click inside the input</h2>
    <input type="text" placeholder="Click me to see focus effect" />
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Chead%3E%0D%0A++++%3Cstyle%3E%0D%0A++++++input+%7B%0D%0A++++++++width%3A+100%25%3B%0D%0A++++++++padding%3A+12px%3B%0D%0A++++++++border%3A+2px+solid+%23ddd%3B%0D%0A++++++++border-radius%3A+4px%3B%0D%0A++++++++transition%3A+all+0.3s+ease%3B%0D%0A++++++%7D%0D%0A%0D%0A++++++input%3Afocus+%7B%0D%0A++++++++outline%3A+none%3B%0D%0A++++++++border-color%3A+%234caf50%3B%0D%0A++++++++box-shadow%3A+0+0+8px+rgba%2876%2C+175%2C+80%2C+0.4%29%3B%0D%0A++++++%7D%0D%0A++++%3C%2Fstyle%3E%0D%0A++%3C%2Fhead%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Ch2%3EClick+inside+the+input%3C%2Fh2%3E%0D%0A++++%3Cinput+type%3D%22text%22+placeholder%3D%22Click+me+to+see+focus+effect%22+%2F%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)** - Change the focus color to blue (#2196F3)!

---

**Responsive Design**: Forms must work on all screen sizes:

```css
@media (max-width: 768px) {
  /* Stack fields vertically on mobile */
  .form-row {
    flex-direction: column;
  }
}
```

**Color and Contrast**: Ensure text is readable:

- Use sufficient color contrast (WCAG AA: 4.5:1 ratio)
- Don't rely on color alone for validation states
- Choose a consistent color palette

**Transitions**: Add smooth transitions for better UX:

```css
input {
  transition: all 0.3s ease;
}
```

This makes hover and focus changes smooth instead of jarring.

### Try It Yourself: Complete Form Styling

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f5f5f5;
        padding: 20px;
      }

      .form-container {
        max-width: 500px;
        margin: 0 auto;
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      }

      input,
      select {
        width: 100%;
        padding: 12px;
        margin-bottom: 15px;
        border: 2px solid #ddd;
        border-radius: 4px;
        transition: border-color 0.3s;
      }

      input:focus,
      select:focus {
        outline: none;
        border-color: #4caf50;
      }

      button {
        width: 100%;
        padding: 14px;
        background: #4caf50;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.3s;
      }

      button:hover {
        background: #45a049;
      }
    </style>
  </head>
  <body>
    <div class="form-container">
      <h2>Contact Form</h2>
      <input type="text" placeholder="Name" />
      <input type="email" placeholder="Email" />
      <select>
        <option>Select Subject</option>
        <option>General</option>
        <option>Support</option>
      </select>
      <button>Submit</button>
    </div>
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Chead%3E%0D%0A++++%3Cstyle%3E%0D%0A++++++body+%7B%0D%0A++++++++font-family%3A+Arial%2C+sans-serif%3B%0D%0A++++++++background%3A+%23f5f5f5%3B%0D%0A++++++++padding%3A+20px%3B%0D%0A++++++%7D%0D%0A%0D%0A++++++.form-container+%7B%0D%0A++++++++max-width%3A+500px%3B%0D%0A++++++++margin%3A+0+auto%3B%0D%0A++++++++background%3A+white%3B%0D%0A++++++++padding%3A+30px%3B%0D%0A++++++++border-radius%3A+8px%3B%0D%0A++++++++box-shadow%3A+0+2px+10px+rgba%280%2C+0%2C+0%2C+0.1%29%3B%0D%0A++++++%7D%0D%0A%0D%0A++++++input%2C%0D%0A++++++select+%7B%0D%0A++++++++width%3A+100%25%3B%0D%0A++++++++padding%3A+12px%3B%0D%0A++++++++margin-bottom%3A+15px%3B%0D%0A++++++++border%3A+2px+solid+%23ddd%3B%0D%0A++++++++border-radius%3A+4px%3B%0D%0A++++++++transition%3A+border-color+0.3s%3B%0D%0A++++++%7D%0D%0A%0D%0A++++++input%3Afocus%2C%0D%0A++++++select%3Afocus+%7B%0D%0A++++++++outline%3A+none%3B%0D%0A++++++++border-color%3A+%234caf50%3B%0D%0A++++++%7D%0D%0A%0D%0A++++++button+%7B%0D%0A++++++++width%3A+100%25%3B%0D%0A++++++++padding%3A+14px%3B%0D%0A++++++++background%3A+%234caf50%3B%0D%0A++++++++color%3A+white%3B%0D%0A++++++++border%3A+none%3B%0D%0A++++++++border-radius%3A+4px%3B%0D%0A++++++++font-size%3A+16px%3B%0D%0A++++++++cursor%3A+pointer%3B%0D%0A++++++++transition%3A+background+0.3s%3B%0D%0A++++++%7D%0D%0A%0D%0A++++++button%3Ahover+%7B%0D%0A++++++++background%3A+%2345a049%3B%0D%0A++++++%7D%0D%0A++++%3C%2Fstyle%3E%0D%0A++%3C%2Fhead%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Cdiv+class%3D%22form-container%22%3E%0D%0A++++++%3Ch2%3EContact+Form%3C%2Fh2%3E%0D%0A++++++%3Cinput+type%3D%22text%22+placeholder%3D%22Name%22+%2F%3E%0D%0A++++++%3Cinput+type%3D%22email%22+placeholder%3D%22Email%22+%2F%3E%0D%0A++++++%3Cselect%3E%0D%0A++++++++%3Coption%3ESelect+Subject%3C%2Foption%3E%0D%0A++++++++%3Coption%3EGeneral%3C%2Foption%3E%0D%0A++++++++%3Coption%3ESupport%3C%2Foption%3E%0D%0A++++++%3C%2Fselect%3E%0D%0A++++++%3Cbutton%3ESubmit%3C%2Fbutton%3E%0D%0A++++%3C%2Fdiv%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)** - Customize the colors and spacing!

---

## Project: Style Your Contact Form

Now let's apply these concepts to transform your HTML contact form into a beautiful, professional design.

---

## Project Overview

In this project, you'll take the HTML contact form you built earlier and transform it into a visually appealing, professional-looking form using CSS.

---

## Project Goals

By the end of this project, your form should:

- Have a clean, modern design
- Be fully responsive (mobile, tablet, desktop)
- Include proper spacing and alignment
- Have styled input fields with focus states
- Display validation states (valid/invalid)
- Include hover effects on buttons
- Be accessible and user-friendly

---

## Requirements

### 1. Layout & Container

Create a centered form container with:

- Maximum width of 600px
- White background
- Shadow for depth
- Rounded corners
- Proper padding

```css
.form-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
```

### 2. Form Fields

Style all input fields, textareas, and selects:

- Full width within container
- Consistent padding
- Border styling
- Focus states
- Transition effects

```css
input[type="text"],
input[type="email"],
input[type="tel"],
select,
textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 5px rgba(76, 175, 80, 0.3);
}
```

### 3. Labels

Style labels for better readability:

- Display as block
- Appropriate spacing
- Bold font weight
- Proper color

```css
label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}
```

### 4. Submit Button

Create an attractive submit button:

- Full width on mobile, auto on desktop
- Primary color background
- Hover and active states
- Pointer cursor
- Disabled state

```css
button[type="submit"] {
  width: 100%;
  padding: 14px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

button[type="submit"]:hover {
  background-color: #45a049;
}

button[type="submit"]:active {
  transform: scale(0.98);
}

button[type="submit"]:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
```

### 5. Fieldsets

Style fieldsets to group related fields:

- Remove default border
- Add custom styling
- Proper spacing

```css
fieldset {
  border: none;
  padding: 0;
  margin-bottom: 1.5rem;
}

legend {
  font-size: 1.2rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 1rem;
}
```

### 6. Validation States

Add visual feedback for validation:

```css
input:valid {
  border-color: #4caf50;
}

input:invalid:not(:placeholder-shown) {
  border-color: #f44336;
}

input:invalid:focus {
  box-shadow: 0 0 5px rgba(244, 67, 54, 0.3);
}
```

### 7. Responsive Design

Make the form responsive:

```css
/* Mobile first - default styles */
.form-container {
  padding: 1rem;
}

/* Tablet and up */
@media (min-width: 768px) {
  .form-container {
    padding: 2rem;
  }

  .form-row {
    display: flex;
    gap: 1rem;
  }

  .form-row > div {
    flex: 1;
  }
}
```

---

## Complete Example

Here's a complete CSS stylesheet for your contact form:

```css
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  padding: 20px;
}

/* Container */
.form-container {
  max-width: 600px;
  margin: 2rem auto;
  padding: 2.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

/* Header */
.form-container h1 {
  color: #333;
  margin-bottom: 0.5rem;
  font-size: 2rem;
}

.form-container > p {
  color: #666;
  margin-bottom: 2rem;
}

/* Form elements */
form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Fieldset */
fieldset {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  background: #fafafa;
}

legend {
  padding: 0 0.5rem;
  color: #667eea;
  font-weight: 600;
  font-size: 1.1rem;
}

/* Form groups */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Labels */
label {
  font-weight: 600;
  color: #444;
  font-size: 0.95rem;
}

label .required {
  color: #f44336;
}

/* Inputs */
input[type="text"],
input[type="email"],
input[type="tel"],
select,
textarea {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  font-family: inherit;
  transition: all 0.3s ease;
  background: white;
}

input::placeholder,
textarea::placeholder {
  color: #999;
}

/* Focus states */
input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

/* Validation states */
input:valid:not(:placeholder-shown),
textarea:valid:not(:placeholder-shown) {
  border-color: #4caf50;
}

input:invalid:not(:placeholder-shown),
textarea:invalid:not(:placeholder-shown) {
  border-color: #f44336;
}

/* Select styling */
select {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 40px;
}

/* Textarea */
textarea {
  resize: vertical;
  min-height: 120px;
}

/* Button */
button[type="submit"] {
  padding: 14px 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

button[type="submit"]:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

button[type="submit"]:active {
  transform: translateY(0);
}

button[type="submit"]:disabled {
  background: #ccc;
  cursor: not-allowed;
  box-shadow: none;
}

/* Responsive design */
@media (max-width: 768px) {
  .form-container {
    padding: 1.5rem;
    margin: 1rem auto;
  }

  .form-container h1 {
    font-size: 1.5rem;
  }
}

@media (min-width: 769px) {
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  button[type="submit"] {
    width: auto;
    align-self: flex-start;
  }
}

/* Animations */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-container {
  animation: slideIn 0.5s ease-out;
}

/* Helper text */
.helper-text {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.error-text {
  font-size: 0.875rem;
  color: #f44336;
  margin-top: 0.25rem;
}
```

---

## Bonus Enhancements

### 1. Add Icons to Inputs

```css
.input-wrapper {
  position: relative;
}

.input-wrapper::before {
  content: "📧";
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
}

.input-wrapper input {
  padding-left: 40px;
}
```

### 2. Loading State for Button

```css
button.loading {
  position: relative;
  color: transparent;
}

button.loading::after {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  top: 50%;
  left: 50%;
  margin-left: -8px;
  margin-top: -8px;
  border: 2px solid white;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

### 3. Custom Checkboxes and Radio Buttons

```css
input[type="checkbox"],
input[type="radio"] {
  appearance: none;
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

input[type="radio"] {
  border-radius: 50%;
}

input[type="checkbox"]:checked,
input[type="radio"]:checked {
  background: #667eea;
  border-color: #667eea;
}
```

---

## Testing Checklist

- [ ] Form looks good on mobile (< 768px)
- [ ] Form looks good on tablet (768px - 1024px)
- [ ] Form looks good on desktop (> 1024px)
- [ ] All inputs have clear focus states
- [ ] Validation states are visible
- [ ] Button has hover effects
- [ ] Form is accessible (keyboard navigation works)
- [ ] Labels are properly associated with inputs
- [ ] Color contrast meets accessibility standards

---

## Summary

In this project, you learned to:

- Style form elements with modern CSS
- Create responsive layouts using media queries
- Add visual feedback with focus and validation states
- Implement smooth transitions and animations
- Design accessible and user-friendly forms
- Use CSS Grid and Flexbox for layout

Your styled contact form is now ready for the final step: adding JavaScript interactivity!

---

## Try the Code

Practice your CSS styling skills with these exercises:

### Exercise 1:

Style an input field to have padding, border, and change border color on focus.

```css
input {
  padding: ___;
  border: 2px solid ___;
  border-radius: ___;
}

input: ___ {
  outline: none;
  border-color: ___;
}
```

**[Submit Answer »](/playground?language=css&code=input+%7B%0D%0A++padding%3A+___%3B%0D%0A++border%3A+2px+solid+___%3B%0D%0A++border-radius%3A+___%3B%0D%0A%7D%0D%0A%0D%0Ainput%3A+___+%7B%0D%0A++outline%3A+none%3B%0D%0A++border-color%3A+___%3B%0D%0A%7D)**

### Exercise 2:

Create a button style with background color, hover effect, and transition.

```css
button {
  background: ___;
  color: white;
  padding: 12px 24px;
  border: ___;
  cursor: ___;
  transition: ___ 0.3s ease;
}

button: ___ {
  background: ___;
}
```

**[Submit Answer »](/playground?language=css&code=button+%7B%0D%0A++background%3A+___%3B%0D%0A++color%3A+white%3B%0D%0A++padding%3A+12px+24px%3B%0D%0A++border%3A+___%3B%0D%0A++cursor%3A+___%3B%0D%0A++transition%3A+___+0.3s+ease%3B%0D%0A%7D%0D%0A%0D%0Abutton%3A+___+%7B%0D%0A++background%3A+___%3B%0D%0A%7D)**

### Exercise 3:

Write a media query to make the form responsive on screens smaller than 768px.

```css
___ (___: 768px) {
  .form-container {
    padding: ___;
    width: ___;
  }
}
```

**[Submit Answer »](/playground?language=css&code=___+%28___%3A+768px%29+%7B%0D%0A++.form-container+%7B%0D%0A++++padding%3A+___%3B%0D%0A++++width%3A+___%3B%0D%0A++%7D%0D%0A%7D)**

### Exercise 4:

Create a complete CSS stylesheet for a form container with centered layout, white background, shadow, and rounded corners.

```css
.form-container {
  /* Add your styles here */
}
```

**[Submit Answer »](/playground?language=css&code=.form-container+%7B%0D%0A++%2F*+Add+your+styles+here+*%2F%0D%0A%7D)**

---
