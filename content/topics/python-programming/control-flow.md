---
id: 89224870-5386-4e8c-9c5d-be24009988b8
title: Control Flow
type: theory
estimatedMinutes: 25
order: 1
---

# Control Flow

**Learn how to make decisions and repeat actions in your Python programs.**

---

## What is Control Flow?

Control flow determines the order in which code executes. Python provides structures to:

- Make decisions (`if`/`elif`/`else`)
- Repeat actions (`for` and `while` loops)
- Control loop execution (`break` and `continue`)

---

## If Statements

Use `if` to execute code conditionally:

### Example

```python
age = 18

if age >= 18:
    print("You are an adult")
```

**[Try it Yourself »](/playground?language=python)**

---

## If-Else Statements

Add an `else` clause for alternative actions:

### Example

```python
temperature = 25

if temperature > 30:
    print("It's hot outside")
else:
    print("It's not too hot")
```

**[Try it Yourself »](/playground?language=python)**

---

## If-Elif-Else Statements

Use `elif` (else if) for multiple conditions:

### Example

```python
score = 85

if score >= 90:
    grade = "A"
elif score >= 80:
    grade = "B"
elif score >= 70:
    grade = "C"
elif score >= 60:
    grade = "D"
else:
    grade = "F"

print(f"Your grade is: {grade}")
```

**[Try it Yourself »](/playground?language=python)**

### Example Explained

- Python checks each condition from top to bottom
- When a condition is `True`, its code block executes and the rest are skipped
- If no condition is `True`, the `else` block executes (if present)

---

## Indentation is Important!

Python uses indentation to define code blocks:

```python
if x > 0:
    print("Positive")  # This is inside the if block
    print("Greater than zero")  # Still inside
print("Done")  # Outside the if block
```

> **Note:** Use 4 spaces for indentation (Python standard).

---

## For Loops

Use `for` loops to iterate over sequences:

### Example: Iterate Over a List

```python
fruits = ["apple", "banana", "cherry"]

for fruit in fruits:
    print(fruit)
```

**Output:**

```
apple
banana
cherry
```

**[Try it Yourself »](/playground?language=python)**

### Example: Using range()

```python
for i in range(5):
    print(i)
```

**Output:**

```
0
1
2
3
4
```

The `range(5)` function generates numbers from 0 to 4.

---

## Range Function

The `range()` function creates a sequence of numbers:

| Syntax                     | Description     | Example                       |
| -------------------------- | --------------- | ----------------------------- |
| `range(stop)`              | 0 to stop-1     | `range(5)` → 0,1,2,3,4        |
| `range(start, stop)`       | start to stop-1 | `range(2, 5)` → 2,3,4         |
| `range(start, stop, step)` | with step       | `range(0, 10, 2)` → 0,2,4,6,8 |

### Example

```python
# Count from 1 to 10
for i in range(1, 11):
    print(i)

# Count by 2s
for i in range(0, 20, 2):
    print(i)
```

**[Try it Yourself »](/playground?language=python)**

---

## While Loops

Use `while` to loop while a condition is true:

### Example

```python
count = 0

while count < 5:
    print(count)
    count += 1  # Same as: count = count + 1
```

**Output:**

```
0
1
2
3
4
```

**[Try it Yourself »](/playground?language=python)**

> **Warning:** Make sure the condition eventually becomes `False`, or you'll create an infinite loop!

---

## Break Statement

Use `break` to exit a loop early:

### Example

```python
for i in range(10):
    if i == 5:
        break  # Exit the loop when i is 5
    print(i)
```

**Output:**

```
0
1
2
3
4
```

**[Try it Yourself »](/playground?language=python)**

---

## Continue Statement

Use `continue` to skip the current iteration:

### Example

```python
for i in range(10):
    if i % 2 == 0:
        continue  # Skip even numbers
    print(i)
```

**Output:**

```
1
3
5
7
9
```

**[Try it Yourself »](/playground?language=python)**

---

## Nested Loops

You can put loops inside loops:

### Example

```python
for i in range(3):
    for j in range(3):
        print(f"i={i}, j={j}")
```

**Output:**

```
i=0, j=0
i=0, j=1
i=0, j=2
i=1, j=0
i=1, j=1
i=1, j=2
i=2, j=0
i=2, j=1
i=2, j=2
```

**[Try it Yourself »](/playground?language=python)**

---

## Practical Example: FizzBuzz

A classic programming exercise:

```python
for i in range(1, 16):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
```

**Rules:**

- If divisible by 3: print "Fizz"
- If divisible by 5: print "Buzz"
- If divisible by both: print "FizzBuzz"
- Otherwise: print the number

**[Try it Yourself »](/playground?language=python)**

---

## Summary

| Statement  | Purpose                           |
| ---------- | --------------------------------- |
| `if`       | Execute code if condition is True |
| `elif`     | Check additional conditions       |
| `else`     | Execute if no conditions are True |
| `for`      | Iterate over a sequence           |
| `while`    | Loop while condition is True      |
| `break`    | Exit loop immediately             |
| `continue` | Skip to next iteration            |

---

## Practice Exercise

Create a program that:

1. Asks the user for a number
2. Prints all even numbers from 0 to that number
3. Stops if it encounters the number 20

```python
# Your code here
```

**[Submit Answer »](#)**

---
