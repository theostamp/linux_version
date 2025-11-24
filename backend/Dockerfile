FROM python:3.12-slim

# Force rebuild - 2025-10-28
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# System dependencies including AI dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libpq-dev \
        postgresql-client \
        libmagic1 \
        # AI dependencies
        tesseract-ocr \
        tesseract-ocr-ell \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
        libgomp1 && \
    rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements*.txt ./
RUN pip install --upgrade pip && \
    pip install -r requirements.txt && \
    pip install -r requirements-ai.txt && \
    pip install -r requirements_pdf.txt

# Copy source code
COPY . .
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Create media and static directories with proper permissions
RUN mkdir -p /vol/media/office_logos /vol/static && \
    chmod -R 755 /vol && \
    chown -R nobody:nogroup /vol

CMD ["/app/entrypoint.sh"]
