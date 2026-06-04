# Iteration 02 — Composer & UI Polish

- **Date**: 2026-06-04
- **Slug**: `composer-polish`
- **Status**: Delivered

## Scope(对照 REQUIREMENTS 章节编号)

- 3.3 发消息:Composer 升级 —— 多行 textarea(自适应,最高 5 行)+ Enter 发送 / Shift+Enter 换行 + IME 兼容、实时 code-point 字数计数(70% amber / 100% red)、40-emoji 内置 picker(光标插入、外部 / Esc 关闭)、点位预览(坐标 + 来源标签 + IP 城市)。
- 3.4 气泡显示:卡片由 `interactive=false` 改为可点击;>80 字截断显示;高亮态(描边 + 外发光)。
- 3.7(新增)气泡详情面板:右侧抽屉显示全文 + 发布/过期时间 + 剩余 TTL 进度条(1Hz 刷新);"在地图聚焦" + Esc 关闭;过期自动关闭。
- 3.8(新增)Toast 通知:info/success/warn/error 四级,自动关闭,可手动 ×,最多 4 个叠加;替代 inline hint;`error` 用 `role="alert"`。
- 3.9(新增)主题:`cyber` / `calm` 双皮肤,CSS 变量 + `<html data-skin>` 驱动,localStorage 持久化。
- 4(非功能):
  - 移动端:`100dvh`、`env(safe-area-inset-bottom)`、< 640px 卡片缩小、< 420px StatusBar 短文案。
  - a11y:`aria-label` / `aria-live` / `role="dialog"`。
  - 视觉:径向渐变背景、卡片入场 / hover / 选中态动画、`toastIn` / `popIn` / `slideInRight` 关键帧。

## Changes

新增:

- `frontend/src/components/Toast.tsx`
- `frontend/src/components/EmojiPicker.tsx`
- `frontend/src/components/BubbleDetail.tsx`
- `frontend/src/components/SkinToggle.tsx`
- `frontend/src/hooks/useTheme.ts`

修改:

- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/main.tsx`
- `frontend/src/components/ComposerDock.tsx`
- `frontend/src/components/StatusBar.tsx`
- `frontend/src/components/BubbleMarker.tsx`
- `frontend/src/components/MapView.tsx`
- `frontend/src/lib/types.ts`(新增 `ToastKind` / `ToastItem`)
- `frontend/tailwind.config.js`(CSS 变量驱动 skin)
- `REQUIREMENTS.md`、`OPEN_ITEMS.md`

## How to run

```bash
make install   # 已装则可跳过
make dev
```

打开 <http://localhost:5173>:

1. 填昵称 → 进入地图。
2. 右上角点皮肤按钮在 cyber / calm 之间切换,刷新仍然记得。
3. 在 Composer:
   - 点 😀 打开 emoji picker,点表情插入,点击 picker 外面或再按 😀 关闭。
   - 输入超 100 字开始警示色,>140 字按钮禁用。
   - 顶部一行实时显示:昵称 · 当前坐标 · 来源(浏览器/IP/手动)· IP 城市(若有)。
   - Enter 发送,Shift+Enter 换行。
4. 点击地图上任意气泡 → 右侧滑出详情面板(全文 + 完整时间 + 剩余 TTL 进度)。
5. 触发频控 / 超长 → 屏幕底部弹 Toast,3 秒自动消失或手动 ×。
6. 浏览器调试模式切到 iPhone 视口确认 Composer/StatusBar 自适应。

## Acceptance

- [x] **Toast** (`rate_limited`):E2E 脚本触发 → 服务端 `error{code:"rate_limited"}` 帧到达;前端 `translateError` 映射为 warn Toast,默认 4.5s 自动关闭。
- [x] **Toast 叠加**:容器最多 4 个,超出自动丢最旧;每个 Toast 有独立 timer。
- [x] **Composer · emoji 插入**:browser_use 实测点击 🌍 → 输入框 value 变为 `🌍`,Send 按钮从 disabled 变为 enabled。
- [x] **Composer · 字数分级**:`length > maxChars * 0.7` amber,`length > maxChars` 红 + 禁用。code-point 计数(`[...str].length`)正确处理 emoji。
- [x] **Composer · 键盘**:`onKeyDown` 在 `Enter && !shiftKey && !isComposing` 阻止默认并触发 submit。
- [x] **主题持久化**:`useTheme` 读 `localStorage.echoearth.skin` 初始化;`setSkin` 写回。`<html data-skin>` 切换后 CSS 变量重新解析。browser_use 实测切到 calm 后 accent 由青转蓝。
- [x] **气泡详情**:`BubbleDetail` 在 `selectedId` 时渲染,1Hz 更新剩余 TTL;`useEffect` 监听 `bubbles` 变化,被远端 `expire` 或本地 TTL 扫除则关闭。
- [x] **移动端**:`100dvh`、`env(safe-area-inset-bottom)`;`@media (max-width: 640px)` 缩小气泡卡片;`xs:` Tailwind 断点(420px)在 StatusBar 切换长/短文案。
- [x] **构建**:`tsc --noEmit` 通过;`vite build` 输出 JS 324 KB(gzip 104 KB)/ CSS 33 KB(gzip 11 KB);`go vet ./... && go build ./...` 通过。
- [x] **E2E**:Iter-02 smoke 脚本通过(详见 Test log)。

### Test log

```
hello keys = activeBubbles,bubbleTtlSecs,clientId,ipLocation,maxTextChars,rateLimitSecs,serverTime
SUMMARY {
  "helloHasExpectedKeys": true,
  "helloMaxChars": 140,
  "helloBubbleTtlSecs": 300,
  "bGotBubble": true,
  "bubbleHasEmoji": true,
  "aGotRateLimit": true,
  "bGotPong": true
}
OK
```

### Known limitations

- 沙箱 WSL 无法解析 `tile.openstreetmap.org`,本地截图中地图区域为黑色;真实用户浏览器会正常加载 OSM tile。E2E 通过 `/api/bootstrap` 与 WS 帧均不依赖 tile。

## Decisions

- **Emoji picker 不引入 emoji-mart**:体积 200KB+,MVP 用 24 个精选表情的内置网格(后续可替换)。
- **主题用 CSS 变量 + `data-skin` 属性**:Tailwind 通过 `var(--xxx)` 读取,避免 dark-mode 类切换的样式震荡。
- **气泡详情用自渲染面板,不用 Leaflet Popup**:Leaflet Popup 的 close 控件样式与暗黑主题冲突,自渲染面板更可控。
- **bubble Marker 改为 `interactive=true`**:点击命中 → App 状态记录 `selectedBubbleId`。
- **Toast 自实现**:无第三方依赖,降低体积与维护负担。

## Next(Iter-03 候选)

详见 [OPEN_ITEMS.md](../OPEN_ITEMS.md) 的"待办"段落。重点候选:

- 气泡情绪色(B):发送时选情绪 happy/sad/angry/calm
- 消息附 1 张图(A):压缩到 < 200KB 走 WS
- 气泡 "喜欢" 互动 + 同坐标聚合气泡 cluster
