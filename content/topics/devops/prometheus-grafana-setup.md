---
id: ffa96a5f-dd9f-452f-868b-a51b185d1d5d
title: Setting up Prometheus and Grafana
type: project
estimatedMinutes: 75
order: 2
projectBrief: "Deploy Prometheus and Grafana using Docker Compose to monitor a sample application. Configure Prometheus to scrape metrics and build a basic dashboard in Grafana."
language: yaml
---

# Setting up Prometheus and Grafana

**Deploy a complete monitoring stack with Prometheus and Grafana.**

---

## docker-compose.yml

```yaml
version: "3.8"

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus

  app:
    build: ./app
    ports:
      - "8000:8000"

volumes:
  prometheus_data:
  grafana_data:
```

---

## prometheus.yml

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "app"
    static_configs:
      - targets: ["app:8000"]
```

---

## Setup Steps

1. Start services: `docker-compose up -d`
2. Access Prometheus: http://localhost:9090
3. Access Grafana: http://localhost:3000
4. Add Prometheus as data source in Grafana
5. Create dashboards to visualize metrics

---
