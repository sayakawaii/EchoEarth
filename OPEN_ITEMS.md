# Open Items

> 待办 / 风险 / 未决议项。每次迭代结束后刷新。
>
> 最近更新:2026-06-06(Ops-01 VPS deploy 完成)

## 待办(下一迭代候选)

### Iter-04(高并发与持久化)

- [ ] 切换存储到 PostGIS 或 Redis GEO,按 bbox 查询。
- [ ] WebSocket 视区订阅:客户端上报 bbox + zoom,服务端只下发可视区域内的气泡。
- [ ] 启动 / 关闭时持久化活跃气泡到磁盘,避免重启清空(若选 PostGIS 自动满足)。
- [ ] 真正的 Leaflet marker cluster:zoom 自适应聚合,不止"同截断坐标"维度。
- [ ] 图片移到对象存储(S3 兼容),WS / `bubble` 只传引用 URL,降低帧体。
- [ ] like 计数持久化:Redis ZADD 或数据库,断线/重启不丢。

### Iter-05(账户)

- [ ] 邮箱注册 + 邮件验证 + JWT 鉴权;WS 升级时校验 token。
- [ ] 个人足迹页(把方向 A 元素正式产品化):用户主页 + 时间轴。
- [ ] 举报与简易审核后台。

### Iter-06(部署与扩展)

- [ ] 多实例 + Redis pub/sub 横向扩展 WebSocket。
- [ ] Docker compose;CI(GitHub Actions);生产部署一键脚本。
- [ ] OpenStreetMap tile 切换为 Mapbox / CartoDB / 自建,符合公共 tile 用量政策。
- [ ] 部署上 TLS:绑域名 + Caddy 单文件接管 :80/:443(目前 HTTP only)。
- [ ] WS Origin 收紧 + 简易 IP 限流(目前仅 10s/条 publish 频控)。
- [ ] `make deploy-bundle && deploy/push.sh` 一键推送 + 滚动重启(把当前 ad-hoc scp 流程脚本化)。

### 通用持续打磨(任意时点都可拿来做)

- [ ] 多浏览器真机移动端 Safari / Android Chrome 的 touch / safe area / 输入法行为。
- [ ] 通知一致化:断网超过 30s 后弹更显眼的 banner;`error` 帧多次同码合并。
- [ ] StatusBar 增加在线人数(后端 `hello.online` / bootstrap.online 已具备)。
- [ ] 气泡详情面板:右滑手势关闭;粘贴/分享坐标链接。
- [ ] Composer 加发布"撤回"(发布后 5s 内取消)。
- [ ] 心情扩展:`MOODS` 加 `surprise` / `love` / `tired`,需要后端 `IsValidMood` 同步。
- [ ] Emoji picker 扩展为完整集 + 搜索(可考虑 emoji-mart,接受 ~200KB 体积)。
- [ ] 国际化:抽出文案,准备英文版本。
- [ ] 单元/集成测试:Go `store` / `hub` 的 table-driven 测试;前端 `imageCompress` / `useWebSocket` 的 vitest。
- [ ] WS 心跳上层化:当连续 N 次 ping 没有 pong,主动断开重连。

## 风险 / 未决

- **ip-api.com 频控**:免费版限制约 45 req/min,生产环境需切到 `ip2location-lite` 离线库或付费 API。MVP 失败时降级到 `{lat:30, lng:0}`。
- **OSM tile 政策**:OSM 公共 tile 不允许大流量商用,上线前需切到 Mapbox / CartoDB / 自建。
- **隐私精度**:目前 lat/lng 截断到 0.01(≈ 1.1 km),`math.Trunc` 在浮点边界可能向下取整(例如 39.91 → 39.90)。属于隐私偏保守,可接受。若 Iter-05 引入足迹功能,需要重新评估。
- **WS 帧体上限 256 KB**:Iter-03 已为附图扩容到 256 KB;超出由 gorilla `ReadLimit` 触发 close 1009,无业务级 error 帧。客户端会触发自动重连 + warn Toast(可选优化:在前端 send 前做硬校验)。
- **附图常驻内存**:200 个气泡 × ≤200 KB ≈ 40 MB。MVP 可承受;Iter-04 需移到对象存储 + URL 引用。
- **Like 不持久化、不去重 Cross-Session**:同一人换浏览器/清缓存后再点会再次 +1(因为 clientId 重新生成),计数偏高。Iter-04+ 接账户后改为按 user_id 去重。
- **脏词过滤**:MVP 仅内置 2 个示意词,严重不足;Iter-03+ 需引入更完整词库或外部审核。
- **未做认证的 WS**:任何人可连入并发消息,目前仅 10s/条 频控。Iter-05 引入账户后需加 token 鉴权。
- **跨域**:本地通过 Vite 代理避开;部署时需后端开严格 CORS 或同源部署。
- **图片来源伪造**:`data:image/...` 前缀仅做字符串校验,不校验真实二进制头。MVP 可接受;严格场景需服务端嗅探 magic bytes。
- **Toast 与 a11y screen reader 行为未在真机 VO/TalkBack 上验证**。

## 已关闭(Ops-01)

- [x] **生产部署**:Go 单二进制托管 SPA + API + WS,systemd 以 `echoearth` 系统用户跑、`AmbientCapabilities=CAP_NET_BIND_SERVICE` 绑 :80;`MemoryMax=256M` + 沙箱化 unit。
- [x] **构建/分发**:`make deploy-bundle` 在本地交叉编译(`CGO_ENABLED=0 GOOS=linux GOARCH=amd64 -trimpath -ldflags='-s -w'`),不动 VPS 内存;`scp + tar` 一发到位(后续重复部署改 rsync `--delete`)。
- [x] **回归保护**:`ECHOEARTH_STATIC_DIR` 留空时,后端不挂 `/*` 静态路由,`make dev` 行为完全不变。
- [x] **缓存策略**:`/assets/*` 走 `public, max-age=31536000, immutable`,其它 SPA fallback 走 `no-store`,保证 index.html 永远是最新。
- [x] **可达性 / 公网验证**:`/healthz` / `/api/bootstrap` / 真实浏览器载入 / WS 双客户端 publish→广播 / journald 日志均验证通过。

## 已关闭(Iter-03)

- [x] **Mood**:`Bubble.mood` (calm/happy/sad/angry) 透传后端;MoodPicker UI + 持久化 `localStorage.echoearth.mood`;气泡圆点/卡片描边/详情面板进度条按情绪上色。
- [x] **图片附件**:`Bubble.image` data URL 透传;前端 canvas 自动压缩到 ≤ 150 KB(质量迭代 + 维度收缩),Composer 缩略图 + × 取消;气泡卡片缩略图、详情面板大图 + 点击全屏查看。
- [x] **Like 互动**:`like` 上行帧(toggle);后端 `Store.ToggleLike` 维护 `map[bubbleID]set[clientID]`;`like_update {bubbleId, count}` 广播;详情面板 ♥ 按钮 + 计数 + 本地持久化 likedIds。
- [x] **同坐标 Cluster**:前端按 `${lat.toFixed(2)}_${lng.toFixed(2)}` 分组,≥ 2 个折叠为一个 marker + 数字徽标;`ClusterList` 侧抽屉显示列表 → 选中进 BubbleDetail;成员过期自动同步。
- [x] **WS 帧体上限**:`maxMessageSize` 由 4 KiB 提升至 **256 KiB**;hello 增 `maxImageBytes` (200 KiB)。
- [x] **错误码**:新增 `bad_image` / `image_too_large` / `not_found`,前端映射到 warn Toast。
- [x] **E2E 验证**:Iter-03 smoke 通过(详见 deliveries/2026-06-04_iter-03_*.md)。

## 已关闭(Iter-02)

- [x] Toast 系统:`info/success/warn/error` 四级,自动关闭,可叠加,可手动关闭;替代 inline hint。
- [x] Composer 升级:textarea 自适应高度、实时字数计数(警示色)、emoji picker(40 个常用 + 外部 / Esc 关闭)、Enter 发送 / Shift+Enter 换行 / IME 兼容、点位预览(坐标 + 来源 + 城市)。
- [x] 主题切换:`cyber` / `calm` 两套 CSS 变量驱动皮肤,localStorage 持久化,右上角胶囊按钮。
- [x] 气泡点击详情:右侧抽屉显示全文 + 完整时间 + 剩余 TTL 进度,"在地图聚焦" / "关闭" / Esc;过期/扫除自动关闭。
- [x] 移动端响应式:`100dvh`、`env(safe-area-inset-bottom)`、气泡卡片小屏缩小、StatusBar 短文案降级、xs 断点。
- [x] 视觉打磨:径向渐变背景、卡片入场 / hover / 选中态动画、组件入场动画(`toastIn` / `popIn` / `slideInRight`)。
- [x] 类型与构建链路:`tsc --noEmit` / `vite build` / `go vet` / `go build` 全部通过。
- [x] E2E 验证:Iter-02 smoke 脚本通过(hello 字段、emoji 透传、rate_limit error、ping/pong)。

## 已关闭(Iter-01)

- [x] 仓库初始化、目录结构、文档骨架(REQUIREMENTS / OPEN_ITEMS / deliveries 模板)
- [x] Go 后端:chi 路由、gorilla/websocket、内存 store + 5min TTL、/healthz、/api/bootstrap、ip-api.com 接入
- [x] React + Vite + TS + Tailwind 初始化,集成 react-leaflet
- [x] 昵称对话框、Composer 输入条、气泡 divIcon 渲染
- [x] WS 上下行打通:publish / hello / bubble / expire / ping / pong / error,自动重连
- [x] Geolocation 优先 → IP 兜底 → 地图点击覆盖
- [x] Makefile 一键启动(`make install`、`make dev`)
- [x] 双浏览器验证发布与广播流程
