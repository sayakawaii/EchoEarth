package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/sayakawaii/echoearth/backend/internal/api"
	"github.com/sayakawaii/echoearth/backend/internal/geoip"
	"github.com/sayakawaii/echoearth/backend/internal/hub"
	"github.com/sayakawaii/echoearth/backend/internal/store"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	addr := envOr("ECHOEARTH_ADDR", ":8080")
	staticDir := os.Getenv("ECHOEARTH_STATIC_DIR")

	st := store.New(200)
	gr := geoip.NewResolver()
	cfg := hub.DefaultConfig()
	h := hub.New(cfg, st, gr, logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	h.StartBackgroundLoops(ctx)

	router := api.NewRouter(api.Deps{
		Hub:       h,
		Store:     st,
		GeoIP:     gr,
		Log:       logger,
		StaticDir: staticDir,
	})

	srv := &http.Server{
		Addr:              addr,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		logger.Info("server listening",
			"addr", addr,
			"staticDir", staticDir,
			"bubbleTtl", cfg.BubbleTTL.String(),
			"rateLimit", cfg.RateLimitWindow.String(),
		)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("listen failed", "err", err)
			os.Exit(1)
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
	logger.Info("shutdown signal received")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer shutdownCancel()
	_ = srv.Shutdown(shutdownCtx)
	logger.Info("server stopped")
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
