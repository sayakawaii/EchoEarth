# EchoEarth 需求文档

> 本文件随迭代更新。每次迭代完成后,请同步刷新本文件、`OPEN_ITEMS.md`,并在 `deliveries/` 新增对应交付记录。
>
> 最近更新:2026-06-04(Iter-02)

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
│   ├── 2026-06-03_iter-01_mvp-skeleton.md
│   └── 2026-06-04_iter-02_composer-polish.md
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
│       │   ├── BubbleDetail.tsx          [Iter-02]
│       │   ├── ComposerDock.tsx
│       │   ├── EmojiPicker.tsx           [Iter-02]
│       │   ├── NicknameDialog.tsx
│       │   ├── SkinToggle.tsx            [Iter-02]
│       │   ├── StatusBar.tsx
│       │   └── Toast.tsx                 [Iter-02]
│       ├── hooks/
│       │   ├── useGeolocation.ts
│       │   ├── useNickname.ts
│       │   ├── useTheme.ts               [Iter-02]
│       │   └── useWebSocket.ts
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

- 底部固定输入条:多行 textarea(自动增高,最高 5 行)+ 实时字数提示 + emoji 按钮 + "发送" 按钮。**[Iter-02]**
- 文本规则:1–140 字符(按 code point 计数,正确兼容 emoji),允许 emoji;后端做基础脏词过滤(内置 demo 词表)。
- 字数提示分级:> 70% 警示色(amber),> 100% 红色且禁用发送。**[Iter-02]**
- 输入交互:**Enter 发送、Shift+Enter 换行**;IME 组词期间(`isComposing`)不触发发送。**[Iter-02]**
- Emoji picker:精选 40 个常用 emoji 网格,点击插入到光标位置,点击外部 / `Esc` 关闭;不引入第三方库。**[Iter-02]**
- 顶部 meta 一行展示:昵称 · 当前坐标 · 来源(浏览器/IP/手动)· IP 城市(若有)。**[Iter-02]**
- 频控:同 `clientId` **10 秒内最多 1 条**。
- 流程:
  1. 前端确定坐标(geolocation → IP 兜底 → 地图点击覆盖)。
  2. 通过 WS 发送 `publish` 帧:`{type:"publish", payload:{text, lat, lng}}`。
  3. 后端校验通过 → 写入内存 → 广播 `bubble` 帧给所有在线客户端。

### 3.4 气泡显示

- 用 Leaflet `divIcon` 渲染自定义 HTML(圆角卡片 + 小三角 + 阴影 + 脉冲发光圆点)。
- 长文本(>80 字)在卡片上截断显示 + 省略号,完整文本在详情面板中查看。**[Iter-02]**
- 卡片可点击(`interactive=true`),点击 → 弹出右侧详情面板。**[Iter-02]**
- 选中态:被选中的气泡卡片高亮(描边 + 外发光)。**[Iter-02]**
- 进入动画:scale + fade;hover 时轻微抬起。
- 5 分钟生命周期:
  - 后端定时器扫描,过期删并广播 `expire`。
  - 前端本地兜底:基于 `createdAt + 5min` 自删,防丢消息。
- 渲染上限:全局最多 200 个气泡(超出按 `createdAt` 旧→新淘汰)。

### 3.7 气泡详情面板 [Iter-02]

- 由右向左滑出的侧抽屉(`max-w-sm` / `sm:max-w-md`),展示:
  - 昵称、坐标(2 位小数)
  - 全文(`whitespace-pre-wrap`,允许多行)
  - 发布时间 / 过期时间(本地时区,精确到秒)
  - 剩余 TTL(`Xm YYs` + 进度条,1Hz 刷新)
- 操作:"在地图聚焦"(`flyTo` zoom=6)、"关闭"、`Esc` 关闭。
- 若选中气泡被远端 `expire` 或本地 TTL 扫除,自动关闭面板。

### 3.8 Toast 通知 [Iter-02]

- 四级:`info` / `success` / `warn` / `error`,对应不同色调与图标。
- 默认时长 3.5–5s,可手动 ×,可叠加(最多 4 个,溢出移除最旧)。
- 触发源:服务端 `error` 帧(rate_limited / too_long / blocked …)、本地校验失败、WS 断开与重连提示。
- a11y:`error` 用 `role="alert"`,其余用 `role="status"`。

### 3.9 主题(皮肤) [Iter-02]

- 两套主题:`cyber`(默认,深空黑 + 青/紫高亮 + 径向发光背景)与 `calm`(海军蓝 + 天蓝高亮 + 线性渐变)。
- 持久化:`localStorage.echoearth.skin`。
- 通过 `<html data-skin="...">` + CSS 变量驱动,组件直接读 `var(--echo-...)`。
- 右上角胶囊按钮一键切换。

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
- 移动端响应式 **[Iter-02]**:
  - 容器使用 `100dvh` 避免 iOS 浏览器 chrome 抖动。
  - Composer 与 Toast 容器尊重 `env(safe-area-inset-bottom)`。
  - 气泡卡片在 ≤ 640px 视口下缩小字号与 padding。
  - StatusBar 在 < 420px 视口下折叠为短文案。
- a11y **[Iter-02]**:所有交互按钮均有 `aria-label`;Toast `aria-live` 提示;详情面板 / 昵称对话框为 `role="dialog"`。
- 性能目标(MVP):100 在线、200 活跃气泡,广播延迟 < 300ms(本地)。
- 部署:本地 `make dev` 一键启动;后端 `:8080`,前端 `:5173`,Vite 代理 `/ws` 与 `/api`;Docker compose 留二期。
- 隐私:不存 IP 原文;气泡入库时 `lat/lng` 精度截断到 0.01(约 1.1 km),避免暴露精确位置。
- 日志:结构化 JSON(`log/slog`)。
- 国际化:i18n 留二期。

## 5. 迭代路线图

| 迭代 | 主题 | 状态 |
| --- | --- | --- |
| Iter-01 | MVP 骨架:目录结构、地图、昵称、发布广播、5min 过期、内存存储、IP 兜底、本地一键启动 | ✅ |
| Iter-02 | Composer 升级(emoji / 字数 / Enter 发送 / 点位预览)、Toast 系统、气泡详情面板、cyber/calm 双主题、移动端响应式 | ✅ |
| Iter-03 | 融入 A/B 元素:气泡情绪色(B)、消息可附 1 张图(A)、可"喜欢"、同坐标气泡 cluster | ☐ |
| Iter-04 | 切换存储到 PostGIS / Redis GEO;视区(bbox)查询;持久化 | ☐ |
| Iter-05 | 邮箱注册 + 账户体系;个人足迹页(方向 A 产品化);消息举报与审核 | ☐ |
| Iter-06 | WebSocket 横向扩展(Redis pub/sub);Docker / 生产部署 | ☐ |

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
