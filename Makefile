.PHONY: install backend frontend dev clean

install:
	cd backend && go mod tidy
	cd frontend && npm install

backend:
	cd backend && go run ./cmd/server

frontend:
	cd frontend && npm run dev

# Run backend and frontend in parallel. Ctrl-C kills both.
dev:
	@echo "Starting backend on :8080 and frontend on :5173 ..."
	@trap 'kill 0' EXIT INT TERM; \
	  (cd backend && go run ./cmd/server) & \
	  (cd frontend && npm run dev) & \
	  wait

clean:
	rm -rf backend/bin backend/tmp
	rm -rf frontend/node_modules frontend/dist
