# Open Items

> 待办 / 风险 / 未决议项。每次迭代结束后刷新。
>
> 最近更新:2026-06-03(Iter-01 完成)

## 待办(下一迭代候选)

- [ ] Iter-02:Composer 加 emoji picker、字数计数器、点位预览(发送前显示"将发布到 xx 坐标")
- [ ] Iter-02:错误 toast(频控触发、文本超长、WS 断开)
- [ ] Iter-02:UI 美化(暗黑/赛博朋克风皮肤切换),移动端响应式适配
- [ ] Iter-02:气泡 hover 显示完整时间、点击查看详情
- [ ] Iter-03:气泡情绪色(开心/难过/愤怒/平静)
- [ ] Iter-03:消息可附 1 张图(上传到对象存储或 base64)
- [ ] Iter-03:气泡"喜欢"互动
- [ ] Iter-04:存储切换到 PostGIS 或 Redis GEO,按 bbox 查询
- [ ] Iter-04:气泡 cluster(同坐标聚合)
- [ ] Iter-05:邮箱注册 + 账户体系
- [ ] Iter-05:个人足迹页(把方向 A 元素正式产品化)
- [ ] Iter-05:举报与审核后台
- [ ] Iter-06:多实例 + Redis pub/sub 横向扩展;Docker compose 与生产部署

## 风险 / 未决

- **ip-api.com 频控**:免费版限制约 45 req/min,生产环境需切换到 `ip2location-lite` 离线库或付费 API。当前 MVP 在请求失败时降级到固定坐标 `{lat:30, lng:0}`。
- **OpenStreetMap tile 用量政策**:OSM 公共 tile 不允许大流量商用,上线前需切到 Mapbox / CartoDB / 自建 tile 服务。
- **隐私精度**:目前 lat/lng 截断到 0.01(≈1.1 km)。若未来加足迹功能,需重新评估精度策略。
- **脏词过滤**:MVP 仅内置 10 个示意词,严重不足;Iter-02 起需要引入更完整词库或外部审核。
- **未做认证的 WS**:任何人可以连入并发消息,目前仅有 10s/条 频控。Iter-05 引入账户后需加 token 鉴权。
- **跨域**:本地通过 Vite 代理避开;部署时需后端开 CORS 或同源部署。

## 已关闭(Iter-01)

- [x] 仓库初始化、目录结构、文档骨架(REQUIREMENTS / OPEN_ITEMS / deliveries 模板)
- [x] Go 后端:chi 路由、gorilla/websocket、内存 store + 5min TTL、/healthz、/api/bootstrap、ip-api.com 接入
- [x] React + Vite + TS + Tailwind 初始化,集成 react-leaflet
- [x] 昵称对话框、Composer 输入条、气泡 divIcon 渲染
- [x] WS 上下行打通:publish / hello / bubble / expire / ping / pong / error,自动重连
- [x] Geolocation 优先 → IP 兜底 → 地图点击覆盖
- [x] Makefile 一键启动(`make install`、`make dev`)
- [x] 双浏览器验证发布与广播流程
