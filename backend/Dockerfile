FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libpq-dev \
        postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements*.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy source code
COPY . .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
