# 雾林骑士

一个可移动骑士与低多边形森林的 Three.js 浏览器测试场景。

- 移动：WASD 或方向键（方向固定对应屏幕上下左右）
- 奔跑：按住 Shift
- 手机：屏幕虚拟方向键
- 镜头：高位斜俯视跟随，接近经典 RTS/War3 视角
- 昼夜：约 90 秒自动循环，按 N 可立即切换
- 资源：伐木场 NPC 白天会经城门前往城外树线伐木，入夜返回城内；资源会保存在当前浏览器
- 怪物：城外骷髅白天警戒范围较小，夜晚变为重甲战士并扩大追击范围
- 金币：击杀白天骷髅获得 8 金币，击杀夜间重甲骷髅获得 12 金币
- 攻击：鼠标左键或 J，连续输入可衔接横斩、斜斩、重劈三段连击
- 城镇中心：地图中心已建造三级大厅，按 U 或点击面板升级外观

角色、骨骼动画、树木、灌木与岩石均使用真正的 GLB/GLTF 文件；Three.js 已打包进 `game.js`，不依赖外部 CDN。

## 素材许可

- KayKit Adventurers Character Pack 2.0 — CC0
- KayKit Forest Nature Pack 1.0 — CC0
- KayKit Skeletons Character Pack 1.1 — CC0
- KayKit Character Animations 1.1 — CC0
- KayKit Medieval Hexagon Pack 1.0 — CC0
- Quaternius Ultimate Modular Men Pack — CC0
- Quaternius Ultimate Modular Women Pack — CC0 / CC BY（女工人）

素材作者：Kay Lousberg（KayKit）、Quaternius。许可证与素材来源保存在 `licenses/`。
