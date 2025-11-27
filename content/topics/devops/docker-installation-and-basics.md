---
id: 8db2515c-306d-4c95-a991-fdb8352b5bc5
title: Docker Installation and Basics
type: theory
estimatedMinutes: 20
order: 1
---

# Docker Installation and Basics

**A deep dive into the Docker architecture, image layers, and container runtime environment. Learn how to pull and run your first image.**

---

## What is Docker?

Docker is a platform for developing, shipping, and running applications in containers. Containers package software with all dependencies.

---

## Key Concepts

- **Image**: Read-only template with application code
- **Container**: Running instance of an image
- **Dockerfile**: Instructions to build an image
- **Registry**: Store for Docker images (Docker Hub)

---

## Basic Commands

### Pull an Image

```bash
docker pull nginx
```

### Run a Container

```bash
docker run -d -p 80:80 nginx
```

### List Containers

```bash
docker ps
docker ps -a  # Include stopped
```

### Stop Container

```bash
docker stop <container-id>
```

### Remove Container

```bash
docker rm <container-id>
```

---

## Image Layers

Docker images are built in layers:

- Each instruction in Dockerfile creates a layer
- Layers are cached for faster builds
- Shared layers reduce storage

---
