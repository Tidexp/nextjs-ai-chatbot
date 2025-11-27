---
id: b94d216c-c63b-49bb-b618-d7f4700ad76a
title: Lists, Tuples, and Sets
type: theory
estimatedMinutes: 25
order: 1
---

# Lists, Tuples, and Sets

**Understand Python's built-in collection types and when to use each one.**

---

## Overview of Collections

Python provides several data structures to store multiple items:

| Type      | Mutable | Ordered   | Duplicates | Syntax      |
| --------- | ------- | --------- | ---------- | ----------- |
| **List**  | Yes     | Yes       | Yes        | `[1, 2, 3]` |
| **Tuple** | No      | Yes       | Yes        | `(1, 2, 3)` |
| **Set**   | Yes     | No        | No         | `{1, 2, 3}` |
| **Dict**  | Yes     | No (keys) | No (keys)  | `{"a": 1}`  |

---

## Lists

Lists are mutable, ordered collections:

### Creating Lists

```python
# Empty list
empty = []

# List with items
fruits = ["apple", "banana", "cherry"]

# Mixed types
mixed = [1, "hello", 3.14, True]

# Using list() constructor
numbers = list(range(5))  # [0, 1, 2, 3, 4]
```

**[Try it Yourself »](/playground?language=python)**

---

## List Operations

### Accessing Elements

```python
fruits = ["apple", "banana", "cherry"]

# Index from 0
print(fruits[0])   # apple
print(fruits[-1])  # cherry (last item)

# Slicing
print(fruits[0:2])   # ['apple', 'banana']
print(fruits[1:])    # ['banana', 'cherry']
```

### Modifying Lists

```python
fruits = ["apple", "banana", "cherry"]

# Change an item
fruits[1] = "blueberry"

# Add items
fruits.append("date")        # Add to end
fruits.insert(1, "avocado")  # Insert at position

# Remove items
fruits.remove("apple")       # Remove by value
popped = fruits.pop()        # Remove and return last
del fruits[0]                # Delete by index
```

**[Try it Yourself »](/playground?language=python)**

---

## List Methods

Common list methods:

| Method         | Description            | Example             |
| -------------- | ---------------------- | ------------------- |
| `append(x)`    | Add item to end        | `list.append(5)`    |
| `insert(i, x)` | Insert at position     | `list.insert(0, 5)` |
| `remove(x)`    | Remove first x         | `list.remove(5)`    |
| `pop([i])`     | Remove and return item | `list.pop()`        |
| `clear()`      | Remove all items       | `list.clear()`      |
| `index(x)`     | Find position of x     | `list.index(5)`     |
| `count(x)`     | Count occurrences      | `list.count(5)`     |
| `sort()`       | Sort in place          | `list.sort()`       |
| `reverse()`    | Reverse in place       | `list.reverse()`    |
| `copy()`       | Create shallow copy    | `list.copy()`       |

---

## List Comprehensions

Create lists using concise syntax:

### Example

```python
# Traditional way
squares = []
for i in range(10):
    squares.append(i ** 2)

# List comprehension
squares = [i ** 2 for i in range(10)]
print(squares)  # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]
```

### With Conditions

```python
# Only even squares
even_squares = [i ** 2 for i in range(10) if i % 2 == 0]
print(even_squares)  # [0, 4, 16, 36, 64]

# Transform strings
words = ["hello", "world"]
upper = [word.upper() for word in words]
print(upper)  # ['HELLO', 'WORLD']
```

**[Try it Yourself »](/playground?language=python)**

---

## Tuples

Tuples are immutable, ordered collections:

### Creating Tuples

```python
# Empty tuple
empty = ()

# Tuple with items
coordinates = (10, 20)

# Single item (note the comma!)
single = (5,)

# Without parentheses
point = 1, 2, 3

# Using tuple() constructor
numbers = tuple([1, 2, 3])
```

**[Try it Yourself »](/playground?language=python)**

---

## Why Use Tuples?

Tuples are useful when:

1. **Data shouldn't change**: Coordinates, RGB colors
2. **Dictionary keys**: Tuples can be keys, lists cannot
3. **Function returns**: Return multiple values
4. **Performance**: Slightly faster than lists

### Example

```python
# Return multiple values
def get_user():
    return ("Alice", 25, "alice@example.com")

name, age, email = get_user()
print(name)  # Alice

# Use as dictionary key
locations = {
    (0, 0): "origin",
    (1, 0): "right",
    (0, 1): "up"
}
```

**[Try it Yourself »](/playground?language=python)**

---

## Tuple Operations

```python
point = (10, 20, 30)

# Accessing (same as lists)
print(point[0])    # 10
print(point[-1])   # 30

# Slicing
print(point[1:])   # (20, 30)

# Unpacking
x, y, z = point
print(x, y, z)     # 10 20 30

# Methods
print(point.count(10))  # 1
print(point.index(20))  # 1

# Cannot modify!
# point[0] = 5  # ERROR: tuple doesn't support item assignment
```

**[Try it Yourself »](/playground?language=python)**

---

## Sets

Sets are unordered collections with no duplicates:

### Creating Sets

```python
# Empty set (must use set())
empty = set()

# Set with items
fruits = {"apple", "banana", "cherry"}

# From a list (removes duplicates)
numbers = set([1, 2, 2, 3, 3, 3])
print(numbers)  # {1, 2, 3}

# Set comprehension
squares = {x**2 for x in range(5)}
```

**[Try it Yourself »](/playground?language=python)**

---

## Set Operations

### Adding and Removing

```python
fruits = {"apple", "banana"}

# Add items
fruits.add("cherry")
fruits.update(["date", "elderberry"])

# Remove items
fruits.remove("apple")      # Raises error if not found
fruits.discard("banana")    # No error if not found
popped = fruits.pop()       # Remove arbitrary item
fruits.clear()              # Remove all
```

### Set Mathematics

```python
a = {1, 2, 3, 4}
b = {3, 4, 5, 6}

# Union (all items)
print(a | b)  # {1, 2, 3, 4, 5, 6}
print(a.union(b))

# Intersection (common items)
print(a & b)  # {3, 4}
print(a.intersection(b))

# Difference (in a but not b)
print(a - b)  # {1, 2}
print(a.difference(b))

# Symmetric difference (in either but not both)
print(a ^ b)  # {1, 2, 5, 6}
print(a.symmetric_difference(b))
```

**[Try it Yourself »](/playground?language=python)**

---

## When to Use Each Type

### Use Lists When:

- Order matters
- You need to modify items
- Duplicates are allowed
- You need indexing/slicing

### Use Tuples When:

- Data should be immutable
- Using as dictionary keys
- Returning multiple values
- Slight performance benefit needed

### Use Sets When:

- Order doesn't matter
- No duplicates allowed
- Need fast membership testing
- Need set operations (union, intersection)

---

## Practical Examples

### Remove Duplicates

```python
numbers = [1, 2, 2, 3, 3, 3, 4, 5, 5]
unique = list(set(numbers))
print(unique)  # [1, 2, 3, 4, 5] (may be unordered)
```

### Check Membership

```python
# Fast with sets
valid_codes = {"admin", "user", "guest"}
if user_code in valid_codes:
    print("Valid code")
```

### Swap Values

```python
a = 10
b = 20
a, b = b, a  # Uses tuple unpacking
print(a, b)  # 20 10
```

### Filter and Transform

```python
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
even_squares = [x**2 for x in numbers if x % 2 == 0]
print(even_squares)  # [4, 16, 36, 64, 100]
```

**[Try it Yourself »](/playground?language=python)**

---

## Summary

| Operation  | List      | Tuple     | Set       |
| ---------- | --------- | --------- | --------- |
| Create     | `[1,2,3]` | `(1,2,3)` | `{1,2,3}` |
| Mutable    | ✓         | ✗         | ✓         |
| Ordered    | ✓         | ✓         | ✗         |
| Duplicates | ✓         | ✓         | ✗         |
| Indexing   | ✓         | ✓         | ✗         |
| Slicing    | ✓         | ✓         | ✗         |

---

## Practice Exercise

Given this list of shopping items with duplicates:

```python
shopping = ["apple", "banana", "apple", "cherry", "banana", "date"]
```

1. Remove duplicates (preserve order)
2. Sort alphabetically
3. Count how many unique items there are
4. Check if "grape" is in the list

```python
# Your solution here
```

**[Submit Answer »](#)**

---
