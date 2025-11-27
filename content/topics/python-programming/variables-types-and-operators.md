---
id: 580d93ca-2850-41a4-aecf-92c077247114
title: Variables, Types, and Operators
type: theory
estimatedMinutes: 25
order: 2
---

# Variables, Types, and Operators

**Learn about Python's fundamental data types and how to work with them.**

---

## Variables in Python

A variable is a container for storing data values. In Python, you don't need to declare the type of a variable.

### Example

```python
x = 5
name = "Alice"
is_active = True
```

**[Try it Yourself »](/playground?language=python)**

---

## Python Data Types

Python has several built-in data types:

| Type    | Description         | Example           |
| ------- | ------------------- | ----------------- |
| `int`   | Integer numbers     | `42`              |
| `float` | Decimal numbers     | `3.14`            |
| `str`   | Text strings        | `"Hello"`         |
| `bool`  | True/False values   | `True`            |
| `list`  | Ordered collections | `[1, 2, 3]`       |
| `dict`  | Key-value pairs     | `{"name": "Bob"}` |

---

## Numbers: int and float

Python supports integers and floating-point numbers:

### Example

```python
age = 25          # int
price = 19.99     # float
temperature = -5  # negative int

# Arithmetic operations
total = age + 10
discounted = price * 0.8
```

**[Try it Yourself »](/playground?language=python)**

---

## Strings

Strings are sequences of characters enclosed in quotes:

### Example

```python
name = "Python"
message = 'Hello, World!'
multiline = """This is
a multiline
string"""

# String concatenation
greeting = "Hello, " + name
```

**[Try it Yourself »](/playground?language=python)**

### String Formatting with f-strings

F-strings provide a convenient way to embed expressions:

```python
name = "Alice"
age = 30
message = f"My name is {name} and I am {age} years old"
print(message)
# Output: My name is Alice and I am 30 years old
```

---

## Booleans

Boolean values represent truth values:

### Example

```python
is_valid = True
is_complete = False

# Boolean expressions
result = 5 > 3  # True
check = 10 == 20  # False
```

**[Try it Yourself »](/playground?language=python)**

---

## Operators

Python supports various operators:

### Arithmetic Operators

| Operator | Description    | Example       |
| -------- | -------------- | ------------- |
| `+`      | Addition       | `5 + 3` = 8   |
| `-`      | Subtraction    | `5 - 3` = 2   |
| `*`      | Multiplication | `5 * 3` = 15  |
| `/`      | Division       | `5 / 2` = 2.5 |
| `//`     | Floor division | `5 // 2` = 2  |
| `%`      | Modulus        | `5 % 2` = 1   |
| `**`     | Exponentiation | `5 ** 2` = 25 |

### Comparison Operators

| Operator | Description           |
| -------- | --------------------- |
| `==`     | Equal to              |
| `!=`     | Not equal to          |
| `>`      | Greater than          |
| `<`      | Less than             |
| `>=`     | Greater than or equal |
| `<=`     | Less than or equal    |

### Logical Operators

| Operator | Description                         |
| -------- | ----------------------------------- |
| `and`    | Both conditions must be True        |
| `or`     | At least one condition must be True |
| `not`    | Reverses the boolean value          |

---

## Type Conversion

Convert between different data types:

### Example

```python
# String to int
age = int("25")

# Int to string
text = str(42)

# String to float
price = float("19.99")

# Int to float
decimal = float(10)
```

**[Try it Yourself »](/playground?language=python)**

---

## Practice Exercise

Try creating variables of different types and perform operations on them:

```python
# Create variables
name = "Your Name"
age = 25
height = 1.75
is_student = True

# Perform operations
next_year_age = age + 1
info = f"{name} is {age} years old and {height}m tall"
print(info)
```

**[Submit Answer »](#)**

---
