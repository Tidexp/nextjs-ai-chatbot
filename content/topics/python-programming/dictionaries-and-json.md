---
id: 1fac8be5-e5f1-4aa4-9c4b-9e8d2dad4e16
title: Dictionaries and JSON
type: practice
estimatedMinutes: 35
order: 2
exercisePrompt: "Parse JSON into Python dicts. Given a JSON array of objects with name and score, print the average score and the top scorer."
language: python
starterCode: |
  import json
  raw = input("Enter JSON array of {name, score}: ")
  try:
      data = json.loads(raw)
      scores = [d.get("score", 0) for d in data]
      avg = sum(scores) / len(scores) if scores else 0
      top = max(data, key=lambda d: d.get("score", 0)) if data else None
      print(f"Average: {avg:.2f}")
      if top:
          print(f"Top: {top.get('name')} ({top.get('score')})")
  except Exception as e:
      print("Invalid JSON:", e)
---

# Practice: Dictionaries and JSON

**Learn to work with Python dictionaries and parse JSON data.**

---

## Exercise Overview

In this exercise, you'll:

1. Parse JSON input into Python dictionaries
2. Extract and calculate statistics from the data
3. Handle errors gracefully
4. Work with nested data structures

**Estimated Time:** 35 minutes

---

## Python Dictionaries

Dictionaries store key-value pairs:

### Example

```python
person = {
    "name": "Alice",
    "age": 25,
    "city": "New York"
}

# Access values
print(person["name"])        # Alice
print(person.get("age"))     # 25
print(person.get("email", "N/A"))  # N/A (default)

# Modify
person["age"] = 26
person["email"] = "alice@example.com"

# Delete
del person["city"]
```

**[Try it Yourself »](/playground?language=python)**

---

## JSON in Python

JSON (JavaScript Object Notation) is a text format for data exchange:

### Converting JSON to Python

```python
import json

# JSON string to Python dict
json_str = '{"name": "Bob", "score": 95}'
data = json.loads(json_str)
print(data["name"])  # Bob

# JSON array to Python list
json_array = '[{"name": "Alice", "score": 85}, {"name": "Bob", "score": 95}]'
students = json.loads(json_array)
print(students[0]["name"])  # Alice
```

### Converting Python to JSON

```python
import json

# Python dict to JSON string
person = {"name": "Charlie", "age": 30}
json_str = json.dumps(person)
print(json_str)  # {"name": "Charlie", "age": 30}

# Pretty print
json_str = json.dumps(person, indent=2)
print(json_str)
```

**[Try it Yourself »](/playground?language=python)**

---

## Your Task

Create a program that:

1. Reads a JSON array of student records
2. Each record has `name` and `score`
3. Calculates the average score
4. Finds the top scorer
5. Handles invalid JSON gracefully

---

## Starter Code

```python
import json

raw = input("Enter JSON array of {name, score}: ")
try:
    data = json.loads(raw)
    scores = [d.get("score", 0) for d in data]
    avg = sum(scores) / len(scores) if scores else 0
    top = max(data, key=lambda d: d.get("score", 0)) if data else None
    print(f"Average: {avg:.2f}")
    if top:
        print(f"Top: {top.get('name')} ({top.get('score')})")
except Exception as e:
    print("Invalid JSON:", e)
```

**[Try it Yourself »](/playground?language=python)**

---

## Example Input/Output

### Example 1: Valid Input

**Input:**

```json
[
  { "name": "Alice", "score": 85 },
  { "name": "Bob", "score": 92 },
  { "name": "Charlie", "score": 78 }
]
```

**Output:**

```
Average: 85.00
Top: Bob (92)
```

### Example 2: Single Student

**Input:**

```json
[{ "name": "Alice", "score": 95 }]
```

**Output:**

```
Average: 95.00
Top: Alice (95)
```

### Example 3: Invalid JSON

**Input:**

```
This is not JSON
```

**Output:**

```
Invalid JSON: Expecting value: line 1 column 1 (char 0)
```

---

## Understanding the Code

### 1. JSON Parsing

```python
data = json.loads(raw)
```

- `json.loads()` converts JSON string to Python objects
- JSON array → Python list
- JSON object → Python dict

### 2. List Comprehension

```python
scores = [d.get("score", 0) for d in data]
```

- Extracts all `score` values from dictionaries
- Uses `.get()` with default value `0` for safety
- Result: `[85, 92, 78]`

### 3. Calculate Average

```python
avg = sum(scores) / len(scores) if scores else 0
```

- `sum(scores)` adds all scores
- Divide by `len(scores)` for average
- Ternary operator prevents division by zero

### 4. Find Maximum

```python
top = max(data, key=lambda d: d.get("score", 0)) if data else None
```

- `max()` finds the item with highest score
- `key` parameter specifies what to compare
- `lambda` creates anonymous function
- Returns the entire dictionary, not just the score

### 5. Error Handling

```python
try:
    # Code that might fail
except Exception as e:
    print("Invalid JSON:", e)
```

- `try` block contains risky code
- `except` catches any error
- `e` contains error details

---

## Working with Dictionaries

### Common Operations

```python
# Create
student = {"name": "Alice", "score": 85}

# Access
name = student["name"]           # Raises KeyError if missing
score = student.get("score")     # Returns None if missing
grade = student.get("grade", "A")  # Returns "A" if missing

# Modify
student["score"] = 90
student["grade"] = "A"

# Check existence
if "name" in student:
    print(student["name"])

# Iterate
for key, value in student.items():
    print(f"{key}: {value}")

# Keys and values
print(student.keys())    # dict_keys(['name', 'score', 'grade'])
print(student.values())  # dict_values(['Alice', 90, 'A'])
```

**[Try it Yourself »](/playground?language=python)**

---

## Enhancements

Try adding these features:

### 1. Calculate Statistics

```python
import statistics

scores = [d["score"] for d in data]
print(f"Average: {statistics.mean(scores):.2f}")
print(f"Median: {statistics.median(scores):.2f}")
print(f"Std Dev: {statistics.stdev(scores):.2f}")
```

### 2. Find Lowest Scorer

```python
bottom = min(data, key=lambda d: d.get("score", 100))
print(f"Lowest: {bottom['name']} ({bottom['score']})")
```

### 3. Grade Distribution

```python
def get_grade(score):
    if score >= 90: return "A"
    if score >= 80: return "B"
    if score >= 70: return "C"
    if score >= 60: return "D"
    return "F"

for student in data:
    grade = get_grade(student["score"])
    print(f"{student['name']}: {grade}")
```

### 4. Filter Students

```python
# Students scoring above average
high_achievers = [s for s in data if s["score"] > avg]
print(f"High achievers: {len(high_achievers)}")
```

### 5. Sort by Score

```python
# Sort descending by score
sorted_students = sorted(data, key=lambda s: s["score"], reverse=True)
for i, student in enumerate(sorted_students, 1):
    print(f"{i}. {student['name']}: {student['score']}")
```

---

## Reading from File

Instead of input(), read from a file:

```python
import json

def load_students(filename):
    """Load student data from JSON file."""
    try:
        with open(filename, 'r') as f:
            return json.load(f)  # Note: load() not loads()
    except FileNotFoundError:
        print(f"File {filename} not found")
        return []
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in {filename}: {e}")
        return []

# Usage
students = load_students("students.json")
if students:
    scores = [s["score"] for s in students]
    print(f"Average: {sum(scores) / len(scores):.2f}")
```

---

## Writing to File

Save results to a JSON file:

```python
import json

def save_results(data, filename):
    """Save results to JSON file."""
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

# Example
results = {
    "average": 85.0,
    "top_scorer": {"name": "Bob", "score": 92},
    "total_students": 3
}

save_results(results, "results.json")
```

---

## Test Cases

Test your program with these inputs:

### Test 1: Normal Case

```json
[
  { "name": "Alice", "score": 85 },
  { "name": "Bob", "score": 92 },
  { "name": "Charlie", "score": 78 }
]
```

### Test 2: Single Student

```json
[{ "name": "Dave", "score": 100 }]
```

### Test 3: Empty Array

```json
[]
```

### Test 4: Missing Fields

```json
[{ "name": "Eve" }, { "score": 88 }]
```

### Test 5: Invalid JSON

```
Not valid JSON at all!
```

---

## Key Takeaways

From this exercise, you learned:

- ✓ Working with dictionaries (key-value pairs)
- ✓ Parsing JSON with `json.loads()`
- ✓ Using `.get()` for safe dictionary access
- ✓ List comprehensions for data extraction
- ✓ `max()` and `min()` with custom key functions
- ✓ Lambda functions for inline operations
- ✓ Error handling with try-except
- ✓ Ternary operators for concise conditions

---

**[Submit Your Solution »](#)**

---
