# 🏗️ Deployment Architecture

## Production Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          INTERNET / USERS                            │
└────────────────────┬────────────────────────────┬───────────────────┘
                     │                            │
                     │ HTTPS                      │ HTTPS
                     ▼                            ▼
        ┌────────────────────────┐   ┌────────────────────────┐
        │   Vercel CDN Edge      │   │  DigitalOcean Region   │
        │  (Frontend Static)     │   │   (Backend Services)   │
        └────────────────────────┘   └────────────────────────┘
                     │                            │
                     │                            │
        ┌────────────▼────────────┐              │
        │   React Application     │              │
        │   - Trading Dashboard   │              │
        │   - Authentication UI   │              │
        │   - Charts & Trades     │              │
        └────────────┬────────────┘              │
                     │                            │
                     │ WSS/HTTPS                  │
                     │ (API Calls)                │
                     └────────────────────────────┘
                                   │
                     ┌─────────────▼──────────────┐
                     │   Backend API Server       │
                     │   (Node.js/Bun + Express)  │
                     │   - REST API (Port 3001)   │
                     │   - WebSocket (Port 3002)  │
                     │   - Background Workers     │
                     └─────────────┬──────────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │    │ Binance WebSocket│
│  + TimescaleDB  │    │   (Cache/PubSub)│    │  (Price Feed)    │
│   (Database)    │    │                 │    │                  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                       │                       │
        │ Port 25060 (TLS)     │ Port 25061 (TLS)     │ WSS
        │                       │                       │
┌───────▼────────────────────────▼──────────────────────▼────────┐
│              DigitalOcean Private Network                      │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Authentication Flow

```
User → Frontend → Backend API (POST /api/v1/user/signin)
                     ↓
                  Verify in PostgreSQL
                     ↓
                  Generate JWT
                     ↓
Frontend ← JWT Token ← Backend
```

### 2. Real-time Price Updates Flow

```
Binance → WebSocket → Backend Worker
                         ↓
                    Process & Store (TimescaleDB)
                         ↓
                    Publish to Redis
                         ↓
                    WebSocket Server
                         ↓
Frontend ← WS Update ← Backend WS
```

### 3. Trade Execution Flow

```
User → Frontend → Backend API (POST /api/v1/trade)
                     ↓
                  Validate (JWT + Balance)
                     ↓
                  Store in PostgreSQL
                     ↓
                  Update Redis (for PnL calc)
                     ↓
                  Broadcast via WebSocket
                     ↓
Frontend ← Trade Confirmation ← Backend
```

## Component Communication

```
┌──────────────────────────────────────────────────────────────┐
│                      Frontend (Vercel)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Auth Pages  │  │  Dashboard  │  │   Trades    │          │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
│         │                │                │                   │
│         └────────────────┴────────────────┘                   │
│                          │                                     │
│                 ┌────────▼────────┐                           │
│                 │  API Client     │                           │
│                 │  (config/api.ts)│                           │
│                 └────────┬────────┘                           │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTPS/WSS
                           │ (Environment-based URLs)
┌──────────────────────────▼──────────────────────────────────┐
│                    Backend (DigitalOcean)                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                     Express Server                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐             │ │
│  │  │  Routes  │  │Controllers│  │Middleware│             │ │
│  │  └────┬─────┘  └─────┬─────┘  └─────┬────┘             │ │
│  │       └───────────────┴──────────────┘                  │ │
│  │                       │                                  │ │
│  │       ┌───────────────┴───────────────┐                 │ │
│  │       │                               │                 │ │
│  │  ┌────▼─────┐                  ┌─────▼──────┐          │ │
│  │  │ Services │                  │   Models   │          │ │
│  │  └────┬─────┘                  └─────┬──────┘          │ │
│  └───────┼──────────────────────────────┼─────────────────┘ │
│          │                               │                   │
│  ┌───────▼────────────┐         ┌────────▼────────┐         │
│  │  Background Workers │         │  WebSocket      │         │
│  │  - PnL Calculator  │         │  Server         │         │
│  │  - Trade Monitor   │         │  (Port 3002)    │         │
│  │  - Query Processor │         └─────────────────┘         │
│  └────────────────────┘                                      │
│          │                                                    │
│  ┌───────▼──────────────────────────────────┐               │
│  │           Database Layer                  │               │
│  │  ┌──────────────┐    ┌─────────────────┐ │               │
│  │  │  PostgreSQL  │    │      Redis      │ │               │
│  │  │  (Persist)   │    │  (Cache/PubSub) │ │               │
│  │  └──────────────┘    └─────────────────┘ │               │
│  └───────────────────────────────────────────┘               │
└──────────────────────────────────────────────────────────────┘
```

## Network Architecture

```
┌────────────────────────────────────────────────────────────┐
│                    Internet Layer                           │
└──────────────────────┬─────────────────┬───────────────────┘
                       │                 │
            ┌──────────▼────────┐   ┌────▼──────────────┐
            │  Vercel Edge CDN  │   │ DigitalOcean LB  │
            │  (Global)         │   │  (Region)        │
            └──────────┬────────┘   └────┬─────────────┘
                       │                 │
            ┌──────────▼────────┐   ┌────▼─────────────────┐
            │   Static Files    │   │  Backend Instances   │
            │   (Cached)        │   │  (Scalable)          │
            └───────────────────┘   └────┬─────────────────┘
                                          │
                         ┌────────────────┴────────────────┐
                         │                                 │
                    ┌────▼──────────┐           ┌─────────▼──────┐
                    │   PostgreSQL  │           │      Redis     │
                    │   (Managed)   │           │    (Managed)   │
                    │   + TimescaleDB│          │                │
                    └───────────────┘           └────────────────┘
```

## Deployment Options

### Option A: App Platform (Managed)

```
┌────────────────────────────────────────────────────────┐
│           DigitalOcean App Platform                    │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Automated Container Orchestration               │  │
│  │  - Auto-scaling                                  │  │
│  │  - Health checks                                 │  │
│  │  - Rolling deployments                           │  │
│  │  - SSL/TLS automatic                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Your Backend Container                          │  │
│  │  (Built from Dockerfile)                         │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Option B: Droplet (Self-Managed)

```
┌────────────────────────────────────────────────────────┐
│           DigitalOcean Droplet (Ubuntu)                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Nginx (Reverse Proxy + SSL)                     │  │
│  │  Ports: 80 (HTTP), 443 (HTTPS)                   │  │
│  └─────────────────┬────────────────────────────────┘  │
│                    │                                    │
│  ┌─────────────────▼────────────────────────────────┐  │
│  │  Docker Container                                 │  │
│  │  - Backend API (3001)                             │  │
│  │  - WebSocket (3002)                               │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## Security Layers

```
┌──────────────────────────────────────────────────┐
│              Security Layers                      │
├──────────────────────────────────────────────────┤
│ 1. CDN/Edge → DDoS Protection                    │
│ 2. HTTPS/WSS → Encrypted Transport               │
│ 3. CORS → Origin Validation                      │
│ 4. JWT → Authentication                          │
│ 5. Database → SSL/TLS Connection                 │
│ 6. Redis → Password + TLS                        │
│ 7. Firewall → Port Restrictions                  │
│ 8. Environment Variables → Secret Management     │
└──────────────────────────────────────────────────┘
```

## Scaling Strategy

```
Current (MVP):
┌──────────────┐     ┌──────────────┐
│  1 Backend   │────▶│  PostgreSQL  │
│  Instance    │     │  + Redis     │
└──────────────┘     └──────────────┘
     ~100 users

Future (Growth):
┌──────────────┐     ┌──────────────┐
│  Backend 1   │────▶│              │
├──────────────┤     │  PostgreSQL  │
│  Backend 2   │────▶│  (Replicated)│
├──────────────┤     │              │
│  Backend 3   │────▶│  + Redis     │
└──────────────┘     │  (Cluster)   │
                     └──────────────┘
     ~10,000 users
```

## Monitoring Points

```
┌─────────────────────────────────────────────────┐
│            Monitoring Dashboard                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Frontend (Vercel)                               │
│  ├─ Page Load Times                             │
│  ├─ Error Rate                                   │
│  └─ User Activity                                │
│                                                  │
│  Backend (DigitalOcean)                          │
│  ├─ API Response Times                           │
│  ├─ CPU / Memory Usage                           │
│  ├─ WebSocket Connections                        │
│  ├─ Error Logs                                   │
│  └─ Request Rate                                 │
│                                                  │
│  Database (PostgreSQL)                           │
│  ├─ Query Performance                            │
│  ├─ Connection Pool Usage                        │
│  ├─ Disk Space                                   │
│  └─ Replication Lag                              │
│                                                  │
│  Cache (Redis)                                   │
│  ├─ Hit/Miss Ratio                               │
│  ├─ Memory Usage                                 │
│  └─ Connection Count                             │
│                                                  │
│  External Services                               │
│  └─ Binance WebSocket Status                     │
└─────────────────────────────────────────────────┘
```

---

This architecture provides:
✅ High availability
✅ Scalability
✅ Security
✅ Performance
✅ Cost efficiency
✅ Easy monitoring
