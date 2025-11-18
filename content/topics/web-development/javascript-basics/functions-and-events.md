---
id: les_js_03
title: Functions & Events
type: theory
estimatedMinutes: 50
order: 3
---

# JavaScript Functions & Events

Learn how to write reusable code with functions and make your web pages interactive with events.

---

## JavaScript Functions

A JavaScript function is a block of code designed to perform a particular task.

A JavaScript function is executed when "something" invokes it (calls it).

### Function Syntax

```javascript
function functionName(parameter1, parameter2, parameter3) {
  // code to be executed
}
```

### Example

```javascript
function greet(name) {
  return "Hello, " + name + "!";
}

let message = greet("John");
console.log(message); // Output: Hello, John!
```

---

## Function Invocation

The code inside the function will execute when "something" **invokes** (calls) the function:

- When an event occurs (when a user clicks a button)
- When it is invoked (called) from JavaScript code
- Automatically (self invoked)

### Example

```html
<!DOCTYPE html>
<html>
  <body>
    <p>Click the button to call a function.</p>

    <button onclick="myFunction()">Click me</button>

    <p id="demo"></p>

    <script>
      function myFunction() {
        document.getElementById("demo").innerHTML = "Hello World!";
      }
    </script>
  </body>
</html>
```

---

## Function Return

When JavaScript reaches a `return` statement, the function will stop executing.

If the function was invoked from a statement, JavaScript will "return" to execute the code after the invoking statement.

Functions often compute a **return value**. The return value is "returned" back to the "caller":

### Example

Calculate the product of two numbers, and return the result:

```javascript
function multiply(a, b) {
  return a * b;
}

let result = multiply(4, 3);
console.log(result); // Output: 12
```

---

## Why Functions?

You can reuse code: Define the code once, and use it many times.

You can use the same code many times with different arguments, to produce different results.

### Example

Convert Fahrenheit to Celsius:

```javascript
function toCelsius(fahrenheit) {
  return (5 / 9) * (fahrenheit - 32);
}

console.log(toCelsius(77)); // Output: 25
console.log(toCelsius(32)); // Output: 0
console.log(toCelsius(212)); // Output: 100
```

---

## Functions with Multiple Parameters

Functions can accept multiple parameters:

```javascript
function calculateArea(width, height) {
  return width * height;
}

let area = calculateArea(5, 10);
console.log(area); // Output: 50
```

---

## Functions with Default Parameters

You can assign default values to parameters:

```javascript
function greet(name = "Guest") {
  return "Hello, " + name + "!";
}

console.log(greet("Alice")); // Output: Hello, Alice!
console.log(greet()); // Output: Hello, Guest!
```

---

## Arrow Functions (ES6)

Arrow functions provide a shorter syntax for writing functions:

### Traditional Function

```javascript
function add(a, b) {
  return a + b;
}
```

### Arrow Function

```javascript
const add = (a, b) => {
  return a + b;
};
```

### Short Arrow Function

If the function has only one statement that returns a value, you can remove the braces and the `return` keyword:

```javascript
const add = (a, b) => a + b;
```

### Single Parameter

If you have only one parameter, you can skip the parentheses:

```javascript
const square = (x) => x * x;
```

---

## JavaScript Events

HTML events are "things" that happen to HTML elements.

When JavaScript is used in HTML pages, JavaScript can "react" on these events.

---

## HTML Events

An HTML event can be something the browser does, or something a user does.

Here are some examples of HTML events:

- An HTML web page has finished loading
- An HTML input field was changed
- An HTML button was clicked

Often, when events happen, you may want to do something.

JavaScript lets you execute code when events are detected.

---

## Common HTML Events

| Event         | Description                                        |
| ------------- | -------------------------------------------------- |
| `onchange`    | An HTML element has been changed                   |
| `onclick`     | The user clicks an HTML element                    |
| `onmouseover` | The user moves the mouse over an HTML element      |
| `onmouseout`  | The user moves the mouse away from an HTML element |
| `onkeydown`   | The user pushes a keyboard key                     |
| `onload`      | The browser has finished loading the page          |
| `onfocus`     | An element gets focus                              |
| `onblur`      | An element loses focus                             |
| `onsubmit`    | A form is submitted                                |

---

## Event Handlers

### Inline Event Handlers

```html
<button onclick="alert('Hello!')">Click me</button>
```

### Calling a Function

```html
<button onclick="myFunction()">Click me</button>

<script>
  function myFunction() {
    alert("Button was clicked!");
  }
</script>
```

---

## addEventListener()

The `addEventListener()` method attaches an event handler to an element without overwriting existing event handlers.

You can add many event handlers to one element.

### Syntax

```javascript
element.addEventListener(event, function, useCapture);
```

### Example

```html
<button id="myBtn">Click me</button>

<script>
  document.getElementById("myBtn").addEventListener("click", function () {
    alert("Button was clicked!");
  });
</script>
```

---

## Multiple Event Listeners

You can add many event handlers to the same element:

```javascript
const btn = document.getElementById("myBtn");

btn.addEventListener("click", function () {
  alert("Hello!");
});

btn.addEventListener("click", function () {
  console.log("Button clicked!");
});

btn.addEventListener("mouseover", function () {
  this.style.backgroundColor = "yellow";
});

btn.addEventListener("mouseout", function () {
  this.style.backgroundColor = "";
});
```

---

## Event Object

When an event occurs, an event object is passed to the event handler function:

```javascript
document.getElementById("myBtn").addEventListener("click", function (event) {
  console.log("Event type: " + event.type);
  console.log("Target element: " + event.target.tagName);
});
```

---

## Common Event Examples

### onclick Event

```html
<button id="myBtn">Click me</button>

<script>
  document.getElementById("myBtn").onclick = function () {
    document.getElementById("demo").innerHTML = "Button was clicked!";
  };
</script>
```

### onchange Event

```html
<input type="text" id="myInput" />

<script>
  document.getElementById("myInput").onchange = function () {
    console.log("Input value changed to: " + this.value);
  };
</script>
```

### onmouseover and onmouseout

```html
<div id="myDiv" style="width:200px;height:100px;background:lightblue;">
  Hover over me!
</div>

<script>
  const div = document.getElementById("myDiv");

  div.onmouseover = function () {
    this.style.backgroundColor = "yellow";
  };

  div.onmouseout = function () {
    this.style.backgroundColor = "lightblue";
  };
</script>
```

### onkeydown Event

```html
<input type="text" id="myInput" placeholder="Type something..." />

<script>
  document.getElementById("myInput").onkeydown = function (event) {
    console.log("Key pressed: " + event.key);
  };
</script>
```

---

## Form Events

### onsubmit Event

```html
<form id="myForm">
  <input type="text" name="username" required />
  <button type="submit">Submit</button>
</form>

<script>
  document.getElementById("myForm").onsubmit = function (event) {
    event.preventDefault(); // Prevent form from submitting
    console.log("Form submitted!");

    // Get form data
    const formData = new FormData(this);
    console.log("Username: " + formData.get("username"));
  };
</script>
```

### onfocus and onblur

```html
<input type="text" id="myInput" placeholder="Click here" />

<script>
  const input = document.getElementById("myInput");

  input.onfocus = function () {
    this.style.backgroundColor = "yellow";
  };

  input.onblur = function () {
    this.style.backgroundColor = "";
  };
</script>
```

---

## Preventing Default Behavior

Use `preventDefault()` to prevent the default action of an event:

```javascript
document.getElementById("myLink").addEventListener("click", function (event) {
  event.preventDefault();
  console.log("Link click prevented!");
});
```

---

## Event Bubbling vs Capturing

### Event Bubbling (default)

The event bubbles up from the target element to the root:

```javascript
element.addEventListener(
  "click",
  function () {
    // Event handler
  },
  false
); // false = bubbling (default)
```

### Event Capturing

The event is captured on its way down to the target element:

```javascript
element.addEventListener(
  "click",
  function () {
    // Event handler
  },
  true
); // true = capturing
```

---

## Removing Event Listeners

Use `removeEventListener()` to remove an event handler:

```javascript
function myFunction() {
  alert("Hello!");
}

const btn = document.getElementById("myBtn");

// Add event listener
btn.addEventListener("click", myFunction);

// Remove event listener
btn.removeEventListener("click", myFunction);
```

> **Note:** You need to pass the same function reference to remove an event listener.

---

## Practical Example: Toggle Button

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      .box {
        width: 200px;
        height: 200px;
        background-color: lightblue;
        display: none;
        transition: all 0.3s ease;
      }

      .box.show {
        display: block;
      }
    </style>
  </head>
  <body>
    <button id="toggleBtn">Toggle Box</button>
    <div class="box" id="myBox"></div>

    <script>
      document
        .getElementById("toggleBtn")
        .addEventListener("click", function () {
          const box = document.getElementById("myBox");
          box.classList.toggle("show");

          if (box.classList.contains("show")) {
            this.textContent = "Hide Box";
          } else {
            this.textContent = "Show Box";
          }
        });
    </script>
  </body>
</html>
```

---

## Summary

- **Functions** are reusable blocks of code
- Functions can have parameters and return values
- Arrow functions provide shorter syntax
- **Events** are actions that happen in the browser
- Common events: click, change, mouseover, keydown, submit
- Use `addEventListener()` to attach event handlers
- Use `event.preventDefault()` to prevent default behavior
- Event object contains information about the event
- You can add multiple event listeners to one element

---
