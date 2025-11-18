---
id: les_js_01
title: Intro to JavaScript
type: theory
estimatedMinutes: 40
order: 1
---

# Introduction to JavaScript

JavaScript is the programming language of the Web. Learn the basics and start making your web pages interactive!

---

## What is JavaScript?

JavaScript is a **programming language** that adds interactivity to your website. This happens in games, in the behavior of responses when buttons are pressed or with data entry on forms; with dynamic styling; with animation, etc.

---

## Why Learn JavaScript?

JavaScript is one of the **3 languages all web developers must learn**:

1. **HTML** to define the content of web pages
2. **CSS** to specify the layout of web pages
3. **JavaScript** to program the behavior of web pages

---

## JavaScript Can Change HTML Content

One of many JavaScript HTML methods is `getElementById()`.

The example below "finds" an HTML element (with id="demo"), and changes the element content (innerHTML) to "Hello JavaScript":

### Example

```html
<!DOCTYPE html>
<html>
  <body>
    <h2>What Can JavaScript Do?</h2>

    <p id="demo">JavaScript can change HTML content.</p>

    <button
      type="button"
      onclick="document.getElementById('demo').innerHTML = 'Hello JavaScript!'"
    >
      Click Me!
    </button>
  </body>
</html>
```

**[Try it Yourself »](/playground?language=html&code=%3C%21DOCTYPE+html%3E%0D%0A%3Chtml%3E%0D%0A++%3Cbody%3E%0D%0A++++%3Ch2%3EWhat+Can+JavaScript+Do%3F%3C%2Fh2%3E%0D%0A%0D%0A++++%3Cp+id%3D%22demo%22%3EJavaScript+can+change+HTML+content.%3C%2Fp%3E%0D%0A%0D%0A++++%3Cbutton%0D%0A++++++type%3D%22button%22%0D%0A++++++onclick%3D%22document.getElementById%28%27demo%27%29.innerHTML+%3D+%27Hello+JavaScript%21%27%22%0D%0A++++%3E%0D%0A++++++Click+Me%21%0D%0A++++%3C%2Fbutton%3E%0D%0A++%3C%2Fbody%3E%0D%0A%3C%2Fhtml%3E)**

> **Note:** JavaScript accepts both double and single quotes.

---

## JavaScript Can Change HTML Attribute Values

In this example JavaScript changes the value of the `src` (source) attribute of an `<img>` tag:

### Example

```html
<button onclick="document.getElementById('myImage').src='pic_bulbon.gif'">
  Turn on the light
</button>

<img id="myImage" src="pic_bulboff.gif" style="width:100px" />

<button onclick="document.getElementById('myImage').src='pic_bulboff.gif'">
  Turn off the light
</button>
```

---

## JavaScript Can Change HTML Styles (CSS)

Changing the style of an HTML element is a variant of changing an HTML attribute:

### Example

```html
<p id="demo">JavaScript can change the style of an HTML element.</p>

<button
  type="button"
  onclick="document.getElementById('demo').style.fontSize='35px'"
>
  Click Me!
</button>
```

---

## JavaScript Can Hide HTML Elements

Hiding HTML elements can be done by changing the `display` style:

### Example

```html
<p id="demo">This can be hidden!</p>

<button
  type="button"
  onclick="document.getElementById('demo').style.display='none'"
>
  Click to Hide
</button>
```

---

## JavaScript Can Show HTML Elements

Showing hidden HTML elements can also be done by changing the `display` style:

### Example

```html
<p id="demo" style="display:none">Now you see me!</p>

<button
  type="button"
  onclick="document.getElementById('demo').style.display='block'"
>
  Click to Show
</button>
```

---

## Where to Put JavaScript

In HTML, JavaScript code is inserted between `<script>` and `</script>` tags.

### Example

```html
<script>
  document.getElementById("demo").innerHTML = "My First JavaScript";
</script>
```

---

## JavaScript in `<head>` or `<body>`

You can place any number of scripts in an HTML document.

Scripts can be placed in the `<body>`, or in the `<head>` section of an HTML page, or in both.

### JavaScript in `<head>`

```html
<!DOCTYPE html>
<html>
  <head>
    <script>
      function myFunction() {
        document.getElementById("demo").innerHTML = "Paragraph changed.";
      }
    </script>
  </head>
  <body>
    <h2>JavaScript in Head</h2>
    <p id="demo">A Paragraph.</p>
    <button type="button" onclick="myFunction()">Try it</button>
  </body>
</html>
```

### JavaScript in `<body>`

```html
<!DOCTYPE html>
<html>
  <body>
    <h2>JavaScript in Body</h2>
    <p id="demo">A Paragraph.</p>
    <button type="button" onclick="myFunction()">Try it</button>

    <script>
      function myFunction() {
        document.getElementById("demo").innerHTML = "Paragraph changed.";
      }
    </script>
  </body>
</html>
```

> **Tip:** Placing scripts at the bottom of the `<body>` element improves the display speed, because script interpretation slows down the display.

---

## External JavaScript

Scripts can also be placed in external files.

**External file: myScript.js**

```javascript
function myFunction() {
  document.getElementById("demo").innerHTML = "Paragraph changed.";
}
```

External scripts are practical when the same code is used in many different web pages.

JavaScript files have the file extension `.js`.

To use an external script, put the name of the script file in the `src` (source) attribute of a `<script>` tag:

### Example

```html
<script src="myScript.js"></script>
```

You can place an external script reference in `<head>` or `<body>` as you like.

---

## External JavaScript Advantages

Placing scripts in external files has some advantages:

- It separates HTML and code
- It makes HTML and JavaScript easier to read and maintain
- Cached JavaScript files can speed up page loads

---

## JavaScript Output

JavaScript can "display" data in different ways:

1. Writing into an HTML element, using `innerHTML`
2. Writing into the HTML output using `document.write()`
3. Writing into an alert box, using `window.alert()`
4. Writing into the browser console, using `console.log()`

---

## Using innerHTML

To access an HTML element, JavaScript can use the `document.getElementById(id)` method.

The `id` attribute defines the HTML element. The `innerHTML` property defines the HTML content:

### Example

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>My First Web Page</h1>
    <p>My First Paragraph</p>

    <p id="demo"></p>

    <script>
      document.getElementById("demo").innerHTML = 5 + 6;
    </script>
  </body>
</html>
```

---

## Using document.write()

For testing purposes, it is convenient to use `document.write()`:

### Example

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>My First Web Page</h1>
    <p>My first paragraph.</p>

    <script>
      document.write(5 + 6);
    </script>
  </body>
</html>
```

> **Warning:** Using document.write() after an HTML document is loaded, will delete all existing HTML!

---

## Using window.alert()

You can use an alert box to display data:

### Example

```html
<!DOCTYPE html>
<html>
  <body>
    <h1>My First Web Page</h1>
    <p>My first paragraph.</p>

    <script>
      window.alert(5 + 6);
    </script>
  </body>
</html>
```

You can skip the `window` keyword. In JavaScript, the window object is the global scope object, that means that variables, properties, and methods by default belong to the window object.

---

## Using console.log()

For debugging purposes, you can call the `console.log()` method in the browser to display data:

### Example

```html
<!DOCTYPE html>
<html>
  <body>
    <script>
      console.log(5 + 6);
    </script>
  </body>
</html>
```

---

## JavaScript Statements

A **computer program** is a list of "instructions" to be "executed" by a computer.

In a programming language, these programming instructions are called **statements**.

A **JavaScript program** is a list of programming **statements**.

### Example

```javascript
let x, y, z; // Statement 1
x = 5; // Statement 2
y = 6; // Statement 3
z = x + y; // Statement 4
```

---

## Semicolons ;

Semicolons separate JavaScript statements.

Add a semicolon at the end of each executable statement:

```javascript
let a, b, c;
a = 5;
b = 6;
c = a + b;
```

When separated by semicolons, multiple statements on one line are allowed:

```javascript
a = 5;
b = 6;
c = a + b;
```

---

## JavaScript Comments

Not all JavaScript statements are "executed".

Code after double slashes `//` or between `/*` and `*/` is treated as a **comment**.

Comments are ignored, and will not be executed:

```javascript
// This is a single-line comment
let x = 5; // Another comment

/*
This is a
multi-line comment
*/
let y = 10;
```

---

## JavaScript is Case Sensitive

All JavaScript identifiers are **case sensitive**.

The variables `lastName` and `lastname`, are two different variables:

```javascript
let lastname, lastName;
lastName = "Doe";
lastname = "Peterson";
```

JavaScript does not interpret **LET** or **Let** as the keyword **let**.

---

## Summary

- JavaScript is the programming language of the Web
- JavaScript can change HTML content, attributes, and styles
- JavaScript can be placed in `<head>`, `<body>`, or external `.js` files
- JavaScript can output data using: innerHTML, document.write(), window.alert(), console.log()
- JavaScript statements end with semicolons
- JavaScript is case sensitive
- Comments use `//` or `/* */`

---
