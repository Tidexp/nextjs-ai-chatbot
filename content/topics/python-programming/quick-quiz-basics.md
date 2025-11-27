---
id: 21530d5a-ca4d-423b-9a6e-fbfb0dd84f87
title: "Quick Quiz: Basics"
type: quiz
estimatedMinutes: 10
order: 4
content: |
  Sample questions:
  1) Which type represents text? (str)
  2) What does == do? (equality)
  3) How to run a script? (python file.py)
  4) Name a numeric type. (int/float)
  5) Show an f-string example: f"Value: {x}"
---

# Quick Quiz: Python Basics

**Test your understanding of Python fundamentals.**

---

## Question 1: Data Types

**Which Python type represents text?**

A) `int`  
B) `float`  
C) `str`  
D) `bool`

<details>
<summary>Show Answer</summary>

**Answer: C) `str`**

The `str` type (string) represents text in Python. Strings are enclosed in quotes:

```python
name = "Alice"  # This is a string
message = 'Hello'  # Also a string
```

</details>

---

## Question 2: Operators

**What does the `==` operator do in Python?**

A) Assigns a value to a variable  
B) Compares two values for equality  
C) Adds two numbers  
D) Converts to a string

<details>
<summary>Show Answer</summary>

**Answer: B) Compares two values for equality**

The `==` operator checks if two values are equal and returns `True` or `False`:

```python
x = 5
result = x == 5  # True
result = x == 10  # False
```

Note: Don't confuse `==` (comparison) with `=` (assignment)!

</details>

---

## Question 3: Running Python

**How do you run a Python script from the command line?**

A) `run file.py`  
B) `execute file.py`  
C) `python file.py`  
D) `start file.py`

<details>
<summary>Show Answer</summary>

**Answer: C) `python file.py`**

To run a Python script, use the `python` command followed by the filename:

```bash
python file.py
```

Or on some systems:

```bash
python3 file.py
```

</details>

---

## Question 4: Numeric Types

**Name a Python type used for numeric values.**

(Multiple correct answers: `int`, `float`)

<details>
<summary>Show Answer</summary>

**Answer: `int` or `float`**

Python has two main numeric types:

- **`int`**: Integer numbers (whole numbers)

  ```python
  age = 25
  count = -10
  ```

- **`float`**: Floating-point numbers (decimals)
  ```python
  price = 19.99
  temperature = -3.5
  ```

</details>

---

## Question 5: String Formatting

**Complete this f-string to display a variable's value:**

```python
x = 42
message = f"Value: ___"
```

A) `{x}`  
B) `%x`  
C) `$x`  
D) `(x)`

<details>
<summary>Show Answer</summary>

**Answer: A) `{x}`**

F-strings use curly braces `{}` to embed expressions:

```python
x = 42
message = f"Value: {x}"
print(message)  # Output: Value: 42
```

You can also include expressions:

```python
a = 10
b = 20
result = f"Sum: {a + b}"  # Sum: 30
```

</details>

---

## Question 6: Variable Assignment

**What is the correct way to create a variable in Python?**

A) `var x = 5`  
B) `int x = 5`  
C) `x = 5`  
D) `let x = 5`

<details>
<summary>Show Answer</summary>

**Answer: C) `x = 5`**

Python uses simple assignment with `=`:

```python
x = 5
name = "Alice"
is_valid = True
```

No type declaration is needed - Python automatically determines the type!

</details>

---

## Question 7: Boolean Values

**Which of these is NOT a valid Boolean value in Python?**

A) `True`  
B) `False`  
C) `true`  
D) `not True`

<details>
<summary>Show Answer</summary>

**Answer: C) `true`**

Python's Boolean values are capitalized: `True` and `False` (not lowercase).

```python
is_valid = True   # Correct
is_active = False  # Correct
is_done = true    # ERROR! Must be capitalized
```

However, `not True` is valid - it's an expression that evaluates to `False`:

```python
result = not True  # False
```

</details>

---

## Question 8: Arithmetic

**What is the result of `10 // 3` in Python?**

A) `3.333...`  
B) `3`  
C) `1`  
D) `3.0`

<details>
<summary>Show Answer</summary>

**Answer: B) `3`**

The `//` operator performs **floor division** (integer division):

```python
result = 10 // 3  # 3 (rounds down)
```

Compare with regular division:

```python
result = 10 / 3   # 3.333...
```

</details>

---

## Your Score

How did you do? Review the concepts you missed:

- **Data Types**: `str`, `int`, `float`, `bool`
- **Operators**: `=`, `==`, `+`, `-`, `*`, `/`, `//`, `%`, `**`
- **String Formatting**: f-strings with `f"text {variable}"`
- **Running Python**: `python filename.py`

---

## Next Steps

Ready to move on? Continue to the next lesson:

**[Control Flow →](control-flow)**

---
