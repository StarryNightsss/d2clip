# 色号设计页 · 轮播图生图指令

用于生成一张可放在「色号研发」轮播区的横幅图，后续可在图上做鼠标拖动/触屏视差等效果。

---

## 尺寸

- **推荐输出**：**1600 × 320 px**（宽高比 5:1，与当前轮播区 160px 高、全宽展示一致）
- 若需 Retina：**3200 × 640 px**，前端用 `background-size: cover` 或 `contain` 即可

---

## 生图 Prompt（中英均可）

**中文：**  
柔和的粉玫色与浅紫渐变背景，口红实验室 / 色号研发主题，抽象色块或口红管剪影点缀，留出画面中央或中上区域给文字叠加，简约现代，无真人无复杂细节，横构图横幅。

**English：**  
Soft pink and light purple gradient background, lipstick lab / shade R&D theme, abstract color swatches or lipstick tube silhouettes, leave center or upper-center area clear for text overlay, minimal and modern, no people no busy details, wide horizontal banner composition.

**关键词补充（可 append）：**  
`wide banner`, `1600x320`, `soft gradient`, `cosmetics lab`, `color swatches`, `clean composition`, `text overlay friendly`

---

## 使用与交互建议

- 图片可作为轮播每页的 `background-image`，用 `background-size: cover; background-position: center;` 适配不同宽度。
- 如需「鼠标拖动 / 触屏滑动」的视差效果：在轮播容器内用一层 `div` 放背景图，用 `transform: translate(...)` 或 `background-position` 随鼠标/触摸位移做轻微移动即可（可与轮播切换并存）。
