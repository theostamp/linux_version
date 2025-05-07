# backend/Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential curl libpq-dev netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry (optional αν δεν χρησιμοποιείς poetry.lock)
RUN curl -sSL https://install.python-poetry.org | python3 - --version 1.8.0
ENV PATH="/root/.local/bin:$PATH"
RUN poetry config virtualenvs.create false

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

RUN chmod +x start.sh
ENTRYPOINT ["./start.sh"]

