# ─────────────────────────────────────────────────────────────────────────────
# DOCKERFILE — MKJ SUPA CUP
#
# A Dockerfile is a recipe. Docker reads it top to bottom and builds an
# "image" — a frozen, portable snapshot of your app and everything it needs.
#
# Each line is a layer. Docker caches layers, so if requirements.txt hasn't
# changed, it skips the pip install step entirely on the next build.
# ─────────────────────────────────────────────────────────────────────────────

# FROM: "Start with this base image from Docker Hub"
# python:3.12-slim is an official minimal Linux image with Python 3.12 already
# installed. "slim" means it strips out docs and extra tools to keep it small.
# Your runtime.txt says python-3.12.7, so we match that here.
FROM python:3.12-slim

# ENV: Set environment variables inside the container.
# PYTHONUNBUFFERED=1  → print() and logs show up immediately (no buffering)
# PYTHONDONTWRITEBYTECODE=1 → don't create .pyc cache files (saves space)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# RUN: Execute a shell command while building the image.
# We install libpq-dev because psycopg2 (the Postgres driver) needs it.
# --no-install-recommends keeps the install lean.
# We clean up the apt cache at the end to shrink the image size.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# WORKDIR: "From now on, all commands run inside /app inside the container"
# This is like doing `cd /app` and it creates the folder if it doesn't exist.
WORKDIR /app

# COPY: Copy files from your computer INTO the image.
# We copy requirements.txt FIRST (before the rest of the code) on purpose.
# Why? Because Docker caches layers. If your code changes but requirements.txt
# doesn't, Docker skips the pip install and uses the cached layer. Faster builds.
COPY requirements.txt .

# RUN: Install Python packages.
# --no-cache-dir means pip won't store downloaded files — smaller image.
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# COPY: Now copy the rest of your project code into /app
# This is a separate layer from requirements so code changes don't retrigger
# the slow pip install step.
COPY . .

# EXPOSE: Document which port this container listens on.
# This doesn't actually open the port — that happens in docker-compose.
# It's just a label so other developers know what port to map.
EXPOSE 8000

# CMD: The default command to run when the container starts.
# docker-compose.yml will override this for development, but it's
# a good fallback for running the image directly.
CMD ["gunicorn", "mkj_cms.wsgi", "--bind", "0.0.0.0:8000", "--workers", "2", "--timeout", "120"]
