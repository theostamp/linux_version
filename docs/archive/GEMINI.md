# GEMINI Project Guidelines for Coding Agents

# GEMINI Codebase Architecture Overview

This document provides a high-level overview of the application's architecture, development stack, and key components.

## 1. Architectural Pattern

The application follows a **decoupled architecture** consisting of two main parts:

1.  **Monolithic Backend:** A powerful backend built with Django, responsible for all business logic, data processing, and API services.
2.  **Single Page Application (SPA) Frontend:** A modern, reactive user interface built with Next.js and React.

A critical feature of the architecture is its **multi-tenancy** capability, implemented using the `django-tenants` library. This allows the application to serve multiple customers from a single deployed instance, with complete data isolation between tenants, likely using a schema-per-tenant strategy in the database.

## 2. Backend

The backend is a robust Django application with a rich set of features and integrations.

-   **Framework:** Django (v4.2+)
-   **API:** Django REST Framework (DRF) is used to build a comprehensive set of RESTful APIs for the frontend to consume.
-   **Database:** PostgreSQL (v15) serves as the primary relational database.
-   **Asynchronous & Real-time Tasks:**
    -   **Celery:** Used for executing long-running or periodic background tasks (e.g., sending emails, processing data).
    -   **Django Channels:** Enables real-time functionality through WebSockets.
    -   **Redis:** Acts as the message broker for both Celery and Channels, and is also used for caching.
-   **Deployment:**
    -   **Gunicorn:** The primary WSGI server for handling synchronous HTTP requests.
    -   **Daphne:** The ASGI server used to handle real-time WebSocket connections for Channels.
-   **Key Integrations & Libraries:**
    -   `django-tenants`: For multi-tenancy data isolation.
    -   `stripe`: For payment processing and subscription management.
    -   `resend`: For transactional email delivery.
    -   **Google APIs:** Integrations with Google Calendar and Google Document AI for advanced features.

## 3. Frontend

The frontend is a modern, type-safe Single Page Application built for performance and a great user experience.

-   **Framework:** Next.js (v15+) with React (v19)
-   **Language:** TypeScript
-   **Styling:**
    -   **Tailwind CSS (v4):** A utility-first CSS framework for rapid and consistent styling.
    -   `clsx` & `tailwind-merge`: Utilities for conditional and conflict-free class name management.
-   **UI Components:**
    -   **Radix UI:** A library of unstyled, accessible, "headless" components (e.g., Dialogs, Popovers) that serve as the foundation for the custom UI.
    -   `lucide-react`: Provides a clean and consistent set of icons.
-   **State Management & Data Fetching:**
    -   `@tanstack/react-query`: Manages server state, handling data fetching, caching, and synchronization with the backend API.
    -   `axios`: The HTTP client used for making API requests.
-   **Forms:**
    -   `react-hook-form`: For building performant and flexible forms.
    -   `zod`: For schema declaration and validation, ensuring type-safe form data.
-   **Other Key Libraries:**
    -   `recharts`: For data visualization and charts.
    -   `date-fns`: For reliable and powerful date manipulation.
    -   `jspdf` & `html2canvas`: For client-side PDF generation.

## 4. Core Services

The application relies on two core external services, typically managed via Docker for local development.

-   **PostgreSQL:** The relational database for the Django backend.
-   **Redis:** The in-memory data store used for caching and as a message broker for background tasks and real-time communication.

## 5. Agent Tasks & Instructions (Jules)

### Task: Implement Role-Based Access Control (RBAC)

**PREREQUISITE (Backup):**
Before starting any code changes, create a new branch named `jules_backup` from the current `main` branch to serve as a complete save point.

**ROLES & SCOPE:**
The implementation must introduce and enforce the following four user roles and their respective scopes:

| Role | Scope (Context) | Security Enforcement |
|:---|:---|:---|
| Ultra Super User | Global (All Tenants) | Full, unrestricted access. |
| Admin | Tenant-level | Restricted to the assigned Tenant ID. |
| Internal Manager | Building-level | Restricted to assigned Building IDs within the Tenant. |
| Enikos (Tenant) | Unit-level & Public Announcements | Restricted to assigned Unit ID and public data for their building. |

**DELIVERABLES:**
1.  All RBAC logic must respect the existing `django-tenants` multi-tenancy implementation.
2.  Authorization checks must be applied at the **API layer (DRF)** and enforced in all relevant **PostgreSQL queries**.
3.  All changes must be committed to a new feature branch: **`feature/rbac-implementation`**.
4.  Include comprehensive **unit tests** for the authorization rules (e.g., test that an 'Enikos' cannot access another unit's data).