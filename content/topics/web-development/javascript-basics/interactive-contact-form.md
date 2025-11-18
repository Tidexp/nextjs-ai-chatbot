---
id: les_js_04
title: Interactive Contact Form
type: practice
estimatedMinutes: 75
order: 4
starterCode: |
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Interactive Contact Form</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 2rem; }
        form { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; gap: 1rem; }
        .row { display: flex; gap: 1rem; }
        .row > div { flex: 1; }
        label { font-weight: 600; display: block; margin-bottom: .35rem; }
        input, select, textarea { width: 100%; padding: .75rem; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #4CAF50; }
        button { background: #4CAF50; color: #fff; padding: .9rem 1.4rem; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: 600; }
        button:disabled { background:#999; cursor: not-allowed; }
        .error { color:#d32f2f; font-size: .85rem; margin-top:.25rem; }
        .success-msg { background:#e8f5e9; color:#2e7d32; padding: .75rem 1rem; border-radius:6px; margin-bottom:1rem; display:none; }
      </style>
    </head>
    <body>
      <h1>Interactive Contact Form</h1>
      <div class="success-msg" id="successMsg">Message sent successfully!</div>
      <form id="contactForm" novalidate>
        <div class="row">
          <div>
            <label for="firstName">First Name *</label>
            <input id="firstName" name="firstName" required placeholder="Jane" />
            <div class="error" data-error-for="firstName"></div>
          </div>
          <div>
            <label for="lastName">Last Name *</label>
            <input id="lastName" name="lastName" required placeholder="Doe" />
            <div class="error" data-error-for="lastName"></div>
          </div>
        </div>
        <label for="email">Email *</label>
        <input id="email" name="email" type="email" required placeholder="you@example.com" />
        <div class="error" data-error-for="email"></div>
        <label for="subject">Subject *</label>
        <select id="subject" name="subject" required>
          <option value="">Select one...</option>
          <option value="general">General Inquiry</option>
          <option value="support">Technical Support</option>
          <option value="feedback">Feedback</option>
        </select>
        <div class="error" data-error-for="subject"></div>
        <label for="message">Message *</label>
        <textarea id="message" name="message" rows="6" required placeholder="Write your message..."></textarea>
        <div class="error" data-error-for="message"></div>
        <button type="submit" id="submitBtn" disabled>Send Message</button>
      </form>
      <script>
        const form = document.getElementById('contactForm');
        const submitBtn = document.getElementById('submitBtn');
        const successMsg = document.getElementById('successMsg');

        function validateField(el) {
          const errorEl = document.querySelector(`[data-error-for="${el.id}"]`);
          if (!errorEl) return;
          if (!el.checkValidity()) {
            errorEl.textContent = el.validationMessage || 'Invalid field';
          } else {
            errorEl.textContent = '';
          }
        }

        function updateSubmitState() {
          submitBtn.disabled = !form.checkValidity();
        }

        form.querySelectorAll('input, select, textarea').forEach(el => {
          el.addEventListener('input', () => { validateField(el); updateSubmitState(); });
          el.addEventListener('blur', () => validateField(el));
        });

        form.addEventListener('submit', (e) => {
          e.preventDefault();
          form.querySelectorAll('input, select, textarea').forEach(validateField);
          if (!form.checkValidity()) return;
          submitBtn.disabled = true;
          setTimeout(() => {
            successMsg.style.display = 'block';
            form.reset();
            submitBtn.disabled = true;
            setTimeout(() => successMsg.style.display = 'none', 3000);
          }, 600);
        });
      </script>
    </body>
  </html>
language: html
exercisePrompt: |
  Add JavaScript to make the contact form interactive with real-time validation and user feedback.

  Required Features:

  1. Form Element References:
     - Get references to the form, submit button, and success message elements
     - Use document.getElementById() or querySelector()

  2. Field Validation Function:
     - Create a validateField(element) function
     - Use element.checkValidity() to check if field is valid
     - Display error messages in the corresponding error div
     - Clear error messages when field becomes valid

  3. Real-Time Validation:
     - Add 'input' event listeners to all form fields
     - Validate fields as the user types
     - Add 'blur' event listeners to validate when user leaves a field

  4. Submit Button State:
     - Create an updateSubmitState() function
     - Enable submit button only when form.checkValidity() returns true
     - Start with button disabled
     - Update button state on every input change

  5. Form Submission:
     - Add 'submit' event listener to the form
     - Prevent default form submission with e.preventDefault()
     - Validate all fields before submitting
     - If invalid, stop and show errors
     - If valid, disable button and simulate async submission
     - Show success message after delay (use setTimeout)
     - Reset form after success
     - Auto-hide success message after 3 seconds

  The AI will check for:
  - Proper use of event listeners (input, blur, submit)
  - Form validation using checkValidity() API
  - Dynamic button enable/disable based on form validity
  - Error message display/clear functionality
  - preventDefault() on form submission
  - Form reset after successful submission
  - Success message show/hide logic
  - Proper DOM element selection and manipulation
---

# Interactive Contact Form

## JavaScript Form Interaction Fundamentals

Before building the interactive form, let's understand how JavaScript enhances form functionality and user experience.

### DOM Manipulation for Forms

**Accessing Form Elements**: Multiple ways to get form inputs:

```javascript
// By ID
const nameInput = document.getElementById("firstName");

// By querySelector
const emailInput = document.querySelector("#email");

// Through the form
const form = document.getElementById("contactForm");
const firstNameInput = form.elements.firstName;
```

### Try It Yourself: Access Form Elements

```html
<!DOCTYPE html>
<html>
  <body>
    <h2>Form Element Access</h2>
    <input type="text" id="myInput" placeholder="Type something" />
    <button onclick="showValue()">Show Value</button>
    <p id="result"></p>

    <script>
      function showValue() {
        const input = document.getElementById("myInput");
        const result = document.getElementById("result");
        result.textContent = "You typed: " + input.value;
      }
    </script>
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Ch2%3EForm+Element+Access%3C%2Fh2%3E%0D%0A++++%3Cinput+type%3D%22text%22+id%3D%22myInput%22+placeholder%3D%22Type+something%22+%2F%3E%0D%0A++++%3Cbutton+onclick%3D%22showValue%28%29%22%3EShow+Value%3C%2Fbutton%3E%0D%0A++++%3Cp+id%3D%22result%22%3E%3C%2Fp%3E%0D%0A%0D%0A++++%3Cscript%3E%0D%0A++++++function+showValue%28%29+%7B%0D%0A++++++++const+input+%3D+document.getElementById%28%22myInput%22%29%3B%0D%0A++++++++const+result+%3D+document.getElementById%28%22result%22%29%3B%0D%0A++++++++result.textContent+%3D+%22You+typed%3A+%22+%2B+input.value%3B%0D%0A++++++%7D%0D%0A++++%3C%2Fscript%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)** - Add another input and display both values!

---

**Form Validation API**: HTML5 provides built-in validation methods:

```javascript
// Check if an input is valid
if (emailInput.checkValidity()) {
  console.log("Valid email");
} else {
  console.log(emailInput.validationMessage); // Get error message
}

// Check entire form
if (form.checkValidity()) {
  console.log("Form is valid");
}
```

**Event Listeners**: Listen for user interactions:

```javascript
// Real-time validation as user types
input.addEventListener("input", (e) => {
  validateField(e.target);
});

// Validation on blur (when user leaves field)
input.addEventListener("blur", (e) => {
  validateField(e.target);
});

// Form submission
form.addEventListener("submit", (e) => {
  e.preventDefault(); // Stop default submission
  handleSubmit();
});
```

### Try It Yourself: Form Validation

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      input {
        padding: 10px;
        margin: 10px 0;
        width: 250px;
        border: 2px solid #ddd;
      }
      .error {
        color: red;
        font-size: 14px;
      }
      .valid {
        border-color: green;
      }
      .invalid {
        border-color: red;
      }
    </style>
  </head>
  <body>
    <h2>Email Validation</h2>
    <input type="email" id="email" placeholder="Enter email" />
    <div id="error" class="error"></div>

    <script>
      const emailInput = document.getElementById("email");
      const errorDiv = document.getElementById("error");

      emailInput.addEventListener("input", () => {
        if (emailInput.checkValidity()) {
          emailInput.className = "valid";
          errorDiv.textContent = "✓ Valid email";
          errorDiv.style.color = "green";
        } else {
          emailInput.className = "invalid";
          errorDiv.textContent = "✗ " + emailInput.validationMessage;
          errorDiv.style.color = "red";
        }
      });
    </script>
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Chead%3E%0D%0A++++%3Cstyle%3E%0D%0A++++++input+%7B%0D%0A++++++++padding%3A+10px%3B%0D%0A++++++++margin%3A+10px+0%3B%0D%0A++++++++width%3A+250px%3B%0D%0A++++++++border%3A+2px+solid+%23ddd%3B%0D%0A++++++%7D%0D%0A++++++.error+%7B%0D%0A++++++++color%3A+red%3B%0D%0A++++++++font-size%3A+14px%3B%0D%0A++++++%7D%0D%0A++++++.valid+%7B%0D%0A++++++++border-color%3A+green%3B%0D%0A++++++%7D%0D%0A++++++.invalid+%7B%0D%0A++++++++border-color%3A+red%3B%0D%0A++++++%7D%0D%0A++++%3C%2Fstyle%3E%0D%0A++%3C%2Fhead%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Ch2%3EEmail+Validation%3C%2Fh2%3E%0D%0A++++%3Cinput+type%3D%22email%22+id%3D%22email%22+placeholder%3D%22Enter+email%22+%2F%3E%0D%0A++++%3Cdiv+id%3D%22error%22+class%3D%22error%22%3E%3C%2Fdiv%3E%0D%0A%0D%0A++++%3Cscript%3E%0D%0A++++++const+emailInput+%3D+document.getElementById%28%22email%22%29%3B%0D%0A++++++const+errorDiv+%3D+document.getElementById%28%22error%22%29%3B%0D%0A%0D%0A++++++emailInput.addEventListener%28%22input%22%2C+%28%29+%3D%3E+%7B%0D%0A++++++++if+%28emailInput.checkValidity%28%29%29+%7B%0D%0A++++++++++emailInput.className+%3D+%22valid%22%3B%0D%0A++++++++++errorDiv.textContent+%3D+%22%E2%9C%93+Valid+email%22%3B%0D%0A++++++++++errorDiv.style.color+%3D+%22green%22%3B%0D%0A++++++++%7D+else+%7B%0D%0A++++++++++emailInput.className+%3D+%22invalid%22%3B%0D%0A++++++++++errorDiv.textContent+%3D+%22%E2%9C%97+%22+%2B+emailInput.validationMessage%3B%0D%0A++++++++++errorDiv.style.color+%3D+%22red%22%3B%0D%0A++++++++%7D%0D%0A++++++%7D%29%3B%0D%0A++++%3C%2Fscript%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)** - Type different email formats and watch the validation!

---

**Providing Feedback**: Update UI based on validation:

```javascript
function showError(inputElement, message) {
  const errorDiv = inputElement.nextElementSibling;
  errorDiv.textContent = message;
  inputElement.classList.add("invalid");
}

function clearError(inputElement) {
  const errorDiv = inputElement.nextElementSibling;
  errorDiv.textContent = "";
  inputElement.classList.remove("invalid");
}
```

**Dynamic Button States**: Enable/disable based on form validity:

```javascript
function updateSubmitButton() {
  const submitBtn = document.getElementById("submitBtn");
  submitBtn.disabled = !form.checkValidity();
}
```

### Try It Yourself: Dynamic Button State

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      input {
        padding: 10px;
        margin: 10px 0;
        display: block;
        width: 250px;
      }
      button {
        padding: 12px 24px;
        margin-top: 10px;
      }
      button:disabled {
        background: #ccc;
        cursor: not-allowed;
      }
      button:not(:disabled) {
        background: #4caf50;
        color: white;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <h2>Enable Submit When Valid</h2>
    <form id="myForm">
      <input type="text" id="name" placeholder="Name (required)" required />
      <input type="email" id="email" placeholder="Email (required)" required />
      <button type="submit" id="submitBtn" disabled>Submit</button>
    </form>

    <script>
      const form = document.getElementById("myForm");
      const submitBtn = document.getElementById("submitBtn");

      form.addEventListener("input", () => {
        submitBtn.disabled = !form.checkValidity();
      });

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        alert("Form submitted successfully!");
      });
    </script>
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Chead%3E%0D%0A++++%3Cstyle%3E%0D%0A++++++input+%7B%0D%0A++++++++padding%3A+10px%3B%0D%0A++++++++margin%3A+10px+0%3B%0D%0A++++++++display%3A+block%3B%0D%0A++++++++width%3A+250px%3B%0D%0A++++++%7D%0D%0A++++++button+%7B%0D%0A++++++++padding%3A+12px+24px%3B%0D%0A++++++++margin-top%3A+10px%3B%0D%0A++++++%7D%0D%0A++++++button%3Adisabled+%7B%0D%0A++++++++background%3A+%23ccc%3B%0D%0A++++++++cursor%3A+not-allowed%3B%0D%0A++++++%7D%0D%0A++++++button%3Anot%28%3Adisabled%29+%7B%0D%0A++++++++background%3A+%234caf50%3B%0D%0A++++++++color%3A+white%3B%0D%0A++++++++cursor%3A+pointer%3B%0D%0A++++++%7D%0D%0A++++%3C%2Fstyle%3E%0D%0A++%3C%2Fhead%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Ch2%3EEnable+Submit+When+Valid%3C%2Fh2%3E%0D%0A++++%3Cform+id%3D%22myForm%22%3E%0D%0A++++++%3Cinput+type%3D%22text%22+id%3D%22name%22+placeholder%3D%22Name+%28required%29%22+required+%2F%3E%0D%0A++++++%3Cinput+type%3D%22email%22+id%3D%22email%22+placeholder%3D%22Email+%28required%29%22+required+%2F%3E%0D%0A++++++%3Cbutton+type%3D%22submit%22+id%3D%22submitBtn%22+disabled%3ESubmit%3C%2Fbutton%3E%0D%0A++++%3C%2Fform%3E%0D%0A%0D%0A++++%3Cscript%3E%0D%0A++++++const+form+%3D+document.getElementById%28%22myForm%22%29%3B%0D%0A++++++const+submitBtn+%3D+document.getElementById%28%22submitBtn%22%29%3B%0D%0A%0D%0A++++++form.addEventListener%28%22input%22%2C+%28%29+%3D%3E+%7B%0D%0A++++++++submitBtn.disabled+%3D+%21form.checkValidity%28%29%3B%0D%0A++++++%7D%29%3B%0D%0A%0D%0A++++++form.addEventListener%28%22submit%22%2C+%28e%29+%3D%3E+%7B%0D%0A++++++++e.preventDefault%28%29%3B%0D%0A++++++++alert%28%22Form+submitted+successfully%21%22%29%3B%0D%0A++++++%7D%29%3B%0D%0A++++%3C%2Fscript%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)** - Fill in both fields to enable the button!

---

**Form Reset and Success States**:

```javascript
// After successful submission
form.reset(); // Clear all fields
showSuccessMessage();
setTimeout(() => hideSuccessMessage(), 3000);
```

### Key Concepts

1. **Progressive Enhancement**: Start with HTML validation, enhance with JavaScript
2. **Immediate Feedback**: Validate as users type for better UX
3. **Clear Error Messages**: Tell users exactly what's wrong
4. **Accessible Validation**: Use ARIA attributes and proper semantics
5. **Prevent Double Submission**: Disable button during processing

---

## Project: Interactive Contact Form

Now let's apply these concepts to create a fully interactive form with real-time validation and user feedback.

---

## Objectives

By completing this project you will:

- Validate form inputs in real-time
- Provide accessible error messages
- Enable/disable the submit button based on validity
- Simulate async form submission
- Show a dismissible success message

---

## Requirements Checklist

1. Disable the submit button until all required fields are valid.
2. Show inline error messages under each invalid field.
3. Highlight fields on focus (already done in CSS — enhance if desired).
4. Prevent submission when invalid and keep errors visible.
5. Simulate an async request (use setTimeout) before showing success.
6. Reset the form and disable button again after success.
7. Auto-hide success message after 3 seconds.
8. (Bonus) Add keyboard accessibility and ARIA attributes.

---

## Step-by-Step Guide

### 1. Form State & Elements

Get references to the form, button, and success message container.

### 2. Validation Function

Implement a function that checks `el.checkValidity()` and sets error text accordingly.

### 3. Real-Time Validation

Attach `input` and `blur` listeners to each input and textarea.

### 4. Submit Handling

On submit:

- Prevent default
- Validate all fields again
- Abort if invalid
- Simulate async call
- Show success

### 5. Reset Logic

After success:

- Reset the form
- Disable the submit button
- Hide success message after delay

---

## Bonus Ideas

- Add a loading spinner to the button while submitting
- Add character counters for the message
- Add localStorage persistence to restore unfinished drafts
- Integrate with a backend endpoint later

---

## Extension Tasks

If you finish early:

1. Add a newsletter opt-in checkbox with validation.
2. Animate the appearance of error messages.
3. Disable pasting into the message box (temporarily) to encourage original typing.
4. Add dark mode styling using a toggle button.

---

## Completion Criteria

You should have a form that:

- Cannot be submitted while invalid
- Gives immediate, clear feedback
- Shows a success state after simulated send
- Resets cleanly and is ready for new input

---

## Next Steps

In future lessons you'll:

- Style the interactive states further with transitions
- Connect the form to a real backend
- Add spam protection (honeypot / CAPTCHA)

---

## Try the Code

Practice JavaScript form validation with these exercises:

### Exercise 1:

Get a reference to an input element and log its value when a button is clicked.

```javascript
const input = document.getElementById("___");
const button = document.getElementById("___");

button.addEventListener("___", () => {
  console.log(input.___);
});
```

**[Submit Answer »](/playground?language=javascript&code=const+input+%3D+document.getElementById%28%22___%22%29%3B%0D%0Aconst+button+%3D+document.getElementById%28%22___%22%29%3B%0D%0A%0D%0Abutton.addEventListener%28%22___%22%2C+%28%29+%3D%3E+%7B%0D%0A++console.log%28input.___%29%3B%0D%0A%7D%29%3B)**

### Exercise 2:

Add an event listener that validates an email input on every keystroke.

```javascript
const emailInput = document.getElementById("email");

emailInput.addEventListener("___", () => {
  if (emailInput.___()) {
    // Email is valid
    emailInput.style.borderColor = "___";
  } else {
    // Email is invalid
    emailInput.style.borderColor = "___";
  }
});
```

**[Submit Answer »](/playground?language=javascript&code=const+emailInput+%3D+document.getElementById%28%22email%22%29%3B%0D%0A%0D%0AemailInput.addEventListener%28%22___%22%2C+%28%29+%3D%3E+%7B%0D%0A++if+%28emailInput.___%28%29%29+%7B%0D%0A++++%2F%2F+Email+is+valid%0D%0A++++emailInput.style.borderColor+%3D+%22___%22%3B%0D%0A++%7D+else+%7B%0D%0A++++%2F%2F+Email+is+invalid%0D%0A++++emailInput.style.borderColor+%3D+%22___%22%3B%0D%0A++%7D%0D%0A%7D%29%3B)**

### Exercise 3:

Create a function that enables a submit button only when a form is valid.

```javascript
const form = document.getElementById("myForm");
const submitBtn = document.getElementById("submitBtn");

function updateButton() {
  submitBtn.___ = !form.___();
}

form.addEventListener("___", updateButton);
```

**[Submit Answer »](/playground?language=javascript&code=const+form+%3D+document.getElementById%28%22myForm%22%29%3B%0D%0Aconst+submitBtn+%3D+document.getElementById%28%22submitBtn%22%29%3B%0D%0A%0D%0Afunction+updateButton%28%29+%7B%0D%0A++submitBtn.___+%3D+%21form.___%28%29%3B%0D%0A%7D%0D%0A%0D%0Aform.addEventListener%28%22___%22%2C+updateButton%29%3B)**

### Exercise 4:

Write a complete form submission handler that prevents default, validates all fields, and shows a success message.

```javascript
const form = document.getElementById("contactForm");

form.addEventListener("submit", (e) => {
  // Add your code here
});
```

**[Submit Answer »](/playground?language=javascript&code=const+form+%3D+document.getElementById%28%22contactForm%22%29%3B%0D%0A%0D%0Aform.addEventListener%28%22submit%22%2C+%28e%29+%3D%3E+%7B%0D%0A++%2F%2F+Add+your+code+here%0D%0A%7D%29%3B)**

---
