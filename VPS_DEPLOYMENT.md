# RadiusNexus — VPS Deployment Guide

## Prerequisites

- Ubuntu 22.04 LTS VPS (minimum 2 vCPU, 4 GB RAM, 40 GB SSD)
- A domain name pointed at your VPS IP (e.g. `radius.yourdomain.com`)
- Ports open: `80`, `443`, `1812/udp`, `1813/udp`, `3799/udp`

---

## 1. Install Docker & Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

---

## 2. Upload the Project

```bash
# From your local machine
scp -r . user@YOUR_VPS_IP:/opt/radiusnexus

# Or clone from git
ssh user@YOUR_VPS_IP
git clone https://github.com/your-org/radiusnexus.git /opt/radiusnexus
cd /opt/radiusnexus
```

---

## 3. Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

**Required changes for production:**

```env
NODE_ENV=production
PORT=3000

# Database — use strong passwords
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=radiusnexus
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD
DB_DATABASE=radiusnexus

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_REDIS_PASSWORD

# JWT — generate with: openssl rand -hex 64
JWT_SECRET=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# SMTP (for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Default tenant
DEFAULT_TENANT_SLUG=default
DEFAULT_TENANT_NAME=My ISP
```

Also update `docker-compose.yml` to match the passwords above:
```bash
# Replace all occurrences of radiusnexus_secret and redis_secret
sed -i 's/radiusnexus_secret/CHANGE_THIS_STRONG_PASSWORD/g' docker-compose.yml
sed -i 's/redis_secret/CHANGE_THIS_REDIS_PASSWORD/g' docker-compose.yml
```

---

## 4. Production Docker Compose

The project includes a standalone `docker-compose.prod.yml` for production. This file:
- Uses the `runner` Dockerfile target (pre-built `dist/`)
- Does **not** mount source code as a volume (unlike the dev compose)
- Loads credentials from `.env` via `env_file`
- Overrides Docker service hostnames (`DB_HOST=postgres`, `REDIS_HOST=redis`)
- Includes the nginx reverse proxy service

Update the frontend URL in your `.env`:
```env
NEXT_PUBLIC_API_URL=https://radius.yourdomain.com/api
```

---

## 5. Create Nginx Configuration

```bash
mkdir -p docker/nginx
```

Create `docker/nginx/nginx.conf`:

```nginx
events { worker_connections 1024; }

http {
    upstream api {
        server api:3000;
    }
    upstream frontend {
        server frontend:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name radius.yourdomain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl;
        server_name radius.yourdomain.com;

        ssl_certificate     /etc/letsencrypt/live/radius.yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/radius.yourdomain.com/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
        }

        # Swagger docs
        location /docs {
            proxy_pass http://api;
            proxy_set_header Host $host;
        }
    }
}
```

---

## 6. Obtain SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install -y certbot

# Get certificate (stop nginx first if running)
sudo certbot certonly --standalone \
  -d radius.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos --non-interactive

# Auto-renew (add to crontab)
echo "0 3 * * * certbot renew --quiet && docker restart radiusnexus-nginx" | sudo crontab -
```

---

## 7. Update FreeRADIUS clients.conf

Edit `docker/freeradius/clients.conf` to add your real NAS devices:

```
client localhost {
    ipaddr = 127.0.0.1
    secret = testing123
    shortname = localhost
}

# Add your MikroTik / NAS devices here:
client mikrotik-main {
    ipaddr = 10.0.0.1          # Your router's IP
    secret = your-nas-secret   # Must match what you set in NAS Devices UI
    shortname = mikrotik-main
    nastype = other
}

# Allow entire subnet if needed:
# client office-network {
#     ipaddr = 192.168.1.0/24
#     secret = shared-secret
# }
```

> **Important:** The `secret` here must match the **Secret** field when you add the NAS device in the RadiusNexus UI under **NAS Devices**.

---

## 8. Deploy

```bash
cd /opt/radiusnexus

# Build and start all services (use the production compose file)
docker compose -f docker-compose.prod.yml up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f api
docker compose logs -f freeradius
```

---

## 9. Seed Initial Data

On first deploy, run the seeder to create the default tenant and super admin:

```bash
docker compose exec api npm run seed
```

This creates:
- Tenant: `default`
- Admin user: `admin` / `admin123` — **change the password immediately after login**

---

## 10. Verify Everything Works

```bash
# API health
curl https://radius.yourdomain.com/api/health

# Test RADIUS auth (from the VPS, requires radtest)
sudo apt install -y freeradius-utils
radtest testuser testpass localhost 0 testing123

# Check FreeRADIUS logs
docker compose logs freeradius
```

---

## 11. Firewall Rules

```bash
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP (redirect to HTTPS)
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 1812/udp    # RADIUS Auth
sudo ufw allow 1813/udp    # RADIUS Accounting
sudo ufw allow 3799/udp    # RADIUS CoA/Disconnect
sudo ufw enable
```

---

## FreeRADIUS Architecture Summary

```
NAS Device (MikroTik/Cisco)
        │  UDP 1812/1813
        ▼
  FreeRADIUS (Docker)
        │  HTTP REST
        ▼
  NestJS API :3000/api/radius
        │
        ▼
  PostgreSQL (subscribers, plans, sessions)
```

FreeRADIUS calls these internal API endpoints:
| Endpoint | Trigger |
|---|---|
| `POST /api/radius/authorize` | User connects — checks plan, limits, MAC |
| `POST /api/radius/authenticate` | Password verification (bcrypt) |
| `POST /api/radius/accounting` | Session start/interim/stop — updates counters |
| `POST /api/radius/post-auth` | Logs auth result to `radpostauth` |

These endpoints are **not protected by JWT** — they are internal only. On VPS, ensure port `3000` is **not** exposed publicly (only nginx on 80/443 is public).

---

## Maintenance

```bash
# Update application
git pull
docker compose -f docker-compose.prod.yml up -d --build api frontend

# Backup database
docker exec radiusnexus-db pg_dump -U radiusnexus radiusnexus > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20260101.sql | docker exec -i radiusnexus-db psql -U radiusnexus radiusnexus

# View all logs
docker compose logs --tail=100 -f
```
