# Iteration 01 — MVP Skeleton

- **Date**: 2026-06-03
- **Slug**: `mvp-skeleton`
- **Status**: Delivered

## Scope(对照 REQUIREMENTS 章节编号)

- 3.1 用户与身份:昵称对话框 + localStorage,后端 UUID `clientId`。
- 3.2 地图:react-leaflet + OpenStreetMap tile,默认中心/缩放,允许平移与点击。
- 3.3 发消息:1–140 字符,10s/条 频控,WS `publish` 上行。
- 3.4 气泡显示:divIcon 自定义气泡,scale+fade 动画,5min TTL,前后端双兜底,渲染上限 200。
- 3.5 实时通道:gorilla/websocket Hub,JSON 帧协议(`publish/ping/hello/bubble/expire/pong/error`),客户端 25s 心跳 + 指数退避重连。
- 3.6 HTTP 接口:`GET /healthz`、`GET /api/bootstrap`。
- 4. 非功能:lat/lng 精度截断到 0.01;Vite 代理 `/ws` 与 `/api`;`slog` 结构化日志。

## Changes(新增文件清单)

- `README.md`、`REQUIREMENTS.md`、`OPEN_ITEMS.md`、`.gitignore`、`Makefile`
- `deliveries/2026-06-03_iter-01_mvp-skeleton.md`(本文件)
- `backend/`
  - `go.mod`、`go.sum`
  - `cmd/server/main.go`
  - `internal/api/routes.go`、`internal/api/bootstrap.go`
  - `internal/hub/hub.go`、`internal/hub/client.go`、`internal/hub/messages.go`
  - `internal/store/store.go`
  - `internal/geoip/geoip.go`
  - `internal/util/util.go`
- `frontend/`
  - `package.json`、`vite.config.ts`、`tsconfig.json`、`tsconfig.node.json`
  - `tailwind.config.js`、`postcss.config.js`、`index.html`
  - `src/main.tsx`、`src/App.tsx`、`src/index.css`、`src/vite-env.d.ts`
  - `src/components/MapView.tsx`、`BubbleMarker.tsx`、`ComposerDock.tsx`、`NicknameDialog.tsx`、`StatusBar.tsx`
  - `src/hooks/useWebSocket.ts`、`useGeolocation.ts`、`useNickname.ts`
  - `src/lib/types.ts`、`src/lib/api.ts`

## How to run

```bash
make install     # 安装 backend (go mod tidy) 与 frontend (npm install) 依赖
make dev         # 同时启动后端 (:8080) 与前端 (:5173)
```

打开两个浏览器(或一普通窗口 + 一无痕)访问 <http://localhost:5173>:

1. 首次进入填昵称(1–16 字符)。
2. 浏览器若不允许定位,会回退到 IP 估算坐标;也可直接点击地图选点。
3. 在 A 浏览器底部输入框打一句话点"发送",B 浏览器地图上 < 300ms 冒出气泡。
4. 等 5 分钟,两侧气泡同时消失;也可以提前刷新查看本地兜底淘汰。

单独启动:

```bash
make backend     # 仅后端
make frontend    # 仅前端
```

## Acceptance

- [x] 后端启动后 `curl localhost:8080/healthz` 返回 `{"status":"ok"}`
- [x] `curl localhost:8080/api/bootstrap` 返回 `ipLocation` 与 `activeBubbles`
- [x] 前端首次访问展示昵称对话框,提交后落 `localStorage.echoearth.nickname`
- [x] WebSocket 连接 `/ws` 成功并收到 `hello` 帧(含 `clientId`、`ipLocation`、`activeBubbles`)
- [x] 发送消息后两侧浏览器气泡同时出现
- [x] 关闭 WS 后客户端按 1s → 2s → 4s ...(上限 30s)重连
- [x] 5 分钟后气泡自动从两侧消失
- [x] 10 秒内重复发送被服务端 `error` 帧拒绝(`code:"rate_limited"`)

## Decisions

- **WebSocket 选型**:不使用 Socket.io;后端 `gorilla/websocket`,前端原生 `WebSocket` + 自实现重连。理由:Go 生态 Socket.io 维护薄弱,MVP 用原生协议成本最低。
- **IP 定位**:接入 `http://ip-api.com/json/{ip}?fields=status,country,city,lat,lon`,免费无 token;失败兜底 `{lat:30, lng:0, city:"", country:""}`。生产前需替换。
- **坐标精度**:服务端入库前截断到 0.01,隐私优先。
- **存储**:`map[string]Bubble` + `sync.RWMutex`,后台 goroutine 每 10s 扫描过期;不持久化,重启清空。
- **代码提交**:直接提交到 `main`(MVP 阶段简化流程,后续可改 PR 模式)。

## Next(Iter-02 候选)

详见 [OPEN_ITEMS.md](../OPEN_ITEMS.md) 的"待办"段落。重点:

- Composer 加 emoji picker、字数计数器、点位预览
- 错误 toast(频控、超长、断线)
- UI 美化(暗黑/赛博朋克皮肤)
- 移动端响应式
