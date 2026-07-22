# 雾林骑士

一个可移动骑士与低多边形森林的 Three.js 浏览器测试场景。

- 移动：WASD 或方向键（方向固定对应屏幕上下左右）
- 奔跑：按住 Shift
- 手机：屏幕虚拟方向键
- 镜头：高位斜俯视跟随，接近经典 RTS/War3 视角
- 昼夜：约 90 秒自动循环，按 N 可立即切换
- 怪物：白天杂兵低攻击性；夜晚变为重甲战士，扩大追击范围并使用近战动画
- 攻击：鼠标左键或 J，连续输入可衔接横斩、斜斩、重劈三段连击

角色、骨骼动画、树木、灌木与岩石均使用真正的 GLB/GLTF 文件；Three.js 已打包进 `game.js`，不依赖外部 CDN。

## 素材许可

- KayKit Adventurers Character Pack 2.0 — CC0
- KayKit Forest Nature Pack 1.0 — CC0
- KayKit Skeletons Character Pack 1.1 — CC0
- KayKit Character Animations 1.1 — CC0

素材作者：Kay Lousberg（KayKit）。许可证原文保存在 `licenses/`。
