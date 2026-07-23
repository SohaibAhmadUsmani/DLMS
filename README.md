<img width="1345" height="642" alt="image" src="https://github.com/user-attachments/assets/51242b3f-4dfc-48ab-b8a6-1a02d47941fa" />## Learning Management System

A modern Learning Management System (LMS) built with **React, Django, FastAPI, and MongoDB**, featuring role-based learning, AI-powered quiz generation, integrated payments, and a scalable microservices architecture.

## Features

### Authentication & User Management

- JWT Authentication
- Role-Based Access Control
- Student, Teacher, and Admin Dashboards
- Secure Protected Routes

### Course Management

- Course & Section Management
- Learning Material Uploads
- Student Enrollment
- Progress Tracking

### Interactive Learning

- Embedded YouTube Lectures
- PDF & Reading Material Viewer
- Course Learning Interface

### Quiz System

- Quiz Creation & Management
- Question Image Support
- Timed Quiz Attempts
- Automatic Evaluation
- Result Analysis

### AI Quiz Generator

Generate quizzes automatically from existing course materials or uploaded lecture notes.

Supported capabilities:

- Multiple Choice Questions
- True / False Questions
- Short Answer Questions
- Configurable Difficulty
- Teacher Review Before Publishing

Powered by a reusable AI Content Intelligence Engine using **Groq LLM** and **PyMuPDF**.

### Payments

- Stripe Checkout Integration
- Secure Payment Verification

## System Architecture

```
                 React Frontend
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
   Django REST API             FastAPI Services
        │                               │
        └───────────────┬───────────────┘
                        │
                     MongoDB
```

## Technology Stack

### Frontend

- React
- Vite
- Redux Toolkit
- RTK Query
- Tailwind CSS

### Backend

- Django
- Django REST Framework
- FastAPI

### Database

- MongoDB

### AI

- Groq API
- PyMuPDF

### Payments

- Stripe

## Project Structure

```text
backend/
├── Django
├── fastapi_service/

frontend/

uploads/
```

---

## Getting Started

Clone the repository

```bash
git clone https://github.com/your-username/your-repository.git
```

Backend

```bash
cd backend

pip install -r requirements.txt

python manage.py runserver

python -m uvicorn config.asgi:application

Frontend

```bash
cd frontend

npm install

npm run dev
```

## Roadmap

- AI Teaching Assistant
- Personalized Learning Paths
- AI Flashcards
- AI Study Planner
- Student Performance Analytics
- Live Classroom Support

---

## Author

**Sohaib Usmani**

Computer Science Undergraduate

Full Stack Developer
