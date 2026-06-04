# Iteration 03 — Mood / Image / Like / Cluster

- **Date**: 2026-06-04
- **Slug**: `mood-image-like-cluster`
- **Status**: Delivered

## Scope(对照 REQUIREMENTS 章节编号)

融入方向 A(足迹)与 B(树洞)的轻量化元素,让气泡更"有人味":

- **3.3 Composer**:新增情绪选择(4 选 1)、单图附件(浏览器侧 canvas 压缩到 ≤ 150KB)。
- **3.4 / 3.7 Bubble**:气泡颜色随情绪上色;若含图片则卡片显示小缩略图;详情面板显示原图与图片放大。
- **3.10(新增)Like / 喜欢互动**:详情面板 ♡ 按钮 toggle;`like` 上行帧;`like_update` 下行帧广播总数。
- **3.11(新增)同坐标 Cluster**:多个气泡落在同一截断坐标(0.01°)时,折叠为带数字徽标的一个 marker,点击弹"该点位的所有气泡"列表面板。
- **协议**:WS `Bubble` 增 `mood` / `image` / `likes` 字段;新增 `like` 上行、`like_update` 下行;`maxMessageSize` 由 4 KiB 提到 256 KiB 以容纳压缩后图片。
- **存储**:`Bubble` 增同名字段;`Store` 新增 `Like(bubbleID, clientID) (count, changed)` 切换逻辑(同 client 重复点 = 取消)。

## Changes

新增:

- `frontend/src/lib/imageCompress.ts`
- `frontend/src/components/MoodPicker.tsx`
- `frontend/src/components/ImagePicker.tsx`
- `frontend/src/components/ClusterList.tsx`

修改:

- `backend/internal/store/store.go`、`internal/hub/messages.go`、`internal/hub/hub.go`、`internal/hub/client.go`
- `frontend/src/lib/types.ts`、`src/App.tsx`
- `frontend/src/components/ComposerDock.tsx`、`BubbleMarker.tsx`、`BubbleDetail.tsx`、`MapView.tsx`
- `frontend/src/index.css`(mood 调色 + cluster 徽标样式)
- `REQUIREMENTS.md`、`OPEN_ITEMS.md`

## How to run

```bash
make install   # 已装则可跳过
make dev
```

打开 <http://localhost:5173>:

1. 输入昵称进入。
2. 在 Composer 左侧选择情绪(灰色 = 默认 calm / 黄 = happy / 蓝 = sad / 红 = angry)。
3. 点 🖼 选图(任意 JPG/PNG),前端会自动压缩到 ≤ 150KB,显示缩略图;× 可取消。
4. 输入文字 → 发送,气泡颜色随情绪;含图气泡卡片右下角显示小缩略图。
5. 点击气泡 → 详情面板:看到全文 / 图片(可点放大占满抽屉)/ ♡ 按钮 + 计数。
6. 再点 ♡ = 取消喜欢。多个客户端同步更新计数。
7. 同坐标(差异 < 0.01°)≥ 2 个气泡 → 折叠为一个 marker,右上角徽标 "+N";点击弹列表面板,选某条 → 详情。

## Acceptance

- [x] **Composer Mood**:`MoodPicker` 4 radio,默认 `calm`,选中态环描边;`localStorage.echoearth.mood` 持久化(`useState(readPersistedMood)` + `setMood` 同步写入)。
- [x] **Composer Image**:`compressImage()` 自动迭代 JPEG quality 0.82 → 0.40 + 维度二次收缩,目标 ≤ 150KB;Composer 显示缩略图 + `WxH · KB` + × 取消;> 150KB 触发 warn Toast。
- [x] **气泡含图**:`Bubble.image` data URL 透传,卡片右下角缩略图;BubbleDetail 大图 + 点击全屏(`Esc` 关闭全屏)。
- [x] **Like toggle**:E2E 脚本观察到 A→B→A 三次点击后 `like_update.count` 序列为 `[1, 2, 1]`;广播给所有在线客户端。
- [x] **Like 本地持久化**:`localStorage.echoearth.likedBubbles`(string set);气泡过期时自动从集合移除。
- [x] **Cluster**:同截断坐标(`30.0049`/`120.0049` → `30.00`/`120.00`)2 个气泡共享 `${lat.toFixed(2)}_${lng.toFixed(2)}` 分组键;前端只渲染 1 marker + 数字徽标;`ClusterList` 侧抽屉列出全部。
- [x] **WS 帧体上限**:`maxMessageSize` 改为 256 KiB(client.go),hello 增 `maxImageBytes` = 200 KiB。
- [x] **App-level 大小校验**:230 KB 图片(超出 200 KB hub 上限但 < 256 KB WS 上限)被服务端 `image_too_large` error 帧拒绝,连接不掉。
- [x] **Like 不存在 bubble**:`not_found` error 帧返回客户端,不影响其它客户端。
- [x] **构建链路**:`tsc --noEmit` 通过;`vite build` JS 336 KB(gzip 108 KB)/ CSS 37 KB(gzip 12 KB);`go vet ./... && go build ./...` 通过。

### Test log

```
SUMMARY {
  "helloHasNewFields": true,
  "helloMaxImageBytes": 204800,
  "bGotImageBubble": true,
  "bubbleMoodHappy": true,
  "bubbleIdDefined": true,
  "sameClusterCount": 2,
  "likeSequence": [
    1,
    2,
    1
  ],
  "oversizedRejected": true,
  "notFoundRejected": true
}
OK
```

### Browser MCP 实测

- 浏览器加载 <http://localhost:5173/> → snapshot 显示 Composer 包含 4 个 mood radio(平静=checked、开心、难过、愤怒)+ 「选择图片」按钮 + 既有 emoji/send 控件 + 「选择皮肤为 赛博」(当前 calm)+ 「活跃气泡 2」。
- 沙箱 WSL 无法解析 `tile.openstreetmap.org`,地图区域在截图里为黑色;不影响功能验证。

## Decisions

- **图片走 WS base64**:简化协议(不需要单独 HTTP 上传 + 引用),MVP 体积 < 200KB 完全可控;后续 Iter-04+ 切到对象存储 + 引用。
- **WS 帧上限 256 KiB**:服务端 `maxMessageSize` 与浏览器侧硬上限对齐;前端压缩目标 150KB,留头部 + JSON 编码膨胀的余量。
- **Like 不持久 / 不广播 who**:仅在内存维护 `map[bubbleID]map[clientID]bool`;断线/重启清空;`like_update` 仅含 `bubbleId` + `count`。隐私简单且帧体小。
- **Mood**:固定 4 种(`calm` / `happy` / `sad` / `angry`),颜色与品牌色家族一致;扩展为更多情绪在 Iter-04+。
- **Cluster 阈值 = 2**:严格"同截断坐标"(已在后端截断到 0.01),前端直接按 `${lat}_${lng}` 分组。

## Next(Iter-04 候选)

- Like 持久化与按客户端去重(Redis 或 Postgres)
- 图片存对象存储,WS 只传引用
- bbox 视区订阅 + 服务端只下发可视气泡
- 真正的 Leaflet marker cluster(zoom 自适应)
