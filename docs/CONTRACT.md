# PINECONE CLUB 引擎与视图契约

所有代码从零编写，允许依赖：仅 `../shared/kit.js` 与浏览器原生 API。禁止 import 任何第三方模块。

## 1. 文件与命名

每款游戏两个文件，`<id>` 取自 `shared/catalog.js`：

- `games/<id>.engine.js`：导出 `create`、`act`、`step`、`view`
- `games/<id>.view.js`：导出 `mount`

测试写在 `tests/<组名>.test.js`，用 `node --test` 运行。

## 2. 引擎接口

```js
export function create(seed, now)                 // 返回全新的 state
export function act(state, player, action, now)   // 合法返回 true 并修改 state，否则 false
export function step(state, now)                  // 每次服务器时钟推进调用；有变化返回 true
export function view(state, player)               // 返回该玩家可见的纯 JSON 视图
```

- `seed` 是正整数；必须用 `kit.rng(seed)` 派生的随机数，禁止 `Math.random`。
- `now` 是服务器提供的**对局时钟**（毫秒）。禁止在引擎内调用 `Date.now()`。
- `act` 必须校验：对局进行中、操作者合法、轮到该玩家（同时行动的游戏用 `state.simultaneous = true` 并把 `turn` 置 -1）、参数类型与范围、规则合法性。**任何非法输入返回 false，不得抛异常。**
- `step` 负责：回合超时、整局超时、物理/计分推进、结束判定。必须幂等且可安全高频调用。
- `view` 只输出该玩家可见信息；**对面隐藏信息不得出现**，且不得输出任何以下划线开头的键。

### 通用状态

用 `kit.open(now, durationMs, message)` 创建，包含：

```js
{ status: 'live' | 'done', winner: null | -1 | 0 | 1, scores: [0, 0],
  turn: 0 | 1 | -1, now, startedAt, endsAt, message }
```

- `winner`：`0` / `1` 表示玩家 1/2 胜，`-1` 和棋。
- 结束必须调用 `kit.finish(state, winner, message)`。
- 回合制游戏用 `kit.begin(state, player, now, ms)` 设置 `turn` 与 `turnEndsAt`；`step` 中检查 `kit.turnOver(state, now)`。
- 计分写入 `state.scores`。

### kit 提供

```js
kit.rng(seed)        -> { next(), int(n), pick(arr), shuffle(arr) }
kit.open(now, ms, message)
kit.finish(state, winner, message)
kit.live(state)
kit.begin(state, player, now, ms)
kit.turnOver(state, now)
kit.turnLeft(state, now)
kit.matchLeft(state, now)
kit.pane(state)      -> { status, winner, scores, turn, message, now, startedAt, endsAt, matchLeft, turnLeft }
kit.int(value, lo, hi)
kit.oneOf(value, list)
```

### 视图规则

`kit.pane(state)` 输出公共字段；再叠加本游戏自己的可见字段。客户端每收到一次快照就调用 `view`，因此必须返回新对象；数组用 `slice()` 拷贝，不得把 state 内部引用直接暴露给前端。

## 3. 视图接口

```js
export function mount(root, api) {
  // root 是空容器；api = { me, names, send(action), sound(name) }
  return { update(view), unmount() };
}
```

- `update` 每帧收到引擎视图；只更新变化部分，不重建整棵 DOM（canvas 游戏直接绘制）。
- `api.send(action)` 发送操作；`api.me` 是 0/1；`api.names` 是 `[昵称, 昵称]`。
- 音效可选调用 `api.sound('tap' | 'win' | 'lose' | 'tick')`。
- 视图可以在 `mount` 时向 `document.head` 注入自己的 `<style>`（类名统一 `tws-`），`unmount` 时移除。
- 操作区触摸目标 ≥ 44px；320px 宽无横向滚动；支持触摸与键盘；`prefers-reduced-motion` 下关闭动画。
- 文案中文；代码零注释。

## 4. 视觉令牌

```css
--tw-paper:#FBF3E6;  --tw-card:#FFFDF8;  --tw-ink:#2A2623;  --tw-muted:#7C7268;
--tw-line:#E4D7C3;   --tw-coral:#D9624C; --tw-forest:#2F6B5B; --tw-mustard:#E8A93C;
--tw-sky:#4F7FA8;    --tw-plum:#8A5A7A; --tw-olive:#7E8A4A;
```

玩家一用 `--tw-coral`，玩家二用 `--tw-forest`。卡片风格：纸面白底、1.5px 墨线描边、`0 2px 0 rgba(42,38,35,.10)` 硬阴影、18px 圆角。

## 5. 测试要求

每个引擎至少覆盖：确定性（同 seed 同状态）、合法操作、非法操作拒绝（错玩家/越界/占位/错类型）、胜负判定、超时判定、`view` 不含下划线键与对方隐藏信息。

## 6. 协作红线

- 只读取 `D:\codexAI\pinecone-club` 内本任务相关文件；**不得打开或复用本机其他任何项目**。
- 只写自己负责的游戏文件与测试文件，不改 `games/kit.js`、`shared/catalog.js`、其他组文件。
- 代码零注释；完成前用 D 盘 Node 自测通过。