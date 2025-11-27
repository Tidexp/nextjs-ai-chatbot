---
id: 52251eef-4fd0-4fd1-a338-bb2ce13f2b6b
title: Writing a Dockerfile
type: exercise
estimatedMinutes: 45
order: 2
exercisePrompt: "Create a Dockerfile to containerize a simple Python Flask application. The Dockerfile should use a minimal base image, copy source code, install dependencies, and define the entrypoint."
language: bash
starterCode: |
  # Dockerfile for a Python app
  FROM python:3.9-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  CMD ["python", "app.py"]
---

# Writing a Dockerfile

**Create a Dockerfile to containerize a Python Flask application.**

---

## Dockerfile Structure

```dockerfile
# Base image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 5000

# Run application
CMD ["python", "app.py"]
```

---

## Dockerfile Instructions

- **FROM**: Base image
- **WORKDIR**: Set working directory
- **COPY**: Copy files from host
- **RUN**: Execute commands during build
- **EXPOSE**: Document port
- **CMD**: Default command when container starts

---

## Build and Run

```bash
# Build image
docker build -t my-flask-app .

# Run container
docker run -p 5000:5000 my-flask-app
```

---

## Best Practices

- Use specific image tags
- Minimize layers
- Use .dockerignore
- Don't run as root
- Use multi-stage builds

---
