# syntax=docker/dockerfile:1

# === Builder Stage ===
FROM python:3.12-slim AS builder

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml ./
RUN uv pip install --system --no-cache -r pyproject.toml

# === Runtime Stage ===
FROM python:3.12-slim AS runtime

# GPU support: install CUDA runtime if available
# For GPU deployments, switch base to nvidia/cuda:12.x-runtime-ubuntu22.04
ENV NVIDIA_VISIBLE_DEVICES=all
ENV NVIDIA_DRIVER_CAPABILITIES=compute,utility

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY src/ ./src/

EXPOSE 8001

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
