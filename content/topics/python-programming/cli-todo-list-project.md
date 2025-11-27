---
id: 00e8037e-a5e2-4648-959e-678349ffb3c1
title: "Project: CLI To-Do List"
type: project
estimatedMinutes: 60
order: 3
projectBrief: "Build a command-line to-do app supporting: add, list, complete, and delete. Persist in a JSON file. Include basic input validation and help."
language: python
starterCode: |
  import json
  from pathlib import Path

  DB = Path("todo.json")

  def load_tasks():
      if DB.exists():
          return json.loads(DB.read_text())
      return []

  def save_tasks(tasks):
      DB.write_text(json.dumps(tasks, indent=2))

  # Implement: add, list, complete, delete, help
  if __name__ == "__main__":
      pass
---

# Project: CLI To-Do List

**Build a functional command-line to-do list application with persistent storage.**

---

## Project Overview

In this project, you'll create a command-line interface (CLI) application that allows users to manage their to-do list. The application will:

- Add new tasks
- List all tasks
- Mark tasks as complete
- Delete tasks
- Save data to a JSON file
- Load data when the program starts

**Estimated Time:** 60 minutes

---

## Features to Implement

### 1. Add Task

```bash
$ python todo.py add "Buy groceries"
Task added: Buy groceries
```

### 2. List Tasks

```bash
$ python todo.py list
1. [ ] Buy groceries
2. [✓] Read Python book
3. [ ] Exercise
```

### 3. Complete Task

```bash
$ python todo.py complete 1
Task completed: Buy groceries
```

### 4. Delete Task

```bash
$ python todo.py delete 2
Task deleted: Read Python book
```

### 5. Help Command

```bash
$ python todo.py help
Usage: python todo.py [command] [arguments]

Commands:
  add [task]       Add a new task
  list             List all tasks
  complete [id]    Mark task as complete
  delete [id]      Delete a task
  help             Show this help message
```

---

## Starter Code

```python
import json
from pathlib import Path

DB = Path("todo.json")

def load_tasks():
    """Load tasks from JSON file."""
    if DB.exists():
        return json.loads(DB.read_text())
    return []

def save_tasks(tasks):
    """Save tasks to JSON file."""
    DB.write_text(json.dumps(tasks, indent=2))

# Implement: add, list, complete, delete, help
if __name__ == "__main__":
    pass
```

---

## Data Structure

Each task should be a dictionary with these fields:

```python
{
    "id": 1,
    "text": "Buy groceries",
    "completed": False
}
```

The entire to-do list is a list of task dictionaries:

```python
[
    {"id": 1, "text": "Buy groceries", "completed": False},
    {"id": 2, "text": "Read book", "completed": True},
    {"id": 3, "text": "Exercise", "completed": False}
]
```

---

## Implementation Guide

### Step 1: Parse Command-Line Arguments

Use `sys.argv` to get command-line arguments:

```python
import sys

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python todo.py [command]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "add":
        # Add task logic
        pass
    elif command == "list":
        # List tasks logic
        pass
    # ... more commands
```

---

### Step 2: Implement Add Function

```python
def add_task(tasks, text):
    """Add a new task to the list."""
    # Find the next available ID
    next_id = max([t["id"] for t in tasks], default=0) + 1

    # Create new task
    task = {
        "id": next_id,
        "text": text,
        "completed": False
    }

    tasks.append(task)
    return task
```

---

### Step 3: Implement List Function

```python
def list_tasks(tasks):
    """Display all tasks."""
    if not tasks:
        print("No tasks found.")
        return

    for task in tasks:
        status = "✓" if task["completed"] else " "
        print(f"{task['id']}. [{status}] {task['text']}")
```

---

### Step 4: Implement Complete Function

```python
def complete_task(tasks, task_id):
    """Mark a task as complete."""
    for task in tasks:
        if task["id"] == task_id:
            task["completed"] = True
            return task
    return None
```

---

### Step 5: Implement Delete Function

```python
def delete_task(tasks, task_id):
    """Delete a task from the list."""
    for i, task in enumerate(tasks):
        if task["id"] == task_id:
            return tasks.pop(i)
    return None
```

---

### Step 6: Wire It All Together

```python
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python todo.py [command]")
        sys.exit(1)

    command = sys.argv[1]
    tasks = load_tasks()

    if command == "add":
        if len(sys.argv) < 3:
            print("Error: Please provide a task description")
            sys.exit(1)
        task_text = " ".join(sys.argv[2:])
        task = add_task(tasks, task_text)
        save_tasks(tasks)
        print(f"Task added: {task['text']}")

    elif command == "list":
        list_tasks(tasks)

    elif command == "complete":
        if len(sys.argv) < 3:
            print("Error: Please provide a task ID")
            sys.exit(1)
        task_id = int(sys.argv[2])
        task = complete_task(tasks, task_id)
        if task:
            save_tasks(tasks)
            print(f"Task completed: {task['text']}")
        else:
            print(f"Error: Task {task_id} not found")

    elif command == "delete":
        if len(sys.argv) < 3:
            print("Error: Please provide a task ID")
            sys.exit(1)
        task_id = int(sys.argv[2])
        task = delete_task(tasks, task_id)
        if task:
            save_tasks(tasks)
            print(f"Task deleted: {task['text']}")
        else:
            print(f"Error: Task {task_id} not found")

    elif command == "help":
        print("Usage: python todo.py [command] [arguments]")
        print("\nCommands:")
        print("  add [task]       Add a new task")
        print("  list             List all tasks")
        print("  complete [id]    Mark task as complete")
        print("  delete [id]      Delete a task")
        print("  help             Show this help message")

    else:
        print(f"Unknown command: {command}")
        print("Use 'python todo.py help' for usage information")
```

---

## Testing Your Application

Test each command:

```bash
# Add tasks
python todo.py add "Buy groceries"
python todo.py add "Read Python book"
python todo.py add "Exercise for 30 minutes"

# List tasks
python todo.py list

# Complete a task
python todo.py complete 2

# List again to see the change
python todo.py list

# Delete a task
python todo.py delete 1

# Final list
python todo.py list
```

---

## Challenge: Enhancements

Once you have the basic version working, try adding:

### 1. Priority Levels

```python
task = {
    "id": 1,
    "text": "Important meeting",
    "completed": False,
    "priority": "high"  # high, medium, low
}
```

### 2. Due Dates

```python
from datetime import datetime

task = {
    "id": 1,
    "text": "Submit report",
    "completed": False,
    "due_date": "2024-12-31"
}
```

### 3. Edit Command

```bash
python todo.py edit 1 "Buy groceries and cook dinner"
```

### 4. Search Command

```bash
python todo.py search "groceries"
```

### 5. Clear Completed

```bash
python todo.py clear
# Removes all completed tasks
```

---

## Key Concepts Applied

This project demonstrates:

- ✓ **Functions**: Organized code into reusable functions
- ✓ **Data Structures**: Used lists and dictionaries
- ✓ **File I/O**: Read from and write to JSON files
- ✓ **Control Flow**: If/else statements and loops
- ✓ **Command-Line Arguments**: Process user input via sys.argv
- ✓ **Error Handling**: Validate input and handle errors
- ✓ **Module Usage**: Import and use standard library modules

---

## Reflection Questions

1. How does the JSON file persist data between program runs?
2. What happens if two users try to modify the file simultaneously?
3. How would you add authentication to make this a multi-user application?
4. What advantages would a database provide over a JSON file?

---

**[Submit Your Project »](#)**

---
