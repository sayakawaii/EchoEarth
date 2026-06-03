# EchoEarth

> 在世界地图上以气泡形式发布实时消息的 Web 应用。
>
> MVP 形态:**实时大厅**——所有人打开网页,无需注册,在自己所在地发一句话,消息以气泡冒出,5 分钟后自动消失。

## 技术栈

- **后端**: Go 1.22 + `chi` 路由 + `gorilla/websocket` + 内存存储
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS + `react-leaflet`
- **地图**: OpenStreetMap 免费 tile
- **实时通道**: 原生 WebSocket (JSON 帧协议)
- **IP 定位兜底**: `ip-api.com` (免费,无 token)

## 仓库结构

```
echoearth/
├── README.md                     本文件
├── REQUIREMENTS.md               需求总文档(每次迭代更新)
├── OPEN_ITEMS.md                 未决议项 / 待办 / 风险(每次迭代更新)
├── deliveries/                   每次迭代交付记录(带时间戳)
├── backend/                      Go 服务
└── frontend/                     React + Vite 前端
```

## 本地一键启动

依赖:
- Go ≥ 1.22
- Node ≥ 20

### 1. 安装依赖

```bash
make install
```

### 2. 同时启动前后端

```bash
make dev
```

- 后端: <http://localhost:8080>
- 前端: <http://localhost:5173> (Vite 已配置 `/ws` 与 `/api` 代理到 8080)

### 3. 验证

打开两个浏览器(或一普通窗口 + 一无痕),都访问 <http://localhost:5173>:

1. 首次访问填昵称。
2. 在 A 浏览器发送消息,B 浏览器无需刷新,地图上对应坐标冒出气泡。
3. 5 分钟后气泡自动消失。

## 单独启动

```bash
make backend   # 仅启动 Go 服务
make frontend  # 仅启动 Vite 开发服
```

## 路线图

详见 [REQUIREMENTS.md](./REQUIREMENTS.md) 的"迭代路线图"章节。

## 每次迭代如何交付

1. 在 `deliveries/` 新建 `YYYY-MM-DD_iter-NN_<slug>.md`,按模板填写。
2. 同步更新 `REQUIREMENTS.md` 与 `OPEN_ITEMS.md`。
3. commit & push。

## License

私有项目,暂无 License。
