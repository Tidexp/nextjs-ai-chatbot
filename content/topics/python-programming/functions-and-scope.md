---
id: 764bdaf1-9ca0-4297-9819-f8578573536e
title: Functions and Scope
type: theory
estimatedMinutes: 25
order: 2
---

# Functions and Scope

**Learn how to create reusable code with functions and understand variable scope.**

---

## What are Functions?

Functions are reusable blocks of code that perform specific tasks. They help you:

- Organize code into logical pieces
- Avoid repetition (DRY principle: Don't Repeat Yourself)
- Make code easier to test and maintain

---

## Defining Functions

Use the `def` keyword to define a function:

### Example

```python
def greet():
    print("Hello, World!")

# Call the function
greet()
```

**Output:**

```
Hello, World!
```

**[Try it Yourself »](/playground?language=python)**

---

## Function Parameters

Functions can accept input values called parameters:

### Example

```python
def greet(name):
    print(f"Hello, {name}!")

greet("Alice")
greet("Bob")
```

**Output:**

```
Hello, Alice!
Hello, Bob!
```

**[Try it Yourself »](/playground?language=python)**

---

## Multiple Parameters

Functions can have multiple parameters:

### Example

```python
def add(a, b):
    result = a + b
    print(f"{a} + {b} = {result}")

add(5, 3)
add(10, 20)
```

**Output:**

```
5 + 3 = 8
10 + 20 = 30
```

**[Try it Yourself »](/playground?language=python)**

---

## Return Values

Use `return` to send a value back from a function:

### Example

```python
def add(a, b):
    return a + b

result = add(5, 3)
print(result)  # 8

# Use the result in an expression
total = add(10, 20) + add(5, 15)
print(total)  # 50
```

**[Try it Yourself »](/playground?language=python)**

---

## Default Parameters

Provide default values for parameters:

### Example

```python
def greet(name, greeting="Hello"):
    print(f"{greeting}, {name}!")

greet("Alice")  # Uses default greeting
greet("Bob", "Hi")  # Custom greeting
```

**Output:**

```
Hello, Alice!
Hi, Bob!
```

**[Try it Yourself »](/playground?language=python)**

---

## Keyword Arguments

Call functions using parameter names:

### Example

```python
def describe_person(name, age, city):
    print(f"{name} is {age} years old and lives in {city}")

# Positional arguments
describe_person("Alice", 25, "New York")

# Keyword arguments (order doesn't matter)
describe_person(city="Boston", name="Bob", age=30)
```

**[Try it Yourself »](/playground?language=python)**

---

## Docstrings

Document your functions with docstrings:

### Example

```python
def calculate_area(width, height):
    """
    Calculate the area of a rectangle.

    Args:
        width: The width of the rectangle
        height: The height of the rectangle

    Returns:
        The area (width * height)
    """
    return width * height

# Access the docstring
print(calculate_area.__doc__)
```

**[Try it Yourself »](/playground?language=python)**

> **Best Practice:** Always document your functions with docstrings!

---

## Variable Scope

Scope determines where variables can be accessed:

### Local Scope

Variables defined inside a function are **local**:

```python
def my_function():
    x = 10  # Local variable
    print(x)

my_function()
print(x)  # ERROR! x doesn't exist here
```

### Global Scope

Variables defined outside functions are **global**:

```python
x = 10  # Global variable

def my_function():
    print(x)  # Can read global variable

my_function()  # 10
print(x)  # 10
```

**[Try it Yourself »](/playground?language=python)**

---

## Modifying Global Variables

Use the `global` keyword to modify global variables:

### Example

```python
counter = 0

def increment():
    global counter
    counter += 1

increment()
increment()
print(counter)  # 2
```

**[Try it Yourself »](/playground?language=python)**

> **Note:** Avoid global variables when possible. Pass values as parameters instead.

---

## Return Multiple Values

Functions can return multiple values:

### Example

```python
def get_stats(numbers):
    total = sum(numbers)
    count = len(numbers)
    average = total / count
    return total, count, average

total, count, avg = get_stats([1, 2, 3, 4, 5])
print(f"Total: {total}, Count: {count}, Average: {avg}")
```

**Output:**

```
Total: 15, Count: 5, Average: 3.0
```

**[Try it Yourself »](/playground?language=python)**

---

## Lambda Functions

Create small anonymous functions with `lambda`:

### Example

```python
# Regular function
def square(x):
    return x ** 2

# Lambda equivalent
square = lambda x: x ** 2

print(square(5))  # 25
```

Lambda functions are useful for short operations:

```python
numbers = [1, 2, 3, 4, 5]
squared = list(map(lambda x: x ** 2, numbers))
print(squared)  # [1, 4, 9, 16, 25]
```

**[Try it Yourself »](/playground?language=python)**

---

## Practical Example: Temperature Converter

Let's refactor our temperature converter using functions:

```python
def celsius_to_fahrenheit(celsius):
    """Convert Celsius to Fahrenheit."""
    return celsius * 9/5 + 32

def fahrenheit_to_celsius(fahrenheit):
    """Convert Fahrenheit to Celsius."""
    return (fahrenheit - 32) * 5/9

# Use the functions
temp_c = 25
temp_f = celsius_to_fahrenheit(temp_c)
print(f"{temp_c}°C = {temp_f}°F")

temp_f = 77
temp_c = fahrenheit_to_celsius(temp_f)
print(f"{temp_f}°F = {temp_c}°C")
```

**[Try it Yourself »](/playground?language=python)**

---

## Best Practices

1. **Use descriptive names**: `calculate_total()` not `calc()`
2. **Keep functions focused**: One function, one task
3. **Add docstrings**: Document what the function does
4. **Limit parameters**: 3-4 parameters maximum (use objects for more)
5. **Return early**: Exit functions as soon as possible
6. **Avoid side effects**: Functions should be predictable

---

## Common Patterns

### Validation Function

```python
def is_valid_email(email):
    """Check if email format is valid."""
    return "@" in email and "." in email.split("@")[1]
```

### Helper Function

```python
def format_price(amount):
    """Format amount as currency."""
    return f"${amount:.2f}"
```

### Factory Function

```python
def create_person(name, age):
    """Create a person dictionary."""
    return {"name": name, "age": age}
```

---

## Practice Exercise

Create a function `is_prime(n)` that:

1. Takes a number as input
2. Returns `True` if the number is prime
3. Returns `False` otherwise

```python
def is_prime(n):
    # Your code here
    pass

# Test cases
print(is_prime(7))   # True
print(is_prime(10))  # False
print(is_prime(13))  # True
```

**[Submit Answer »](#)**

---
