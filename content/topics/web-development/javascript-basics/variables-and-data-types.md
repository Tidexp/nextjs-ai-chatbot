---
id: les_js_02
title: Variables & Data Types
type: theory
estimatedMinutes: 45
order: 2
starterCode: |
  // Variable declarations and types
  const pi = 3.14;
  let count = 0;
  let name = "Alice";
  let isActive = true;
  let items = [1, 2, 3];
  let user = { id: 1, role: "admin" };
  console.log(typeof pi, typeof name, typeof isActive);
language: javascript
---

# Variables & Data Types

Variables are **Containers** for Storing Data

JavaScript Variables can be declared in 4 ways:

- Automatically
- Using `var`
- Using `let`
- Using `const`

---

## When to Use var, let, or const?

1. Always declare variables
2. Always use `const` if the value should not be changed
3. Always use `const` if the type should not be changed (Arrays and Objects)
4. Only use `let` if you can't use `const`
5. Only use `var` if you MUST support old browsers.

---

## What are Variables?

Variables are containers for storing values.

In this example, `x`, `y`, and `z`, are variables, declared with the `var` keyword:

### Example

```javascript
var x = 5;
var y = 6;
var z = x + y;
console.log("z equals:", z);
```

**[Try it Yourself »](/playground?language=javascript&code=var%20x%20%3D%205%3B%0Avar%20y%20%3D%206%3B%0Avar%20z%20%3D%20x%20%2B%20y%3B%0Aconsole.log(%22z%20equals%3A%22%2C%20z)%3B)**

From the example above, you can expect:

- x stores the value 5
- y stores the value 6
- z stores the value 11

---

## Using let

### Example

```javascript
let x = 5;
let y = 6;
let z = x + y;
console.log("z equals:", z);
```

**[Try it Yourself »](/playground?language=javascript&code=let%20x%20%3D%205%3B%0Alet%20y%20%3D%206%3B%0Alet%20z%20%3D%20x%20%2B%20y%3B%0Aconsole.log(%22z%20equals%3A%22%2C%20z)%3B)**

> **Note:** The `let` keyword was introduced in ES6 (2015)
>
> Variables declared with `let` have **Block Scope**
>
> Variables declared with `let` must be **Declared** before use
>
> Variables declared with `let` cannot be **Redeclared** in the same scope

---

## Using const

### Example

```javascript
const x = 5;
const y = 6;
const z = x + y;
console.log("z equals:", z);
```

**[Try it Yourself »](/playground?language=javascript&code=const%20x%20%3D%205%3B%0Aconst%20y%20%3D%206%3B%0Aconst%20z%20%3D%20x%20%2B%20y%3B%0Aconsole.log(%22z%20equals%3A%22%2C%20z)%3B)**

> **Note:** The `const` keyword was introduced in ES6 (2015)
>
> Variables defined with `const` have **Block Scope**
>
> Variables defined with `const` cannot be **Redeclared**
>
> Variables defined with `const` cannot be **Reassigned**
>
> Variables defined with `const` must be **Assigned** a value when they are declared

---

## When to use JavaScript const?

**Always declare a variable with `const` when you know that the value should not be changed.**

Use `const` when you declare:

- A new Array
- A new Object
- A new Function
- A new RegExp

---

## JavaScript Identifiers

All JavaScript **variables** must be **identified** with **unique names**.

These unique names are called **identifiers**.

Identifiers can be short names (like x and y) or more descriptive names (age, sum, totalVolume).

The general rules for constructing names for variables (unique identifiers) are:

- Names can contain letters, digits, underscores, and dollar signs.
- Names must begin with a letter.
- Names can also begin with $ and \_ (but we will not use it in this tutorial).
- Names are case sensitive (y and Y are different variables).
- Reserved words (like JavaScript keywords) cannot be used as names.

> **Note:** JavaScript identifiers are **case-sensitive**.

---

## The Assignment Operator

In JavaScript, the equal sign (`=`) is an "assignment" operator, not an "equal to" operator.

This is different from algebra. The following does not make sense in algebra:

```javascript
x = x + 5;
```

In JavaScript, however, it makes perfect sense: it assigns the value of x + 5 to x.

(It calculates the value of x + 5 and puts the result into x. The value of x is incremented by 5.)

> **Note:** The "equal to" operator is written like `==` in JavaScript.

---

## JavaScript Data Types

JavaScript variables can hold numbers like 100 and text values like "John Doe".

In programming, text values are called text strings.

JavaScript can handle many types of data, but for now, just think of numbers and strings.

Strings are written inside double or single quotes. Numbers are written without quotes.

If you put a number in quotes, it will be treated as a text string.

### Example

```javascript
const pi = 3.14;
let person = "John Doe";
let answer = "Yes I am!";
```

**[Try it Yourself »](/playground?language=javascript&code=const+pi+%3D+3.14%3B%0D%0Alet+person+%3D+%22John+Doe%22%3B%0D%0Alet+answer+%3D+%22Yes+I+am%21%22%3B)**

---

## Declaring a JavaScript Variable

Creating a variable in JavaScript is called "declaring" a variable.

You declare a JavaScript variable with the `var` or the `let` keyword:

```javascript
var carName;
```

or:

```javascript
let carName;
```

After the declaration, the variable has no value (technically it is `undefined`).

To **assign** a value to the variable, use the equal sign:

```javascript
carName = "Volvo";
```

You can also assign a value to the variable when you declare it:

```javascript
let carName = "Volvo";
```

In the example below, we create a variable called `carName` and assign the value "Volvo" to it.

Then we "output" the value inside an HTML paragraph with id="demo":

### Example

```html
<p id="demo"></p>

<script>
  let carName = "Volvo";
  document.getElementById("demo").innerHTML = carName;
</script>
```

**[Try it Yourself »](/playground?language=html&code=%3Cp+id%3D%22demo%22%3E%3C%2Fp%3E%0D%0A%0D%0A%3Cscript%3E%0D%0A++let+carName+%3D+%22Volvo%22%3B%0D%0A++document.getElementById%28%22demo%22%29.innerHTML+%3D+carName%3B%0D%0A%3C%2Fscript%3E)**

> **Note:** It's a good programming practice to declare all variables at the beginning of a script.

---

## One Statement, Many Variables

You can declare many variables in one statement.

Start the statement with `let` and separate the variables by **comma**:

### Example

```javascript
let person = "John Doe",
  carName = "Volvo",
  price = 200;
```

**[Try it Yourself »](/playground?language=javascript&code=let+person+%3D+%22John+Doe%22%2C%0D%0A++carName+%3D+%22Volvo%22%2C%0D%0A++price+%3D+200%3B)**

A declaration can span multiple lines:

### Example

```javascript
let person = "John Doe",
  carName = "Volvo",
  price = 200;
```

**[Try it Yourself »](/playground?language=javascript&code=let+person+%3D+%22John+Doe%22%2C%0D%0A++carName+%3D+%22Volvo%22%2C%0D%0A++price+%3D+200%3B)**

---

## Value = undefined

In computer programs, variables are often declared without a value. The value can be something that has to be calculated, or something that will be provided later, like user input.

A variable declared without a value will have the value `undefined`.

The variable `carName` will have the value `undefined` after the execution of this statement:

### Example

```javascript
let carName;
```

**[Try it Yourself »](/playground?language=javascript&code=let+carName%3B)**

---

## Re-Declaring JavaScript Variables

If you re-declare a JavaScript variable declared with `var`, it will not lose its value.

The variable `carName` will still have the value "Volvo" after the execution of these statements:

### Example

```javascript
var carName = "Volvo";
var carName;
```

**[Try it Yourself »](/playground?language=javascript&code=var+carName+%3D+%22Volvo%22%3B%0D%0Avar+carName%3B)**

> **Note:** You cannot re-declare a variable declared with `let` or `const`.
>
> This will not work:
>
> ```javascript
> let carName = "Volvo";
> let carName;
> ```

---

## JavaScript Dollar Sign $

Since JavaScript treats a dollar sign as a letter, identifiers containing $ are valid variable names:

### Example

```javascript
let $ = "Hello World";
let $$$ = 2;
let $myMoney = 5;
```

**[Try it Yourself »](/playground?language=javascript&code=let+%24+%3D+%22Hello+World%22%3B%0D%0Alet+%24%24%24+%3D+2%3B%0D%0Alet+%24myMoney+%3D+5%3B)**

Using the dollar sign is not very common in JavaScript, but professional programmers often use it as an alias for the main function in a JavaScript library.

In the JavaScript library jQuery, for instance, the main function `$` is used to select HTML elements. In jQuery `$("p");` means "select all p elements".

---

## JavaScript Underscore (\_)

Since JavaScript treats underscore as a letter, identifiers containing \_ are valid variable names:

### Example

```javascript
let _lastName = "Johnson";
let _x = 2;
let _100 = 5;
```

**[Try it Yourself »](/playground?language=javascript&code=let+_lastName+%3D+%22Johnson%22%3B%0D%0Alet+_x+%3D+2%3B%0D%0Alet+_100+%3D+5%3B)**

Using the underscore is not very common in JavaScript, but a convention among professional programmers is to use it as an alias for "private (hidden)" variables.

---

## Test Yourself With Exercises

### Exercise 1:

Create a variable called `carName`, assign the value `Volvo` to it.

```javascript
___ ___ = ___;
```

**[Submit Answer »](/playground?language=javascript&code=___+___+%3D+___%3B)**

### Exercise 2:

Create a variable called `x`, assign the value `50` to it.

```javascript
___ ___ = ___;
```

**[Submit Answer »](/playground?language=javascript&code=___+___+%3D+___%3B)**

---
