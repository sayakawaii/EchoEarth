.PHONY: install backend frontend dev clean deploy-bundle

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
	rm -rf dist

# Build a self-contained bundle ready for rsync to a Linux/amd64 host.
# Output: dist/deploy-bundle/{bin/echoearth, web/, echoearth.service, install.sh, README.md}
deploy-bundle:
	@echo "==> cross-compile backend (linux/amd64, CGO=0, stripped)"
	mkdir -p dist/deploy-bundle/bin
	cd backend && CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
	  go build -trimpath -ldflags="-s -w" \
	  -o ../dist/deploy-bundle/bin/echoearth ./cmd/server
	@echo "==> build frontend"
	cd frontend && npm run build
	rm -rf dist/deploy-bundle/web
	mkdir -p dist/deploy-bundle/web
	cp -R frontend/dist/. dist/deploy-bundle/web/
	@echo "==> stage deploy assets"
	cp deploy/echoearth.service dist/deploy-bundle/
	cp deploy/install.sh        dist/deploy-bundle/
	cp deploy/README.md         dist/deploy-bundle/
	chmod +x dist/deploy-bundle/install.sh
	@echo "==> bundle ready:"
	@du -sh dist/deploy-bundle dist/deploy-bundle/* 2>/dev/null | sort -h
