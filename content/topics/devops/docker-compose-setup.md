---
id: 2da6aef7-7013-4ed5-a70e-a36d2b5c2323
title: Docker Compose Setup
type: project
estimatedMinutes: 60
order: 3
projectBrief: "Use Docker Compose to launch a web application that requires both a Python backend (API) and a PostgreSQL database simultaneously."
language: yaml
---

# Docker Compose Setup

**Use Docker Compose to orchestrate multi-container applications.**

---

## docker-compose.yml

```yaml
version: "3.8"

services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://user:password@db:5432/myapp
    depends_on:
      - db
    volumes:
      - ./app:/app

volumes:
  postgres_data:
```

---

## Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild
docker-compose up --build
```

---
