# MKJ SUPA CUP — Docker Learning Guide

This guide documents the full Docker setup for the MKJ SUPA CUP project.
It is written for someone learning Docker for the first time, using this
real project as the learning vehicle. Everything is compared to Railway
so you understand why things exist.

---

## The Big Picture

Before Docker, deploying an app meant:
1. Installing Python on the server
2. Installing all packages
3. Setting up Postgres
4. Setting up Redis
5. Configuring environment variables
6. Hoping the server's OS matched your laptop

**Docker packages all of that into containers.** A container is a
self-contained unit with its own OS layer, Python, packages, and your
code — everything the app needs to run, bundled together.

### Railway vs Local Docker

| | Railway (Production) | Local Docker (Development) |
|---|---|---|
| Who builds the image | Railway (using Nixpacks) | You (using Dockerfile) |
| Where it runs | Railway's servers | Your laptop |
| Who can access it | The internet | Only you (localhost) |
| Env vars from | Railway Variables dashboard | `.env.docker` file |
| Started by | `git push` | `docker compose up` |
| Database | Railway Postgres service | Local `db` container |
| Redis | Railway Redis service | Local `redis` container |

They are **completely independent**. Deploying to Railway does not
affect your local Docker setup, and vice versa.

---

## The Files We Created

### `Dockerfile`
The recipe for building your Django app's image. Docker reads this
top-to-bottom and creates a layered image.

**Key concept — layers and caching:**
Each instruction in the Dockerfile is a layer. Docker caches layers.
If `requirements.txt` hasn't changed, Docker skips the `pip install`
layer entirely on the next build. This is why we copy `requirements.txt`
BEFORE copying the rest of the code.

```
FROM python:3.12-slim     ← Start with official Python image
RUN apt-get install...    ← Install system dependencies
COPY requirements.txt .   ← Copy requirements FIRST (cache trick)
RUN pip install...        ← Install Python packages (cached if req unchanged)
COPY . .                  ← Copy your code (changes often, so goes last)
CMD ["gunicorn"...]       ← Default command to run
```

**Railway comparison:** Railway's Nixpacks does all of this automatically
by reading your `requirements.txt`. Your `Dockerfile` gives you the same
result but with full visibility and control over every step.

---

### `docker-compose.yml`
Defines all services (containers) and how they connect.
Your app needs 4 containers running together:

```
web     → Django app (built from your Dockerfile)
db      → PostgreSQL database
redis   → Redis cache + Celery broker
celery  → Background task worker (same image as web, different command)
```

**Railway comparison:** On Railway, you manually add a Postgres service
and a Redis service to your project. Railway then automatically injects
`DATABASE_URL` and `REDIS_URL` into your web service. `docker-compose`
does the exact same thing — it creates all services and they communicate
over Docker's internal network using service names as hostnames.

On Railway:
```
DATABASE_URL=postgres://user:pass@containers-us-west-xxx.railway.app:5432/railway
```

In Docker locally:
```
DATABASE_URL=postgres://mkj_user:mkj_localdev_password@db:5432/mkj_db
```

The hostname `db` is just the service name from `docker-compose.yml`.
Docker's internal DNS resolves it to the Postgres container's IP address.

**Volumes** — containers are stateless by default. If you stop and remove
the `db` container, all your data is gone. Named volumes solve this:
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
```
This maps Docker's persistent storage to Postgres's data directory.
The data survives container restarts.

**Bind mounts** — the `web` service has:
```yaml
volumes:
  - .:/app
```
This maps your local project folder into the container in real time.
Edit a file on your laptop → the container sees it instantly → Django's
runserver auto-reloads. This is how local development works.

---

### `.env.docker`
Environment variables for local Docker development.

**Railway comparison:** On Railway you set these in the Variables dashboard.
Railway injects them into your container at runtime. Here, `docker-compose`
reads this file and does the same injection.

**IMPORTANT:** This file is in `.gitignore`. Never commit it. It contains
credentials (even if they're just local dev ones). The same rule applies
on Railway — secrets live in the dashboard, never in your code.

---

### `.dockerignore`
Tells Docker what NOT to copy into the image when building.

**Railway comparison:** When you `git push`, git already skips everything
in `.gitignore`. Docker doesn't know about `.gitignore` — it needs its own
file. Without `.dockerignore`, Docker would copy your `venv/` folder
(hundreds of MB), `node_modules/`, `.git/` history, and local SQLite
databases into the image. That makes images massive and slow to build.

---

## Docker Concepts Glossary

| Term | Plain English | MKJ Example |
|---|---|---|
| **Image** | A frozen blueprint of your app + environment | The built Django image with all packages |
| **Container** | A running instance of an image | The `web` container serving your app |
| **Volume** | Persistent storage that survives container restarts | Where Postgres stores your data |
| **Bind mount** | Real-time sync between your laptop and container | Your code folder mapped to `/app` |
| **Service** | A container defined in docker-compose.yml | `web`, `db`, `redis`, `celery` |
| **Network** | Private Docker network services use to talk | How `web` connects to `db` |
| **Registry** | Where images are stored (like GitHub for code) | Docker Hub (`python:3.12-slim` lives here) |

---

## Docker vs docker-compose vs Kubernetes

```
Docker          → runs ONE container on ONE machine
docker-compose  → runs MULTIPLE containers on ONE machine (your laptop)
Kubernetes      → runs MULTIPLE containers across MULTIPLE machines (servers)
```

**Docker is the engine.** docker-compose and Kubernetes both use Docker
under the hood — they're just orchestration tools that manage Docker
containers at different scales.

Railway uses Kubernetes internally. When you deploy to Railway, your
container is actually running inside Railway's Kubernetes cluster. You
just never see it because Railway abstracts all of that away.

---

## Commands Reference

### Starting and stopping

```bash
# Build images and start all containers (first time or after code changes)
docker compose up --build

# Start all containers (if already built)
docker compose up

# Start in the background (detached mode) — you get your terminal back
docker compose up -d

# Stop all containers (keeps data in volumes)
docker compose down

# Stop and DELETE all volumes (wipes your local database — careful!)
docker compose down -v
```

### Watching logs

```bash
# See logs from all containers
docker compose logs -f

# See logs from only the Django container
docker compose logs -f web

# See logs from only Postgres
docker compose logs -f db
```

### Running Django management commands

```bash
# Run migrations
docker compose exec web python manage.py migrate

# Create a superuser
docker compose exec web python manage.py createsuperuser

# Open the Django shell
docker compose exec web python manage.py shell

# Collect static files
docker compose exec web python manage.py collectstatic --noinput

# Run any management command
docker compose exec web python manage.py <command>
```

**Railway comparison:** On Railway you run management commands via the
Railway CLI or the "Deploy → Start Command" shell. `docker compose exec`
is the local equivalent — it runs a command inside a running container.

### Inspecting containers

```bash
# See all running containers
docker compose ps

# Open a bash shell INSIDE the web container
docker compose exec web bash

# See all Docker images on your machine
docker images

# See disk usage by Docker
docker system df

# Clean up stopped containers, unused images, unused networks
docker system prune
```

### Rebuilding after changes

```bash
# If you changed requirements.txt (added/removed packages):
docker compose up --build

# If you only changed Python code (no new packages):
# Nothing needed — the bind mount syncs changes automatically.
# Django's runserver will auto-reload.
```

---

## First-Time Setup Walkthrough

1. **Make sure Docker Desktop is running** (check the system tray)

2. **Create your `.env.docker` file** from the example:
   ```bash
   # The file already exists in this project — just verify it's there
   ls .env.docker
   ```

3. **Build and start everything:**
   ```bash
   docker compose up --build
   ```
   What happens:
   - Docker pulls `postgres:16-alpine` and `redis:7-alpine` from Docker Hub
   - Docker builds your Django image using the `Dockerfile`
   - All 4 containers start
   - `db` and `redis` run healthchecks
   - `web` waits for them to be healthy, then starts Django runserver
   - You'll see Django's startup logs appear

4. **In a second terminal, run migrations:**
   ```bash
   docker compose exec web python manage.py migrate
   ```

5. **Create a superuser:**
   ```bash
   docker compose exec web python manage.py createsuperuser
   ```

6. **Visit your app:**
   Open http://localhost:8000 in your browser

7. **When done for the day:**
   ```bash
   docker compose down
   ```
   Your database data is safe in the `postgres_data` volume.

---

## How This Maps to Railway's Startup Process

Your `railway_start.sh` runs on Railway every time the container starts:
```bash
python manage.py collectstatic --noinput
python manage.py migrate --noinput
python manage.py backfill_ligi_county_discipline
...
exec gunicorn mkj_cms.wsgi --bind 0.0.0.0:$PORT
```

Locally with Docker, we run these manually (step by step) so you can
see each one. In production on Railway, they all run automatically on
every deploy. That's the only difference.

---

## Troubleshooting

**"connection refused" when Django tries to connect to Postgres:**
The `db` container might still be starting. Wait a few seconds and retry,
or check `docker compose logs db`.

**"port 8000 is already in use":**
Something else is using port 8000 on your machine (maybe a local
`runserver`). Either stop that process or change the port in
`docker-compose.yml` to `"8001:8000"`.

**Changes to code not showing up:**
The bind mount should sync automatically. Try restarting just the web
container: `docker compose restart web`

**Need to reset the database completely:**
```bash
docker compose down -v   # WARNING: deletes all local data
docker compose up --build
```

**Image is huge / build is slow:**
Check `.dockerignore` is in place. Run `docker system prune` to clean up
old unused images and layers.

---

## What's Next — The Learning Path

```
✅ Level 1: Docker basics (Dockerfile, images, containers)
✅ Level 2: docker-compose (multi-container apps, networking, volumes)
⏳ Level 3: Docker in CI/CD (GitHub Actions builds your image on every push)
⏳ Level 4: Pushing images to a registry (Docker Hub, AWS ECR, GitHub Container Registry)
⏳ Level 5: Kubernetes basics (kubectl, pods, deployments, services)
⏳ Level 6: Managed Kubernetes (AWS EKS, GKE) — Railway under the hood
```
