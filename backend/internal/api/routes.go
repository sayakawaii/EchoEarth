package api

import (
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"strings"

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
	// StaticDir, when non-empty, enables serving the SPA build (index.html +
	// hashed assets) from this directory with SPA fallback. Leave empty in
	// dev so Vite owns the frontend.
	StaticDir string
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

	if d.StaticDir != "" {
		r.Handle("/*", spaHandler(d.StaticDir, d.Log))
	}

	return r
}

// spaHandler serves the Vite build with SPA fallback. Assets under /assets/
// get a long immutable cache (hashed filenames); everything else gets
// no-store so the index always reflects the latest deploy.
func spaHandler(dir string, log *slog.Logger) http.Handler {
	root := filepath.Clean(dir)
	indexPath := filepath.Join(root, "index.html")
	fs := http.FileServer(http.Dir(root))

	serveIndex := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		http.ServeFile(w, r, indexPath)
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		clean := filepath.Clean(r.URL.Path)
		// Defence in depth: filepath.Clean already strips ../ but reject anything weird.
		if strings.Contains(clean, "..") {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		if clean == "/" || clean == "." {
			serveIndex(w, r)
			return
		}

		full := filepath.Join(root, clean)
		info, err := os.Stat(full)
		if err != nil || info.IsDir() {
			// Unknown path — let the SPA router decide.
			serveIndex(w, r)
			return
		}

		if strings.HasPrefix(clean, "/assets/") {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "public, max-age=300")
		}
		fs.ServeHTTP(w, r)
	})
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
