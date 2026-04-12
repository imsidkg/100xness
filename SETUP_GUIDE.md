# Exness Trading Dashboard – Setup & Running Guide

This guide details how to set up the environment and run both the frontend and backend of the Exness Trading Dashboard.

## Prerequisites

- **Node.js / Bun**: Ensure you have [Bun](https://bun.sh/) installed (recommended for performance).
- **Docker**: Required for running PostgreSQL (TimescaleDB) and Redis locally.

---

## 1. Backend Setup (`price-poller-be/`)

### A. Environment Configuration
Navigate to the `price-poller-be/` directory and create a `.env` file from the example:

```bash
cd price-poller-be
cp .env.example .env
```

Edit the `.env` file with your local settings. If you use the Docker setup below, the defaults should work.

### B. Infrastructure (PostgreSQL & Redis)
The backend requires PostgreSQL (with TimescaleDB extension) and Redis. You can start them using Docker Compose:

```bash
docker compose up -d
```

### C. Install Dependencies
```bash
bun install
```

### D. Run the Backend
The backend entry point is `src/index.ts`. It will automatically initialize the database schema.

```bash
bun src/index.ts
```

- **API Port**: Default is `3001`.
- **WebSocket Port**: Default is `3002`.

---

## 2. Frontend Setup (`frontend/`)

### A. Environment Configuration
Navigate to the `frontend/` directory and create a `.env` file:

```bash
cd ../frontend
cp .env.example .env
```

Ensure `VITE_API_URL` and `VITE_WS_URL` point to your running backend (e.g., `http://localhost:3001` and `ws://localhost:3002`).

### B. Install Dependencies
```bash
bun install
```

### C. Run the Frontend
```bash
bun run dev
```

Open `http://localhost:3000` (or the port indicated in the terminal) to view the dashboard.

---

## What I've Fixed & Improved

1.  **Crash on missing environment variables**: I've provided default values for database settings, allowing the app to start even without a full `.env` file (though you should still configure one for your specific needs).
2.  **Initialization Race Condition**: I've ensured the database schema is fully initialized before the server starts accepting connections. This prevents "table not found" errors when trying to sign in.
3.  **Correct Free Margin Calculation**: Fixed the logic in `userService.ts` and `tradeService.ts` to include floating Unrealized PnL in the Free Margin calculation (Equity - Margin).
4.  **TimescaleDB Materialized Views**: Fixed the refresh logic to use `refresh_continuous_aggregate`, which is the correct procedure for TimescaleDB's continuous aggregates.
5.  **Code Quality**: Refactored the server startup to be more modular and cleaned up redundant imports.

---

## Troubleshooting

- **Database Errors**: Ensure Docker is running and the `timescaledb` and `redis` containers are healthy.
- **WebSocket Connection**: If the frontend doesn't show price updates, check that the backend is running and the `VITE_WS_URL` in the frontend `.env` is correct.
- **Login Issues**: If you get an "Internal Server Error" on login, check the backend logs. It usually means the database connection failed or the tables weren't created correctly.
