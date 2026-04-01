FROM node:20-slim AS frontend-build

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN python -m pip install --no-cache-dir uv

COPY backend/requirements.txt /app/requirements.txt
RUN uv pip install --system -r requirements.txt

COPY backend /app
COPY --from=frontend-build /frontend/out /app/static

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
