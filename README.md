# Neck Diagrams

An Excalidraw-inspired guitar neck diagram editor for creating scale visualizations, chord diagrams, and fretboard patterns.

## Features

- **Infinite Canvas**: Pan, zoom, and arrange multiple diagrams freely
- **Configurable Necks**: Support for 4-8 string instruments, adjustable fret ranges, capo positions
- **Note Annotations**: Interval notation (R, b3, 5), key notation (C, D, E), picking patterns (↓, ↑)
- **Scale Library**: Major, harmonic minor, melodic minor modes, pentatonics, blues, exotic scales
- **Multiple Tunings**: Standard, drop, open, and custom tunings for guitar and bass
- **Export**: PNG and PDF export for individual diagrams or full page

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| State | Zustand |
| Backend | Haskell, Scotty (web framework) |
| Database | PostgreSQL 16, postgresql-simple |
| Auth | JWT (jose library), bcrypt |
| Proxy | NGINX |
| Container | Docker Compose |

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for frontend development)
- Stack (Haskell build tool, for backend development)

### Development Setup

1. **Clone and configure environment:**

```bash
git clone <repo-url>
cd neck-diagrams
cp .env.template .env
# Edit .env with your settings
```

2. **Start the database:**

```bash
docker-compose up -d postgres
```

3. **Run the backend:**

```bash
cd backend
stack build
stack exec neck-diagrams-api
```

4. **Run the frontend:**

```bash
cd frontend
npm install
npm run dev
```

5. **Access the app:**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001/api

### Production (Docker)

```bash
docker-compose up -d
```

Access at http://localhost (NGINX proxy)

## Project Structure

```
neck-diagrams/
├── frontend/                   # Next.js Static App
│   ├── src/
│   │   ├── app/               # App router pages
│   │   ├── components/        # React components
│   │   ├── stores/            # Zustand stores
│   │   ├── lib/               # Utilities, API client
│   │   ├── hooks/             # Custom React hooks
│   │   └── types/             # TypeScript types
│   └── Dockerfile
│
├── backend/                    # Haskell Scotty API
│   ├── app/Main.hs            # Entry point
│   ├── src/                   # Source modules
│   │   ├── Api.hs             # Route definitions
│   │   ├── Auth.hs            # JWT authentication
│   │   ├── Config.hs          # Environment config
│   │   ├── Database.hs        # PostgreSQL queries
│   │   ├── Types.hs           # Data types
│   │   └── Handlers/          # Route handlers
│   ├── sql/                   # Database migrations
│   └── Dockerfile
│
├── nginx/nginx.conf           # Reverse proxy config
├── docker-compose.yml         # Container orchestration
├── .env.template              # Environment template
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, get JWT |
| POST | `/api/auth/refresh` | Refresh JWT token |
| GET | `/api/projects` | List user projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Get project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/projects/:id/diagrams` | List diagrams |
| POST | `/api/projects/:id/diagrams` | Create diagram |
| PUT | `/api/diagrams/:id` | Update diagram |
| DELETE | `/api/diagrams/:id` | Delete diagram |
| GET | `/api/scales` | List all scales |
| GET | `/api/scales/:id/shapes` | Get scale shapes |
| GET | `/api/tunings` | List tunings |

## Canvas Interactions

| Action | Interaction |
|--------|-------------|
| Pan | Space + Drag, or Middle Mouse |
| Zoom | Scroll wheel, or Pinch |
| Select | Click on diagram |
| Multi-select | Shift + Click |
| Move | Drag selected diagram |
| Duplicate | Alt + Drag |
| Scale | Alt + Shift + Drag |
| Add Note | Click on fret position |
| Remove Note | Click existing note |

## License

MIT
