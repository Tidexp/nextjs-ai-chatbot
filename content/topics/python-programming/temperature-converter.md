---
id: 8838f652-097b-46bf-bb29-28c2a1571adf
title: "Practice: Temperature Converter"
type: exercise
estimatedMinutes: 30
order: 3
exercisePrompt: "Write a program that reads a Celsius temperature and prints the Fahrenheit equivalent. Formula: F = C * 9/5 + 32. Validate that input is numeric."
language: python
starterCode: |
  celsius_str = input("Enter temperature in Celsius: ")
  try:
      c = float(celsius_str)
      f = c * 9/5 + 32
      print(f"{c}C is {f}F")
  except ValueError:
      print("Please enter a number.")
---

# Practice: Temperature Converter

**Build a program that converts Celsius to Fahrenheit with input validation.**

---

## Exercise Overview

In this exercise, you'll create a temperature converter that:

1. Prompts the user to enter a temperature in Celsius
2. Converts it to Fahrenheit using the formula: **F = C × 9/5 + 32**
3. Displays the result
4. Handles invalid input gracefully

---

## The Conversion Formula

The formula to convert Celsius to Fahrenheit is:

```
F = C × 9/5 + 32
```

Where:

- **F** = Temperature in Fahrenheit
- **C** = Temperature in Celsius

### Example Conversions

| Celsius | Fahrenheit |
| ------- | ---------- |
| 0°C     | 32°F       |
| 100°C   | 212°F      |
| 37°C    | 98.6°F     |
| -40°C   | -40°F      |

---

## Your Task

Complete the temperature converter program with these requirements:

### Requirements

1. **Get User Input**: Read a temperature value from the user
2. **Validate Input**: Check if the input is a valid number
3. **Convert**: Apply the conversion formula
4. **Display Result**: Show the result with proper formatting
5. **Error Handling**: Display a helpful message for invalid input

---

## Starter Code

```python
celsius_str = input("Enter temperature in Celsius: ")
try:
    c = float(celsius_str)
    f = c * 9/5 + 32
    print(f"{c}C is {f}F")
except ValueError:
    print("Please enter a number.")
```

**[Try it Yourself »](/playground?language=python)**

---

## Example Output

```
Enter temperature in Celsius: 25
25.0C is 77.0F
```

```
Enter temperature in Celsius: abc
Please enter a number.
```

---

## Understanding the Code

Let's break down the solution:

### 1. Input Function

```python
celsius_str = input("Enter temperature in Celsius: ")
```

- `input()` prompts the user and returns a string
- We store the input in `celsius_str`

### 2. Try-Except Block

```python
try:
    c = float(celsius_str)
    # ... conversion code
except ValueError:
    print("Please enter a number.")
```

- The `try` block attempts to convert the input to a float
- If conversion fails, the `except` block catches the error

### 3. Conversion

```python
f = c * 9/5 + 32
```

- Applies the mathematical formula
- Python follows the order of operations (PEMDAS)

### 4. Formatted Output

```python
print(f"{c}C is {f}F")
```

- Uses an f-string to embed variables in the output
- Creates a readable message

---

## Challenges

Once you've completed the basic version, try these enhancements:

### Challenge 1: Bidirectional Converter

Add the ability to convert Fahrenheit to Celsius:

```python
# Formula: C = (F - 32) × 5/9
```

### Challenge 2: Decimal Precision

Format the output to show only 2 decimal places:

```python
print(f"{c:.2f}C is {f:.2f}F")
```

### Challenge 3: Multiple Conversions

Allow the user to perform multiple conversions without restarting:

```python
while True:
    # conversion code
    again = input("Convert another? (y/n): ")
    if again.lower() != 'y':
        break
```

---

## Test Cases

Test your program with these values:

| Input | Expected Output        |
| ----- | ---------------------- |
| 0     | 0.0C is 32.0F          |
| 100   | 100.0C is 212.0F       |
| -40   | -40.0C is -40.0F       |
| 37    | 37.0C is 98.6F         |
| "abc" | Please enter a number. |

---

## Key Takeaways

From this exercise, you learned:

- ✓ How to use `input()` to get user data
- ✓ Converting strings to numbers with `float()`
- ✓ Handling errors with try-except blocks
- ✓ Applying mathematical formulas in Python
- ✓ Using f-strings for formatted output

---

**[Submit Your Solution »](#)**

---
