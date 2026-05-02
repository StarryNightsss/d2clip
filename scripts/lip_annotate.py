"""
唇部轮廓标注工具 — Tkinter 拖拽描边

用法：
  python lip_annotate.py [图像路径]

操作：
  1. 启动后显示 mannequin-head.png
  2. 按住鼠标左键拖拽描边上唇轮廓（从左嘴角→左唇峰→唇谷→右唇峰→右嘴角）
  3. 松开鼠标完成一笔描边（上唇可分多笔，如左半+右半）
  4. 点击「完成上唇」按钮，终端打印上唇点数组
  5. 同样方式描边下唇
  6. 点击「完成下唇」按钮，终端打印下唇点数组
  7. 复制终端输出的数组到 VtoDemoPanel.jsx 的 UPPER_LIP_OUTLINE / LOWER_LIP_OUTLINE

快捷键：
  Ctrl+Z  撤销最后一笔
  R       重置全部
"""

import sys
import tkinter as tk
from PIL import Image, ImageTk

# 默认图像路径
DEFAULT_IMG = "frontend/public/mannequin-head.png"

class LipAnnotator:
    def __init__(self, img_path: str):
        self.root = tk.Tk()
        self.root.title("唇部轮廓标注工具 — 拖拽描边")
        self.root.resizable(False, False)

        # 加载图像
        self.pil_img = Image.open(img_path)
        self.img_w, self.img_h = self.pil_img.size
        self.display_scale = min(800 / self.img_w, 800 / self.img_h, 1.0)
        self.display_w = int(self.img_w * self.display_scale)
        self.display_h = int(self.img_h * self.display_scale)
        self.pil_img_display = self.pil_img.resize(
            (self.display_w, self.display_h), Image.LANCZOS
        )

        # Canvas
        self.canvas = tk.Canvas(
            self.root,
            width=self.display_w,
            height=self.display_h,
            cursor="crosshair",
        )
        self.canvas.pack()

        # Buttons
        btn_frame = tk.Frame(self.root)
        btn_frame.pack(fill=tk.X, padx=10, pady=5)

        self.mode = "upper"  # 'upper' or 'lower'
        self.mode_label = tk.Label(btn_frame, text="当前：上唇", font=("Arial", 12, "bold"), fg="#a29bfe")
        self.mode_label.pack(side=tk.LEFT, padx=5)

        tk.Button(btn_frame, text="完成上唇 → 切换下唇", command=self.finish_upper,
                  bg="#a29bfe", fg="white", font=("Arial", 10)).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text="完成下唇 → 输出", command=self.finish_lower,
                  bg="#74b9ff", fg="white", font=("Arial", 10)).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text="撤销最后一笔 (Ctrl+Z)", command=self.undo_stroke,
                  bg="#fdcb6e", font=("Arial", 10)).pack(side=tk.LEFT, padx=5)
        tk.Button(btn_frame, text="重置全部 (R)", command=self.reset_all,
                  bg="#ff7675", fg="white", font=("Arial", 10)).pack(side=tk.LEFT, padx=5)

        # Status bar
        self.status = tk.Label(self.root, text="按住鼠标拖拽描边上唇轮廓", anchor=tk.W, font=("Arial", 10))
        self.status.pack(fill=tk.X, padx=10, pady=(0, 5))

        # State
        self.upper_strokes = []  # list of list of (x, y) in ORIGINAL image coords
        self.lower_strokes = []
        self.current_stroke = []
        self.drawing = False

        # Photo image for canvas
        self.tk_img = ImageTk.PhotoImage(self.pil_img_display)
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.tk_img)

        # Bindings
        self.canvas.bind("<ButtonPress-1>", self.on_press)
        self.canvas.bind("<B1-Motion>", self.on_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_release)
        self.root.bind("<Control-z>", lambda e: self.undo_stroke())
        self.root.bind("r", lambda e: self.reset_all())
        self.root.bind("R", lambda e: self.reset_all())

    def _display_to_orig(self, dx, dy):
        """Convert display canvas coords to original image coords"""
        return round(dx / self.display_scale), round(dy / self.display_scale)

    def on_press(self, event):
        self.drawing = True
        ox, oy = self._display_to_orig(event.x, event.y)
        self.current_stroke = [(ox, oy)]
        # Draw starting dot
        r = 2
        self.canvas.create_oval(event.x - r, event.y - r, event.x + r, event.y + r,
                                fill="#ff6b9d" if self.mode == "upper" else "#74b9ff", outline="")

    def on_drag(self, event):
        if not self.drawing:
            return
        ox, oy = self._display_to_orig(event.x, event.y)
        prev = self.current_stroke[-1]
        self.current_stroke.append((ox, oy))

        # Draw line on canvas
        px, py = prev
        dx_prev = px * self.display_scale
        dy_prev = py * self.display_scale
        color = "#ff6b9d" if self.mode == "upper" else "#74b9ff"
        self.canvas.create_line(dx_prev, dy_prev, event.x, event.y, fill=color, width=2)

    def on_release(self, event):
        if not self.drawing:
            return
        self.drawing = False
        if len(self.current_stroke) >= 2:
            if self.mode == "upper":
                self.upper_strokes.append(self.current_stroke)
            else:
                self.lower_strokes.append(self.current_stroke)
            n = len(self.upper_strokes) if self.mode == "upper" else len(self.lower_strokes)
            self.status.config(text=f"已记录第 {n} 笔 ({len(self.current_stroke)} 个点)")
        self.current_stroke = []

    def finish_upper(self):
        """完成上唇，切换到下唇模式"""
        total = sum(len(s) for s in self.upper_strokes)
        print(f"\n=== 上唇完成：{len(self.upper_strokes)} 笔，共 {total} 个点 ===")
        self.mode = "lower"
        self.mode_label.config(text="当前：下唇", fg="#74b9ff")
        self.status.config(text="现在描边下唇轮廓")

    def finish_lower(self):
        """完成下唇，输出结果"""
        total = sum(len(s) for s in self.lower_strokes)
        print(f"\n=== 下唇完成：{len(self.lower_strokes)} 笔，共 {total} 个点 ===")
        self._print_arrays()

    def undo_stroke(self):
        """撤销最后一笔"""
        if self.mode == "upper" and self.upper_strokes:
            removed = self.upper_strokes.pop()
            self.status.config(text=f"撤销上唇最后一笔 ({len(removed)} 个点)")
        elif self.mode == "lower" and self.lower_strokes:
            removed = self.lower_strokes.pop()
            self.status.config(text=f"撤销下唇最后一笔 ({len(removed)} 个点)")
        else:
            self.status.config(text="没有可撤销的笔画")
            return
        self._redraw()

    def reset_all(self):
        """重置全部标注"""
        self.upper_strokes = []
        self.lower_strokes = []
        self.mode = "upper"
        self.mode_label.config(text="当前：上唇", fg="#a29bfe")
        self.status.config(text="已重置，重新描边上唇")
        self._redraw()

    def _redraw(self):
        """重绘图像和所有已标注的笔画"""
        self.canvas.delete("all")
        self.tk_img = ImageTk.PhotoImage(self.pil_img_display)
        self.canvas.create_image(0, 0, anchor=tk.NW, image=self.tk_img)

        for stroke in self.upper_strokes:
            for i in range(1, len(stroke)):
                x0, y0 = stroke[i - 1]
                x1, y1 = stroke[i]
                self.canvas.create_line(
                    x0 * self.display_scale, y0 * self.display_scale,
                    x1 * self.display_scale, y1 * self.display_scale,
                    fill="#ff6b9d", width=2,
                )

        for stroke in self.lower_strokes:
            for i in range(1, len(stroke)):
                x0, y0 = stroke[i - 1]
                x1, y1 = stroke[i]
                self.canvas.create_line(
                    x0 * self.display_scale, y0 * self.display_scale,
                    x1 * self.display_scale, y1 * self.display_scale,
                    fill="#74b9ff", width=2,
                )

    def _print_arrays(self):
        """打印 JS 格式的点数组"""
        # 上唇：合并所有笔画
        upper_points = []
        for s in self.upper_strokes:
            upper_points.extend(s)

        lower_points = []
        for s in self.lower_strokes:
            lower_points.extend(s)

        print("\n" + "=" * 60)
        print("复制以下内容到 VtoDemoPanel.jsx：")
        print("=" * 60)

        print("\nconst UPPER_LIP_OUTLINE = [")
        for i in range(0, len(upper_points), 8):
            chunk = upper_points[i:i + 8]
            line = ",".join(f"[{x},{y}]" for x, y in chunk)
            print(f"  {line},")
        print("];")

        print("\nconst LOWER_LIP_OUTLINE = [")
        for i in range(0, len(lower_points), 8):
            chunk = lower_points[i:i + 8]
            line = ",".join(f"[{x},{y}]" for x, y in chunk)
            print(f"  {line},")
        print("];")

        print("\n" + "=" * 60)
        print(f"上唇 {len(upper_points)} 点，下唇 {len(lower_points)} 点")
        print("=" * 60)

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    img_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_IMG
    try:
        app = LipAnnotator(img_path)
        app.run()
    except FileNotFoundError:
        print(f"错误：找不到图像 {img_path}")
        print("用法：python lip_annotate.py [图像路径]")
        sys.exit(1)
