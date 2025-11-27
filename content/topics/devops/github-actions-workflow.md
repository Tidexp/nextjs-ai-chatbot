---
id: c4c35af9-be8f-4eb5-94de-6c78f743bf0b
title: GitHub Actions Workflow
type: practice
estimatedMinutes: 50
order: 2
exercisePrompt: "Create a simple GitHub Actions YAML workflow that triggers on push, builds the application (using the Dockerfile from M1), and runs unit tests."
language: yaml
starterCode: |
  name: CI Pipeline
  on: [push]
  jobs:
    build_and_test:
      runs-on: ubuntu-latest
      steps:
      - uses: actions/checkout@v3
      - name: Build Docker Image
        run: docker build . --tag my-app:latest
      - name: Run Tests
        run: docker run my-app:latest python tests.py
---

# GitHub Actions Workflow

**Create an automated CI pipeline with GitHub Actions.**

---

## Workflow File

`.github/workflows/ci.yml`:

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build_and_test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.9"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run tests
        run: |
          pytest tests/

      - name: Build Docker image
        run: docker build . --tag my-app:latest

      - name: Run container tests
        run: docker run my-app:latest python tests.py
```

---

## Key Components

- **on**: Trigger events
- **jobs**: Separate build tasks
- **runs-on**: Runner environment
- **steps**: Individual commands
- **uses**: Reusable actions

---
