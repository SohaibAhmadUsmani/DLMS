# DLMS — Django + FastAPI Learning Management System

## Architecture

- **Django (console domain)** — admin panel, user management, system oversight — mounted at `/api/v1/console`
- **FastAPI (core domain)** — courses, quizzes, assignments, enrollments, certificates — mounted at `/api/v1/core`
- **Single ASGI process** — Starlette composes both apps via `Mount`

## Quick Start

```bash
cd dlms_backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
uvicorn config.asgi:application --reload
```

## Verify

- Django admin: http://localhost:8000/admin/
- FastAPI health: http://localhost:8000/api/v1/core/health
- FastAPI docs: http://localhost:8000/api/v1/core/docs
