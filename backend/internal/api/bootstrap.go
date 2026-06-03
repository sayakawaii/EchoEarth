package api

import (
	"encoding/json"
	"net/http"

	"github.com/sayakawaii/echoearth/backend/internal/geoip"
	"github.com/sayakawaii/echoearth/backend/internal/store"
	"github.com/sayakawaii/echoearth/backend/internal/util"
)

type bootstrapResp struct {
	IPLocation    geoip.Location  `json:"ipLocation"`
	ActiveBubbles []*store.Bubble `json:"activeBubbles"`
	Online        int             `json:"online"`
}

func bootstrapHandler(d Deps) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := util.ClientIP(r)
		loc := d.GeoIP.Lookup(r.Context(), ip)
		resp := bootstrapResp{
			IPLocation:    loc,
			ActiveBubbles: d.Store.Snapshot(),
			Online:        d.Hub.Online(),
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}
}
