# Open Items

> 待办 / 风险 / 未决议项。每次迭代结束后刷新。
>
> 最近更新:2026-06-04(Iter-02 完成)

## 待办(下一迭代候选)

### Iter-03(融入 A/B 元素)

- [ ] 气泡情绪色(B):发布时选 happy/sad/angry/calm 四种;气泡边框/圆点颜色对应。
- [ ] 消息附 1 张图(A):前端浏览器侧压缩到 < 200KB,以 base64 走 WS;后端按总帧体 ≤ 256KB 校验。
- [ ] 气泡"喜欢"互动:`like` / `unlike` 上行帧,后端汇总后下发 `like_count`;详情面板显示。
- [ ] 同坐标气泡 cluster:当 ≥ 3 个气泡落在同一截断坐标时,卡片显示数字徽标,点击展开。

### 通用持续打磨

- [ ] 多浏览器实测移动端 Safari / Android Chrome 真机的 touch / safe area / 输入法行为。
- [ ] 通知一致化:断网超过 30s 后弹更显眼的 banner;`error` 帧多次同码合并。
- [ ] 气泡详情面板:右滑手势关闭;粘贴/分享坐标链接。
- [ ] StatusBar 增加在线人数(后端 `hello` 已具备 `online` 数据)。
- [ ] 国际化:抽出文案,准备英文版本。
- [ ] 单元/集成测试:`store`、`hub` 的 Go 测试;`useWebSocket` 的 React 测试。

### Iter-04(高并发与持久化)

- [ ] 切换存储到 PostGIS 或 Redis GEO,按 bbox 查询。
- [ ] WebSocket 视区订阅:客户端上报 bbox + zoom,服务端只下发可视区域内的气泡。
- [ ] 启动 / 关闭时持久化活跃气泡到磁盘,避免重启清空(若选 PostGIS 自动满足)。

### Iter-05(账户)

- [ ] 邮箱注册 + 邮件验证 + JWT 鉴权;WS 升级时校验 token。
- [ ] 个人足迹页(把方向 A 元素正式产品化):用户主页 + 时间轴。
- [ ] 举报与简易审核后台。

### Iter-06(部署与扩展)

- [ ] 多实例 + Redis pub/sub 横向扩展 WebSocket。
- [ ] Docker compose;CI(GitHub Actions);生产部署一键脚本。
- [ ] OpenStreetMap tile 切换为 Mapbox / CartoDB / 自建,符合公共 tile 用量政策。

## 风险 / 未决

- **ip-api.com 频控**:免费版限制约 45 req/min,生产环境需切到 `ip2location-lite` 离线库或付费 API。MVP 失败时降级到 `{lat:30, lng:0}`。
- **OSM tile 政策**:OSM 公共 tile 不允许大流量商用,上线前需切到 Mapbox / CartoDB / 自建。
- **隐私精度**:目前 lat/lng 截断到 0.01(≈ 1.1 km)。若 Iter-05 引入足迹功能,需要重新评估精度策略。
- **脏词过滤**:MVP 仅内置 2 个示意词,严重不足;Iter-03+ 需引入更完整词库或外部审核。
- **未做认证的 WS**:任何人可连入并发消息,目前仅 10s/条 频控。Iter-05 引入账户后需加 token 鉴权。
- **跨域**:本地通过 Vite 代理避开;部署时需后端开严格 CORS 或同源部署。
- **Toast 与 a11y screen reader 行为未在真机 VO/TalkBack 上验证**(Iter-02 仅做了 `aria-live` 标注)。

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
