# Ops 01 — Single-binary VPS Deploy

- **Date**: 2026-06-06
- **Slug**: `vps-deploy`
- **Status**: Delivered (running on operator VPS — public IP, port 80)

## Scope

把现有 Iter-03 产物部署到一台 1 GB RAM / Ubuntu 24.04 / x86_64 / 单核 VPS,
外部通过公网 IP 直连(暂不上域名 / 不上 TLS)。约束:

- **VPS 不能 build**:1 GB RAM 跑 `vite build` + `go build` 会很紧张,所有编译全部在本地完成。
- **不引入 nginx**:多一层反代对 1 进程 1 应用是负担(额外 RSS + 多一个失败面)。
- **后端进程自己托管前端**:Go server 同时跑 `/healthz`、`/api/*`、`/ws`、SPA 静态文件 + SPA fallback。
- **绑 :80 但不 root**:走 systemd `AmbientCapabilities=CAP_NET_BIND_SERVICE`,以独立 `echoearth` 系统用户跑。
- **dev 模式零回归**:`ECHOEARTH_STATIC_DIR` 为空时,后端行为完全不变(继续由 Vite owner 前端)。

## Changes

新增:

- `deploy/echoearth.service` — systemd unit(ambient cap、journald、`MemoryMax=256M`、`SystemCallFilter=@system-service`、`ProtectSystem=strict` 等沙箱)
- `deploy/install.sh` — 幂等安装脚本:建用户、布局 `/opt/echoearth`、装 unit、(`ufw active` 时)开 80、`daemon-reload` + `restart`
- `deploy/README.md` — 部署 / 操作 / 卸载手册

修改:

- `backend/internal/api/routes.go` — 新增 `Deps.StaticDir` 与 `spaHandler`(SPA fallback + `/assets/*` 走 `immutable` 缓存,其它 `no-store`,路径硬化 reject `..`)
- `backend/cmd/server/main.go` — 读 `ECHOEARTH_STATIC_DIR` env,日志暴露 `staticDir`
- `Makefile` — `make deploy-bundle`:`CGO_ENABLED=0 GOOS=linux GOARCH=amd64 -trimpath -ldflags='-s -w'` + `vite build` → `dist/deploy-bundle/{bin,web,echoearth.service,install.sh,README.md}`
- `.gitignore` — 忽略 `dist/`

## Build + Push 流程

```bash
make deploy-bundle                             # 本地产 dist/deploy-bundle (~6.8 MB)
tar -czf /tmp/echoearth-bundle.tar.gz -C dist/deploy-bundle .   # 压到 ~2.9 MB
scp /tmp/echoearth-bundle.tar.gz user@host:/tmp/
ssh user@host '\
  rm -rf /tmp/echoearth-deploy && mkdir /tmp/echoearth-deploy && \
  tar -xzf /tmp/echoearth-bundle.tar.gz -C /tmp/echoearth-deploy && \
  bash /tmp/echoearth-deploy/install.sh'
```

注:首次部署用 `scp + tar`(简单稳)。后续重复部署推荐改用 `rsync -az --delete`,
因为 vite 每次会生成新的 hash 文件名,`--delete` 能清掉 `web/assets/` 里的旧 chunk,
避免越堆越多。`deploy/README.md` 给的是 rsync 版本。

## Acceptance

- ✅ `systemctl status echoearth` — `active (running)`,RSS ~ 2.8 MB
- ✅ `curl http://<ip>/healthz` → `{"status":"ok"}`
- ✅ `curl http://<ip>/api/bootstrap` → 真实访客 IP 的 ip-api 地理位置
- ✅ `/` 与 `/任意/SPA/路径` 都返回 `index.html`(`Cache-Control: no-store`)
- ✅ `/assets/index-*.js` 返回 `Cache-Control: public, max-age=31536000, immutable`
- ✅ 公网 WS:本地 Node 双客户端 `ws://<ip>/ws` 连接 → 互收 `hello` → publish → 对端收 `bubble`
- ✅ 真实浏览器:载入主页 → 状态栏显示 `已连接 · 活跃气泡 N` → 发气泡 → 服务端 journal 出现 `client connected` + 消息计数
- ✅ ufw v4/v6 都放行 80

## 资源 / 安全画像

| 维度 | 实测 |
|---|---|
| 二进制大小 | 6.6 MB (stripped, static) |
| 前端总大小 | 384 KB(JS 336 KB / CSS 38 KB / HTML 0.5 KB) |
| Bundle 压缩后 | 2.9 MB |
| 进程 RSS | 2.8 MB(空闲)~ 见到峰值 3.2 MB |
| MemoryMax | 256 MB(unit 强制) |
| Ambient caps | 仅 CAP_NET_BIND_SERVICE |
| 用户 | `echoearth`(系统用户、nologin、无家目录) |
| 沙箱 | `NoNewPrivileges` + `ProtectSystem=strict` + `Private{Tmp,Devices}` + `Protect{Kernel*,ControlGroups}` + `SystemCallFilter=@system-service` |

## 已知未做(显式 out-of-scope)

- 不上 TLS / 不要求域名(用户明确说先跑 HTTP+IP)
- 不上反代(单进程够用,加 nginx 没收益)
- 不上 Docker(冷启动 + 镜像层都会吃掉 1 GB 的预算)
- 不上 CI/CD(目前一条 `make deploy-bundle` + scp + bash install.sh)

## Decisions

- **Go 自己 serve 静态**而不是单独跑 nginx:免一个进程 + 免一组 502 路径 + 1 GB VPS 上少 30–50 MB RSS。代价:Go 的 `http.FileServer` 比 nginx 慢一截,但本应用静态只有 ~340 KB,且都带 immutable cache,基本只有冷启动那一回。
- **systemd ambient cap** 而不是 `setcap` 二进制:`setcap` 每次替换 binary 都要重新跑;ambient cap 写在 unit 里、一次到位,且权限更窄(只活在该 service 的子进程里)。
- **WS Origin 检查仍然全放行**:目前 same-origin(我们既出前端也接 WS),收紧 CheckOrigin 会带来 `localhost/dev/隧道场景`一堆 corner case,留到上域名 + 上反代时一并处理。
- **未做 systemd timer 自动升级**:迭代频率不高,手动 `make deploy-bundle && scp && bash install.sh` 节奏更可控。

## Follow-up(写进 OPEN_ITEMS)

- TLS / 域名 / HTTP→HTTPS 重定向 — 等域名落地后用 Caddy 单文件接管 :80/:443
- 持久化存储(redis / sqlite),目前重启清空,在 1 GB VPS 上仍然 OK
- IP-based 限流 + WS Origin 收紧
- 自动滚动升级(rsync diff + `systemctl reload` 友好的优雅停机)
