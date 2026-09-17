.PHONY: dev dev-services dev-servers down test build

# Start everything at once (Postgres + Redis in Docker, then Medusa + Express + Vite in parallel)
dev: dev-services
	pnpm -r --parallel run dev

# Start only Docker background services (Postgres & Redis)
dev-services:
	docker compose -f docker-compose.dev.yml up -d

# Start only the 3 dev servers (Medusa, Express API, Vite Storefront)
dev-servers:
	pnpm -r --parallel run dev

# Stop all background Docker containers
down:
	docker compose -f docker-compose.dev.yml down

# Run all tests across the monorepo
test:
	pnpm test

# Build all packages and applications for production
build:
	pnpm build
