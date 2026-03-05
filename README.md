# IntraCore Solutions

Voice assistant for IT ticketing and identity verification, built for [Cognigy's Capstone Sprint](https://www.cognigy.com/). The system combines Cognigy.AI conversational AI with xApps for visual interaction, backed by an IntraCore API that integrates with Postgres.

## Features

- **Identity & Verification (ID&V):** Verify via ANI/phone number, email, and employee number
- **Internal Ticketing:** Create, check status, update, close, and search ticket history
- **FAQ:** Common questions answered by the voice agent
- **Voice Channels:** WebRTC and dial-in
- **Multilingual:** English, Thai, Japanese, German (press 1–4 for language selection)

## Tech Stack

| Category      | Technology                                                          |
| ------------- | ------------------------------------------------------------------- |
| Runtime       | [Bun](https://bun.com)                                              |
| Web Framework | [Elysia](https://elysiajs.com)                                      |
| ORM           | [Drizzle](https://orm.drizzle.team)                                 |
| Database      | [Postgres](https://postgresql.org)                                  |
| Logging       | [Pino](https://github.com/pinojs/pino)                              |
| xApp UI       | [Material Web](https://github.com/material-components/material-web) |

## Prerequisites

- [Bun](https://bun.sh) 1.x
- PostgreSQL

## Installation

```bash
bun install
```

Copy environment variables:

```bash
cp .env.example .env
```

Edit `.env` with your Postgres connection string and settings:

| Variable              | Description                 | Default |
| --------------------- | --------------------------- | ------- |
| `DATABASE_URL`        | Postgres connection string  | —       |
| `PORT`                | Server port                 | 3000    |
| `SESSION_TTL_SECONDS` | Session lifetime in seconds | 900     |

## Database

Run migrations:

```bash
bun run migrate
```

Seed sample data (optional):

```bash
bun run seed
```

## Usage

Development (hot reload):

```bash
bun run dev
```

Production:

```bash
bun run start
```

## API

- **Docs:** [https://intracore.eden.spicyz.io/docs](https://intracore.eden.spicyz.io/docs)

### Public Endpoints

- `GET /` — Health
- `GET /health` — Health check
- `POST /v1/auth/token` — Exchange GitHub token for session

### Protected Endpoints (Bearer token)

- `POST /v1/auth/verify` — Identity verification
- `GET/POST /v1/tickets` — List, create tickets
- `GET/PUT/DELETE /v1/tickets/:id` — Ticket CRUD
- `GET /v1/tickets/history?employeeId=...` — Ticket history
- `GET/POST /v1/companies`, `GET/PUT/DELETE /v1/companies/:id`
- `GET/POST /v1/employees`, `GET/PUT/DELETE /v1/employees/:id`
- `GET/POST /v1/whitelists`, `GET/PUT/DELETE /v1/whitelists/:id`
- `GET /v1/sessions`, `GET/DELETE /v1/sessions/:id`

## xApps

Cognigy xApps for visual interaction:

- **verification.html** — Collects phone, email, employee number for ID&V
- **ticket-list.html** — Displays ticket history
- **ticket-detail.html** — Full ticket details

## Docker

```bash
docker build -t intracore .
docker run -p 3000:3000 -e DATABASE_URL=postgres://... intracore
```

Image: `ghcr.io/boss-spicyz100x/intracore:latest`

## Testing

```bash
bun test
```

## Project Structure

```txt
├── src/
│   ├── auth/          # GitHub OAuth, sessions, middleware
│   ├── db/            # Schema, migrations, seed
│   ├── middleware/    # Request logging
│   ├── routes/v1/     # API routes
│   └── types/         # TypeScript types
├── xapps/             # Cognigy xApps (verification, ticket-list, ticket-detail)
├── migrations/        # Drizzle migrations
├── tests/             # Unit and e2e tests
└── docs/              # Technical design document
```

## Documentation

- [Technical Design Document](docs/technical-design-document/technical-design-document.pdf) (PDF)

## Authors

- Nutchanon Phongoen <earth@100x.fi>
- Supachai Kheawjuy <boss.spicyz@100x.fi>
