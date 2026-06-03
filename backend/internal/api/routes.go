package api

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"github.com/sayakawaii/echoearth/backend/internal/geoip"
	"github.com/sayakawaii/echoearth/backend/internal/hub"
	"github.com/sayakawaii/echoearth/backend/internal/store"
)

// Deps bundles handler dependencies.
type Deps struct {
	Hub   *hub.Hub
	Store *store.Store
	GeoIP *geoip.Resolver
	Log   *slog.Logger
}

// NewRouter builds the HTTP router.
func NewRouter(d Deps) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.Recoverer)
	r.Use(middleware.RealIP)
	r.Use(corsDevPermissive)

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	r.Get("/api/bootstrap", bootstrapHandler(d))
	r.Get("/ws", d.Hub.ServeWS)

	return r
}

// corsDevPermissive is permissive for dev. Replace with stricter CORS for prod.
func corsDevPermissive(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
