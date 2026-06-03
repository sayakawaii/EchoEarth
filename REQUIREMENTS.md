# EchoEarth 需求文档

> 本文件随迭代更新。每次迭代完成后,请同步刷新本文件、`OPEN_ITEMS.md`,并在 `deliveries/` 新增对应交付记录。
>
> 最近更新:2026-06-03(Iter-01)

## 0. 一句话定位

世界地图上以气泡形式发布与展示实时消息的 Web 应用,主打"赛博庙会"般的实时、即兴、轻量体验。

## 1. 关键决策(已确认)

| 项 | 决策 |
| --- | --- |
| 产品方向 | MVP 走方向 C(实时大厅);后续迭代融入 A(足迹)与 B(匿名树洞);再后续加邮箱注册 |
| 身份模型 | MVP 仅昵称(localStorage),后端用 UUID/session 区分;后续接入邮箱注册 |
| 位置策略 | 浏览器 Geolocation 优先 → 失败时后端按 IP 粗估 → 用户始终可点击地图手动选点/修改 |
| 前端框架 | React 18 + TypeScript + Vite + Tailwind CSS + react-leaflet |
| 后端 / 实时 | Go + chi + gorilla/websocket(原生 WS,非 Socket.io) |
| 数据存储 | MVP 进程内存;PostGIS / Redis GEO 进入"高并发优化"路线图 |
| 气泡 TTL | 5 分钟,过期自动从存储与地图移除 |

## 2. 仓库结构

```
echoearth/
├── README.md                         项目简介、本地运行
├── REQUIREMENTS.md                   本文件
├── OPEN_ITEMS.md                     待办 / 风险 / 未决
├── Makefile                          install / dev / backend / frontend
├── deliveries/
│   └── 2026-06-03_iter-01_mvp-skeleton.md
├── backend/
│   ├── go.mod
│   ├── cmd/server/main.go            入口
│   └── internal/
│       ├── api/                      HTTP + WS 路由
│       ├── hub/                      WS 连接管理与广播
│       ├── store/                    内存存储 + TTL 清理
│       └── geoip/                    IP → 经纬度(ip-api.com)
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       │   ├── MapView.tsx
│       │   ├── BubbleMarker.tsx
│       │   ├── ComposerDock.tsx
│       │   └── NicknameDialog.tsx
│       ├── hooks/
│       │   ├── useWebSocket.ts
│       │   └── useGeolocation.ts
│       └── lib/
│           ├── types.ts
│           └── api.ts
└── .gitignore
```

## 3. 功能需求(当前迭代覆盖 = Iter-01 MVP)

### 3.1 用户与身份

- 首次进入弹出昵称对话框,昵称 1–16 字符(去首尾空白)。
- 存 `localStorage` key:`echoearth.nickname`。
- 后端为每个 WS 连接分配 `clientId`(UUID v4)。
- 无密码、无注册;允许重名。

### 3.2 地图

- 底图:**OpenStreetMap** `https://tile.openstreetmap.org/{z}/{x}/{y}.png`,无需 token。
- 默认中心:用户位置;否则 `{lat: 30, lng: 0, zoom: 2}`。
- 缩放范围:1–18,允许平移。
- MVP 界面默认中文,i18n 留二期。

### 3.3 发消息(气泡)

- 底部固定输入条:文本输入 + 字数提示 + "发送" 按钮。
- 文本规则:1–140 字符,允许 emoji;后端做基础脏词过滤(内置 demo 词表)。
- 频控:同 `clientId` **10 秒内最多 1 条**。
- 流程:
  1. 前端确定坐标(geolocation → IP 兜底 → 地图点击覆盖)。
  2. 通过 WS 发送 `publish` 帧:`{type:"publish", payload:{text, lat, lng}}`。
  3. 后端校验通过 → 写入内存 → 广播 `bubble` 帧给所有在线客户端。

### 3.4 气泡显示

- 用 Leaflet `divIcon` 渲染自定义 HTML(Tailwind 样式:圆角卡片 + 小三角 + 阴影)。
- 进入动画:scale + fade。
- 5 分钟生命周期:
  - 后端定时器扫描,过期删并广播 `expire`。
  - 前端本地兜底:基于 `createdAt + 5min` 自删,防丢消息。
- 渲染上限:全局最多 200 个气泡(超出按 `createdAt` 旧→新淘汰)。

### 3.5 实时通道

- WebSocket 路径:`/ws`
- 上行帧:
  - `publish` `{text, lat, lng}`
  - `ping` `{}`
- 下行帧:
  - `hello` `{clientId, ipLocation:{lat,lng,city,country}, activeBubbles:[...]}`
  - `bubble` `{id, text, lat, lng, nickname, createdAt, expiresAt}`
  - `expire` `{id}`
  - `pong` `{}`
  - `error` `{code, message}`
- 心跳:客户端 25s 一次 `ping`;后端 60s 无消息断开。
- 重连:客户端指数退避(1s, 2s, 4s, ..., 上限 30s)。

### 3.6 HTTP 辅助接口

- `GET /healthz` → `{status:"ok"}`
- `GET /api/bootstrap` → `{ipLocation:{...}, activeBubbles:[...]}`,WS 连接前的兜底数据。

## 4. 非功能需求

- 浏览器兼容:Chrome / Edge / Safari 最近 2 个大版本;移动端可看可发。
- 性能目标(MVP):100 在线、200 活跃气泡,广播延迟 < 300ms(本地)。
- 部署:本地 `make dev` 一键启动;后端 `:8080`,前端 `:5173`,Vite 代理 `/ws` 与 `/api`;Docker compose 留二期。
- 隐私:不存 IP 原文;气泡入库时 `lat/lng` 精度截断到 0.01(约 1.1 km),避免暴露精确位置。
- 日志:结构化 JSON(`log/slog`)。
- 国际化:i18n 留二期。

## 5. 迭代路线图

| 迭代 | 主题 |
| --- | --- |
| Iter-01(本次) | MVP 骨架:目录结构、地图、昵称、发布广播、5min 过期、内存存储、IP 兜底、本地一键启动 |
| Iter-02 | 输入体验打磨(emoji 选择器、字数计数、点位预览)、错误提示、UI 美化、移动端 |
| Iter-03 | 融入 A/B 元素:气泡情绪色(B)、消息可附 1 张图(A)、可"喜欢" |
| Iter-04 | 切换存储到 PostGIS / Redis GEO;视区(bbox)查询;气泡 cluster |
| Iter-05 | 邮箱注册 + 账户体系;个人足迹页;消息举报与审核 |
| Iter-06 | WebSocket 横向扩展(Redis pub/sub);Docker / 生产部署 |

## 6. 迭代交付文件规范

每次迭代在 `deliveries/` 新建文件,命名 `YYYY-MM-DD_iter-NN_<short-slug>.md`,内容包含:

- Date
- Scope:本次实现的功能点(对照 REQUIREMENTS 章节编号)
- Changes:新增/修改的文件清单(简述)
- How to run:启动 / 验证步骤
- Demo:截图或 GIF 链接(可选)
- Acceptance:验收项勾选
- Decisions:本次新增或推翻的设计决策
- Next:下一轮要做的事

同时更新 `OPEN_ITEMS.md`(三段:`### 待办`、`### 风险/未决`、`### 已关闭(本迭代)`)。
