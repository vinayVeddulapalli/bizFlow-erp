# BizFlow ERP — Production Deployment & Operations Guide

This guide describes how to deploy, configure, secure, and maintain the **BizFlow ERP** platform in production environments.

---

## 1. System Requirements & Architecture

### Recommended Minimum Hardware (SMB Production)
- **CPU**: 4 vCPUs (x86_64 or ARM64)
- **RAM**: 8 GB RAM minimum (16 GB recommended for high transaction volume)
- **Disk**: 100 GB NVMe SSD (SSD required for PostgreSQL WAL write performance)
- **OS**: Ubuntu 22.04 LTS / Debian 12 / RHEL 9

### Architecture Topology
```
[ Users (Browser / Mobile App) ]
               │ HTTPS (443)
               ▼
[ Reverse Proxy / Cloudflare / Nginx / Caddy ]
       │                               │
       ▼ (Port 3002)                   ▼ (Port 4000)
[ Next.js 15 Web Frontend ]    [ NestJS REST API Backend ]
                                       │
                      ┌────────────────┼────────────────┐
                      ▼                ▼                ▼
             [ PostgreSQL 16 ]    [ Redis 7 ]      [ MinIO S3 ]
```

---

## 2. Fast-Track Deployment with Docker Compose

BizFlow includes a fully orchestrated Docker Compose configuration supporting all required subsystems.

### Step 1: Clone and Configure Environment
```bash
git clone <repository_url> bizflow-erp
cd bizflow-erp

# Copy environment template
cp .env.example .env

# Generate cryptographically secure JWT secrets
# In terminal: openssl rand -base64 48
```

Update `.env` with your secure production values:
- `POSTGRES_PASSWORD`: Use a strong random password.
- `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET`: Use 64+ character random strings.
- `MINIO_ROOT_PASSWORD`: Secure access key for object storage.

### Step 2: Build and Start Services
```bash
# Build multi-stage images and start all containers in detached mode
docker compose up -d --build

# Verify container health statuses
docker compose ps
```

All 5 core containers will start with healthchecks:
- `bizflow-postgres` (Port 5432)
- `bizflow-redis` (Port 6379)
- `bizflow-minio` (Port 9000 API, 9001 Web Console)
- `bizflow-api` (Port 4000)
- `bizflow-web` (Port 3002)

### Step 3: Run Database Migrations & Initial Seed
```bash
# Execute Prisma migration in the API container
docker compose exec api pnpm exec prisma migrate deploy --schema=./database/prisma/schema.prisma

# (Optional) Seed standard Chart of Accounts & demonstration data
docker compose exec api pnpm exec ts-node ./database/prisma/seed.ts
```

---

## 3. Reverse Proxy & SSL Configuration (Nginx / Caddy)

### Caddy (Recommended for Automatic Let's Encrypt SSL)
```caddyfile
# /etc/caddy/Caddyfile

erp.yourdomain.com {
    reverse_proxy localhost:3002
}

api.yourdomain.com {
    reverse_proxy localhost:4000
}
```

### Nginx Configuration
```nginx
# /etc/nginx/sites-available/bizflow-erp
server {
    listen 80;
    server_name erp.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name erp.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/erp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/erp.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. Health Checks & System Monitoring

BizFlow provides a dedicated unauthenticated health check endpoint:
```
GET /api/v1/health
```

Example JSON Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-11-18T13:35:00.000Z",
  "uptimeSeconds": 1420,
  "environment": "production",
  "version": "1.0.0",
  "checks": {
    "database": {
      "status": "UP",
      "latencyMs": 3
    },
    "memory": {
      "heapUsedMb": 54.21,
      "heapTotalMb": 98.45,
      "rssMb": 142.18
    }
  }
}
```

Uptime monitors (Datadog, UptimeRobot, Grafana Agent, Kubernetes Liveness Probe) should target:
- `http://api.yourdomain.com/api/v1/health` (HTTP 200 OK)

---

## 5. Automated Database Backups

Regular automated backups are mandatory for financial ERP software.

### Automated Daily Cron Job
```bash
#!/bin/bash
# /opt/bizflow/scripts/backup-db.sh
BACKUP_DIR="/var/backups/bizflow"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose -f /opt/bizflow/docker-compose.yml exec -T postgres \
  pg_dump -U bizflow_admin -d bizflow_erp_prod --format=custom \
  | gzip > "$BACKUP_DIR/bizflow_backup_$DATE.dump.gz"

# Retain last 30 days only
find $BACKUP_DIR -type f -name "*.dump.gz" -mtime +30 -delete
```

### Database Restore Procedure
```bash
# To restore from a compressed backup:
gunzip -c /var/backups/bizflow/bizflow_backup_YYYYMMDD.dump.gz | \
  docker compose exec -T postgres pg_restore -U bizflow_admin -d bizflow_erp_prod --clean --if-exists
```
