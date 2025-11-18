---
id: les_html_04
title: Build a Contact Form
type: practice
estimatedMinutes: 60
order: 4
starterCode: |
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Form</title>
  </head>
  <body>
    <!-- Build your contact form here -->
    
  </body>
  </html>
language: html
exercisePrompt: |
  Build a complete contact form with the following requirements:

  1. Create a <form> element with proper structure
  2. Add two fieldsets: "Personal Information" and "Message Details"
  3. Include these required fields:
     - First Name (text input, required)
     - Last Name (text input, required)
     - Email (email input, required)
     - Phone Number (tel input, optional)
  4. Add a Subject dropdown with at least 3 options (General Inquiry, Technical Support, Feedback)
  5. Add a Message textarea (required, minimum 5 rows)
  6. Include a Submit button
  7. All inputs must have proper <label> elements with for attributes
  8. Use semantic HTML5 elements (header, main, footer)

  The AI will check:
  - Proper form structure with action and method attributes
  - All required fields have the 'required' attribute
  - Labels are correctly associated with inputs using id/for
  - Fieldsets and legends are used for grouping
  - Input types are appropriate (email, tel, text)
  - Semantic HTML structure is present
  - Accessibility features (placeholder text, proper naming)
---

# Build a Contact Form

## Understanding HTML Forms

Before diving into the project, let's understand how HTML forms work. Forms are essential for collecting user input on websites. They consist of various input elements like text fields, checkboxes, radio buttons, and submit buttons.

### Key Form Concepts

**Form Element**: The `<form>` tag wraps all input elements and defines where to send the data:

```html
<form action="/submit" method="post">
  <!-- form elements go here -->
</form>
```

### Try It Yourself: Create a Simple Form

```html
<!DOCTYPE html>
<html>
  <body>
    <h2>Simple Form</h2>
    <form action="/submit" method="post">
      <label for="name">Your Name:</label>
      <input type="text" id="name" name="name" />
      <button type="submit">Submit</button>
    </form>
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Ch2%3ESimple+Form%3C%2Fh2%3E%0D%0A++++%3Cform+action%3D%22%2Fsubmit%22+method%3D%22post%22%3E%0D%0A++++++%3Clabel+for%3D%22name%22%3EYour+Name%3A%3C%2Flabel%3E%0D%0A++++++%3Cinput+type%3D%22text%22+id%3D%22name%22+name%3D%22name%22+%2F%3E%0D%0A++++++%3Cbutton+type%3D%22submit%22%3ESubmit%3C%2Fbutton%3E%0D%0A++++%3C%2Fform%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)** - Modify the form to add another input field!

---

**Input Types**: HTML5 provides many input types for different data:

- `text` - Regular text input
- `email` - Email validation
- `tel` - Phone numbers
- `number` - Numeric input
- `date` - Date picker

**Labels and Accessibility**: Every input should have a label for accessibility:

```html
<label for="email">Email:</label> <input type="email" id="email" name="email" />
```

### Try It Yourself: Different Input Types

```html
<!DOCTYPE html>
<html>
  <body>
    <h2>Input Types Demo</h2>
    <form>
      <label for="email">Email:</label>
      <input type="email" id="email" name="email" required /><br /><br />

      <label for="phone">Phone:</label>
      <input type="tel" id="phone" name="phone" /><br /><br />

      <label for="birthday">Birthday:</label>
      <input type="date" id="birthday" name="birthday" /><br /><br />

      <button type="submit">Submit</button>
    </form>
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Ch2%3EInput+Types+Demo%3C%2Fh2%3E%0D%0A++++%3Cform%3E%0D%0A++++++%3Clabel+for%3D%22email%22%3EEmail%3A%3C%2Flabel%3E%0D%0A++++++%3Cinput+type%3D%22email%22+id%3D%22email%22+name%3D%22email%22+required+%2F%3E%3Cbr+%2F%3E%3Cbr+%2F%3E%0D%0A%0D%0A++++++%3Clabel+for%3D%22phone%22%3EPhone%3A%3C%2Flabel%3E%0D%0A++++++%3Cinput+type%3D%22tel%22+id%3D%22phone%22+name%3D%22phone%22+%2F%3E%3Cbr+%2F%3E%3Cbr+%2F%3E%0D%0A%0D%0A++++++%3Clabel+for%3D%22birthday%22%3EBirthday%3A%3C%2Flabel%3E%0D%0A++++++%3Cinput+type%3D%22date%22+id%3D%22birthday%22+name%3D%22birthday%22+%2F%3E%3Cbr+%2F%3E%3Cbr+%2F%3E%0D%0A%0D%0A++++++%3Cbutton+type%3D%22submit%22%3ESubmit%3C%2Fbutton%3E%0D%0A++++%3C%2Fform%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)** - Add a number input for age!

---

**Form Validation**: HTML5 includes built-in validation:

- `required` - Field must be filled
- `minlength` / `maxlength` - Text length constraints
- `pattern` - Regular expression matching

**Grouping with Fieldset**: Use `<fieldset>` and `<legend>` to group related fields:

```html
<fieldset>
  <legend>Personal Information</legend>
  <!-- related inputs -->
</fieldset>
```

### Try It Yourself: Form with Validation

```html
<!DOCTYPE html>
<html>
  <body>
    <h2>Registration Form</h2>
    <form>
      <fieldset>
        <legend>Account Details</legend>

        <label for="username">Username (required):</label>
        <input
          type="text"
          id="username"
          name="username"
          required
          minlength="3"
        /><br /><br />

        <label for="email">Email (required):</label>
        <input type="email" id="email" name="email" required /><br /><br />

        <label for="age">Age (18-100):</label>
        <input
          type="number"
          id="age"
          name="age"
          min="18"
          max="100"
        /><br /><br />
      </fieldset>

      <button type="submit">Register</button>
    </form>
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Ch2%3ERegistration+Form%3C%2Fh2%3E%0D%0A++++%3Cform%3E%0D%0A++++++%3Cfieldset%3E%0D%0A++++++++%3Clegend%3EAccount+Details%3C%2Flegend%3E%0D%0A%0D%0A++++++++%3Clabel+for%3D%22username%22%3EUsername+%28required%29%3A%3C%2Flabel%3E%0D%0A++++++++%3Cinput%0D%0A++++++++++type%3D%22text%22%0D%0A++++++++++id%3D%22username%22%0D%0A++++++++++name%3D%22username%22%0D%0A++++++++++required%0D%0A++++++++++minlength%3D%223%22%0D%0A++++++++%2F%3E%3Cbr+%2F%3E%3Cbr+%2F%3E%0D%0A%0D%0A++++++++%3Clabel+for%3D%22email%22%3EEmail+%28required%29%3A%3C%2Flabel%3E%0D%0A++++++++%3Cinput+type%3D%22email%22+id%3D%22email%22+name%3D%22email%22+required+%2F%3E%3Cbr+%2F%3E%3Cbr+%2F%3E%0D%0A%0D%0A++++++++%3Clabel+for%3D%22age%22%3EAge+%2818-100%29%3A%3C%2Flabel%3E%0D%0A++++++++%3Cinput%0D%0A++++++++++type%3D%22number%22%0D%0A++++++++++id%3D%22age%22%0D%0A++++++++++name%3D%22age%22%0D%0A++++++++++min%3D%2218%22%0D%0A++++++++++max%3D%22100%22%0D%0A++++++++%2F%3E%3Cbr+%2F%3E%3Cbr+%2F%3E%0D%0A++++++%3C%2Ffieldset%3E%0D%0A%0D%0A++++++%3Cbutton+type%3D%22submit%22%3ERegister%3C%2Fbutton%3E%0D%0A++++%3C%2Fform%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)** - Try submitting with empty fields to see validation in action!

---

## Project: Build a Contact Form

Now that you understand the basics, let's build a professional contact form that puts these concepts into practice.

---

## Project Overview

You will build a professional contact form that includes:

- Name input fields
- Email input field
- Subject dropdown
- Message textarea
- Submit button
- Proper semantic structure

---

## Requirements

Your contact form should include:

1. **Form Structure**

   - Use a `<form>` element with proper attributes
   - Include `<fieldset>` and `<legend>` for grouping
   - Use semantic HTML5 elements

2. **Input Fields**

   - First Name (required)
   - Last Name (required)
   - Email (required, type="email")
   - Phone Number (optional, type="tel")

3. **Additional Elements**

   - Subject dropdown with at least 3 options
   - Message textarea (required)
   - Submit button

4. **Accessibility**
   - All inputs must have associated `<label>` elements
   - Use proper `id` and `for` attributes
   - Include `required` attribute where needed
   - Add `placeholder` text for guidance

---

## Example Structure

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Contact Us</title>
  </head>
  <body>
    <header>
      <h1>Contact Us</h1>
      <p>We'd love to hear from you!</p>
    </header>

    <main>
      <form action="/submit" method="post">
        <fieldset>
          <legend>Personal Information</legend>

          <label for="fname">First Name *</label>
          <input type="text" id="fname" name="firstname" required />

          <label for="lname">Last Name *</label>
          <input type="text" id="lname" name="lastname" required />

          <label for="email">Email *</label>
          <input type="email" id="email" name="email" required />

          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" name="phone" />
        </fieldset>

        <fieldset>
          <legend>Message Details</legend>

          <label for="subject">Subject</label>
          <select id="subject" name="subject">
            <option value="">Please choose...</option>
            <option value="general">General Inquiry</option>
            <option value="support">Technical Support</option>
            <option value="feedback">Feedback</option>
          </select>

          <label for="message">Your Message *</label>
          <textarea id="message" name="message" rows="5" required></textarea>
        </fieldset>

        <button type="submit">Send Message</button>
      </form>
    </main>

    <footer>
      <p>&copy; 2025 Your Company</p>
    </footer>
  </body>
</html>
```

---

## Step-by-Step Guide

### Step 1: Create the HTML Structure

Start with a basic HTML5 document and add semantic elements.

### Step 2: Add the Form Element

Create a form with appropriate `action` and `method` attributes.

### Step 3: Group Related Fields

Use `<fieldset>` and `<legend>` to group related form fields.

### Step 4: Add Input Fields

Create input fields for name, email, and phone with proper types and attributes.

### Step 5: Add Select and Textarea

Include a dropdown for subject selection and a textarea for the message.

### Step 6: Add Submit Button

Create a submit button to complete the form.

---

## Bonus Challenges

1. **Add More Input Types**

   - Add a checkbox for "Subscribe to newsletter"
   - Add radio buttons for preferred contact method

2. **Include Additional Fields**

   - Company name (optional)
   - Country selector
   - Date picker for preferred callback date

3. **Add Validation Attributes**

   - Use `pattern` attribute for phone number format
   - Add `minlength` and `maxlength` for textarea
   - Use `autocomplete` attributes

4. **Enhance Accessibility**
   - Add ARIA labels where needed
   - Include descriptive error messages
   - Add helpful hint text

---

## Testing Your Form

Make sure to test your form by:

1. Trying to submit with empty required fields
2. Entering invalid email formats
3. Testing tab navigation through all fields
4. Checking that all labels are clickable

---

## Expected Output

Your form should:

- Display all fields clearly with labels
- Prevent submission if required fields are empty
- Show proper validation for email field
- Be accessible with keyboard navigation
- Have a clear visual structure

---

## Next Steps

Once you complete this project:

1. Save your HTML file
2. Open it in a browser to test functionality
3. Take a screenshot of your completed form
4. In the next module, you'll learn to style this form with CSS!

---

## Try the Code

Practice what you've learned with these exercises:

### Exercise 1:

Create a form with a text input for "Username" and an email input for "Email Address". Both should be required.

```html
<form>
  <label for="___">Username:</label>
  <input type="___" id="username" name="username" ___ />

  <label for="___">Email Address:</label>
  <input type="___" id="email" name="email" ___ />

  <button type="submit">Sign Up</button>
</form>
```

**[Submit Answer »](/playground?language=html&code=%3Cform%3E%0D%0A++%3Clabel+for%3D%22___%22%3EUsername%3A%3C%2Flabel%3E%0D%0A++%3Cinput+type%3D%22___%22+id%3D%22username%22+name%3D%22username%22+___+%2F%3E%0D%0A%0D%0A++%3Clabel+for%3D%22___%22%3EEmail+Address%3A%3C%2Flabel%3E%0D%0A++%3Cinput+type%3D%22___%22+id%3D%22email%22+name%3D%22email%22+___+%2F%3E%0D%0A%0D%0A++%3Cbutton+type%3D%22submit%22%3ESign+Up%3C%2Fbutton%3E%0D%0A%3C%2Fform%3E)**

### Exercise 2:

Add a fieldset with legend "Contact Preferences" containing a select dropdown with 3 contact method options.

```html
<___>
  <___>Contact Preferences</___>
  <label for="method">Preferred Contact Method:</label>
  <___ id="method" name="method">
    <option value="">Choose...</option>
    <option value="___">Email</option>
    <option value="___">Phone</option>
    <option value="___">Text Message</option>
  </___>
</___>
```

**[Submit Answer »](/playground?language=html&code=%3C___%3E%0D%0A++%3C___%3EContact+Preferences%3C%2F___%3E%0D%0A++%3Clabel+for%3D%22method%22%3EPreferred+Contact+Method%3A%3C%2Flabel%3E%0D%0A++%3C___+id%3D%22method%22+name%3D%22method%22%3E%0D%0A++++%3Coption+value%3D%22%22%3EChoose...%3C%2Foption%3E%0D%0A++++%3Coption+value%3D%22___%22%3EEmail%3C%2Foption%3E%0D%0A++++%3Coption+value%3D%22___%22%3EPhone%3C%2Foption%3E%0D%0A++++%3Coption+value%3D%22___%22%3EText+Message%3C%2Foption%3E%0D%0A++%3C%2F___%3E%0D%0A%3C%2F___%3E)**

### Exercise 3:

Create a complete registration form with First Name, Last Name, Email, Password, and a checkbox for "I agree to terms".

```html
<!DOCTYPE html>
<html>
  <body>
    <h2>Registration Form</h2>
    <form>
      <!-- Add your form fields here -->
    </form>
  </body>
</html>
```

**[Submit Answer »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Ch2%3ERegistration+Form%3C%2Fh2%3E%0D%0A++++%3Cform%3E%0D%0A++++++%3C%21--+Add+your+form+fields+here+--%3E%0D%0A++++%3C%2Fform%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)**

---
