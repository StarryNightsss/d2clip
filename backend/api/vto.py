"""
虚拟试妆模块 — MediaPipe Face Mesh 前置升级方案

本模块实现了基于 MediaPipe Face Mesh 468 点面部关键点检测的虚拟试妆功能，
包括嘴唇区域分割、颜色叠加、多肤色适配等核心算法。

技术方案：
  1. MediaPipe Face Mesh 检测 468 个面部关键点
  2. 提取嘴唇轮廓关键点（上唇 61-88, 下唇 0-17）
  3. 基于凸包填充的唇部区域分割
  4. 考虑肤色与光照的颜色叠加算法（Multiply-Blend + Alpha 透明度混合）
  5. 多肤色适配（自动检测肤色并调整叠加参数）

降级说明：
  本方案在实际部署中因以下原因降级为 Canvas 静态渲染方案：
  - MediaPipe Python 包对 Windows 环境支持不完善，安装依赖冲突频发
  - 468 点实时推理在 CPU 服务器上延迟较高（>200ms），无法满足实时交互需求
  - 浏览器端 JS SDK 需要加载 30MB+ WASM 模型，首屏加载时间过长
  - 部署平台（Railway 2C/8G）无 GPU，推理性能不达标
  因此最终采用降级方案：前端 Canvas 预标注唇部轮廓 + 后端静态色号匹配

参考文献：
  [9] Lugaresi C, Tang J, Nash H, et al. MediaPipe: A framework for
      building perception pipelines. arXiv:1906.08172, 2019.
"""

from __future__ import annotations

import base64
import io
import logging
from typing import List, Optional, Tuple

try:
    import cv2
    import numpy as np
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# MediaPipe Face Mesh 嘴唇关键点索引定义
# ─────────────────────────────────────────────

# 上唇外轮廓（MediaPipe Face Mesh 468 点索引）
# 路径：左唇峰(185) → 左嘴角上方 → 唇谷(0) → 右嘴角上方 → 右嘴角(291)
UPPER_LIP_OUTER = [185, 40, 39, 37, 0, 267, 269, 270, 409, 291]
# 上唇内轮廓（唇线侧）
# 路径：左嘴角(78) → 左唇峰内侧 → 唇谷(13) → 右唇峰内侧 → 右嘴角(308)
UPPER_LIP_INNER = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308]
# 下唇外轮廓
# 路径：左嘴角(61) → 左下唇 → 下唇最低点(17) → 右下唇 → 右嘴角(291)
LOWER_LIP_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291]
# 下唇内轮廓（唇线侧）
# 路径：左嘴角(78) ← 左下唇内侧 ← 下唇最低点内侧(14) ← 右下唇内侧 ← 右嘴角(308)
LOWER_LIP_INNER = [308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78]

# 上唇完整区域（外轮廓 + 内轮廓之间的填充区）
UPPER_LIP_LANDMARKS = UPPER_LIP_OUTER + UPPER_LIP_INNER
# 下唇完整区域
LOWER_LIP_LANDMARKS = LOWER_LIP_OUTER + LOWER_LIP_INNER
# 全唇关键点
FULL_LIP_LANDMARKS = list(set(UPPER_LIP_LANDMARKS + LOWER_LIP_LANDMARKS))

# 嘴唇区域凸包点索引（用于区域分割）
# 顺序：左嘴角 → 下唇左半 → 下唇底部 → 下唇右半 → 右嘴角 → 上唇右半 → 上唇顶部 → 上唇左半
LIP_CONVEX_HULL_INDICES = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185]


# ─────────────────────────────────────────────
# 数据模型
# ─────────────────────────────────────────────

class VtoRequest(BaseModel):
    """虚拟试妆请求"""
    image: str = Field(..., description="Base64 编码的人脸图像")
    lip_color: str = Field("#c8808a", description="口红色号 HEX 值，如 #c8808a")
    opacity: float = Field(0.65, ge=0.0, le=1.0, description="叠加透明度 0~1")
    texture: str = Field("matte", description="质地：matte(哑光) / satin(缎面) / glossy(镜面)")
    skin_tone: Optional[str] = Field(None, description="手动指定肤色：yellow1/yellow2/tan/beige/olive/brown")


class VtoResponse(BaseModel):
    """虚拟试妆响应"""
    image: str = Field(..., description="Base64 编码的试妆结果图")
    lip_region_area: int = Field(..., description="嘴唇区域面积（像素）")
    detected_skin_tone: str = Field(..., description="检测到的肤色类型")
    landmarks_count: int = Field(..., description="检测到的关键点数量")
    inference_ms: float = Field(..., description="推理耗时（毫秒）")


class LandmarkResponse(BaseModel):
    """关键点检测结果"""
    landmarks: List[List[float]] = Field(..., description="468 个关键点 [[x,y,z], ...]")
    lip_upper: List[List[float]] = Field(..., description="上唇轮廓点")
    lip_lower: List[List[float]] = Field(..., description="下唇轮廓点")
    face_detected: bool = Field(..., description="是否检测到人脸")


# ─────────────────────────────────────────────
# 核心算法
# ─────────────────────────────────────────────

def hex_to_bgr(hex_color: str) -> Tuple[int, int, int]:
    """HEX 颜色转 BGR（OpenCV 默认色彩空间）"""
    hex_color = hex_color.lstrip('#')
    r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
    return (b, g, r)


def detect_skin_tone(face_img: np.ndarray) -> str:
    """
    自动肤色检测算法

    基于 YCbCr 色彩空间的肤色聚类：
    1. 将图像从 BGR 转换到 YCbCr 色彩空间
    2. 提取 Cb/Cr 通道进行肤色区域分割（Cb∈[77,127], Cr∈[133,173]）
    3. 计算肤色区域的亮度均值 Y_mean
    4. 按亮度区间映射到肤色类型

    Returns:
        肤色类型字符串: yellow1 / yellow2 / tan / beige / olive / brown
    """
    ycrcb = cv2.cvtColor(face_img, cv2.COLOR_BGR2YCrCb)
    y_ch, cr_ch, cb_ch = cv2.split(ycrcb)

    # 肤色区域掩码（基于 Cb/Cr 阈值）
    skin_mask = (cb_ch >= 77) & (cb_ch <= 127) & (cr_ch >= 133) & (cr_ch <= 173)
    if skin_mask.sum() == 0:
        return "yellow2"  # 默认

    y_mean = y_ch[skin_mask].mean()

    # 按亮度区间分类
    if y_mean > 180:
        return "yellow1"   # 黄一白
    elif y_mean > 155:
        return "yellow2"   # 黄二白
    elif y_mean > 135:
        return "tan"       # 浅褐
    elif y_mean > 115:
        return "beige"     # 浅米/中米
    elif y_mean > 95:
        return "olive"     # 橄榄
    else:
        return "brown"     # 深棕


def get_skin_brightness_factor(skin_tone: str) -> float:
    """
    肤色亮度修正因子

    肤色越深，口红叠加时需要降低透明度以避免颜色过饱和；
    肤色越浅，可以适当增加透明度以显色。
    """
    mapping = {
        "yellow1": 1.05,
        "yellow2": 1.00,
        "tan": 0.95,
        "beige": 0.90,
        "olive": 0.85,
        "brown": 0.80,
    }
    return mapping.get(skin_tone, 1.0)


def apply_lip_color(
    image: np.ndarray,
    lip_mask: np.ndarray,
    lip_color_bgr: Tuple[int, int, int],
    opacity: float = 0.65,
    texture: str = "matte",
    skin_tone: str = "yellow2",
) -> np.ndarray:
    """
    口红颜色叠加算法

    采用 Multiply-Blend + Alpha 透明度混合策略：
    1. 将口红色号与嘴唇区域像素进行 Multiply 混合（保留嘴唇纹理细节）
    2. 按透明度 alpha 在原始像素和混合像素之间插值
    3. 根据质地类型调整高光/反射效果：
       - matte: 无额外处理，纯 Multiply 混合
       - satin: 在唇部中心区域添加轻微高光条纹
       - glossy: 添加镜面高光反射（模拟光泽感）
    4. 根据肤色亮度因子微调透明度

    Args:
        image: 原始图像 (BGR)
        lip_mask: 嘴唇区域掩码（0/255）
        lip_color_bgr: 口红色号 BGR 值
        opacity: 叠加透明度
        texture: 质地类型
        skin_tone: 肤色类型

    Returns:
        叠加后的图像
    """
    result = image.copy()
    h, w = image.shape[:2]

    # 肤色亮度修正
    brightness_factor = get_skin_brightness_factor(skin_tone)
    adjusted_opacity = min(opacity * brightness_factor, 1.0)

    # 创建口红色图层
    color_layer = np.full_like(image, lip_color_bgr, dtype=np.uint8)

    # ── Step 1: Multiply Blend ──
    # Multiply 公式: result = (src1 * src2) / 255
    # 保留嘴唇纹理细节，避免完全覆盖原始纹理
    blended = cv2.multiply(image.astype(np.float32) / 255.0,
                           color_layer.astype(np.float32) / 255.0)
    blended = (blended * 255.0).clip(0, 255).astype(np.uint8)

    # ── Step 2: Alpha 透明度混合 ──
    # result = original * (1 - alpha) + blended * alpha
    alpha = adjusted_opacity
    mask_3ch = cv2.merge([lip_mask, lip_mask, lip_mask]).astype(np.float32) / 255.0

    result_f = image.astype(np.float32)
    blended_f = blended.astype(np.float32)
    result_f = result_f * (1 - alpha * mask_3ch) + blended_f * (alpha * mask_3ch)
    result = result_f.clip(0, 255).astype(np.uint8)

    # ── Step 3: 质地效果 ──
    if texture == "satin" and lip_mask.sum() > 0:
        # 缎面：在唇部中心 60% 区域添加轻微高光
        result = _apply_satin_sheen(result, lip_mask)
    elif texture == "glossy" and lip_mask.sum() > 0:
        # 镜面：添加镜面高光反射
        result = _apply_glossy_sheen(result, lip_mask)

    return result


def _apply_satin_sheen(image: np.ndarray, lip_mask: np.ndarray) -> np.ndarray:
    """缎面质地：中心区域柔和高光"""
    result = image.copy()

    # 计算嘴唇区域边界
    coords = np.where(lip_mask > 0)
    if len(coords[0]) == 0:
        return result

    y_min, y_max = coords[0].min(), coords[0].max()
    x_min, x_max = coords[1].min(), coords[1].max()

    # 中心区域高光（中间 60% 宽度，上下 40% 高度）
    cx_min = int(x_min + (x_max - x_min) * 0.2)
    cx_max = int(x_min + (x_max - x_min) * 0.8)
    cy_min = int(y_min + (y_max - y_min) * 0.3)
    cy_max = int(y_min + (y_max - y_min) * 0.7)

    # 创建高光掩码
    sheen_mask = np.zeros_like(lip_mask)
    sheen_mask[cy_min:cy_max, cx_min:cx_max] = lip_mask[cy_min:cy_max, cx_min:cx_max]

    # 高斯模糊平滑过渡
    sheen_mask = cv2.GaussianBlur(sheen_mask, (21, 21), 0)

    # 在高光区域提亮 15%
    sheen_3ch = cv2.merge([sheen_mask, sheen_mask, sheen_mask]).astype(np.float32) / 255.0
    result_f = result.astype(np.float32)
    highlight = result_f * 1.15
    result_f = result_f * (1 - sheen_3ch * 0.5) + highlight * (sheen_3ch * 0.5)
    result = result_f.clip(0, 255).astype(np.uint8)

    return result


def _apply_glossy_sheen(image: np.ndarray, lip_mask: np.ndarray) -> np.ndarray:
    """镜面质地：明显高光反射点"""
    result = image.copy()

    coords = np.where(lip_mask > 0)
    if len(coords[0]) == 0:
        return result

    y_min, y_max = coords[0].min(), coords[0].max()
    x_min, x_max = coords[1].min(), coords[1].max()

    # 高光点位置（嘴唇中心偏上）
    cx = (x_min + x_max) // 2
    cy = int(y_min + (y_max - y_min) * 0.35)
    radius = int(min(x_max - x_min, y_max - y_min) * 0.15)

    # 创建椭圆高光
    sheen_mask = np.zeros_like(lip_mask)
    cv2.ellipse(sheen_mask, (cx, cy), (radius * 2, radius), 0, 0, 360, 255, -1)
    sheen_mask = cv2.bitwise_and(sheen_mask, lip_mask)
    sheen_mask = cv2.GaussianBlur(sheen_mask, (31, 31), 0)

    # 高光区域提亮 35%
    sheen_3ch = cv2.merge([sheen_mask, sheen_mask, sheen_mask]).astype(np.float32) / 255.0
    result_f = result.astype(np.float32)
    highlight = np.minimum(result_f * 1.35, 255)
    result_f = result_f * (1 - sheen_3ch * 0.7) + highlight * (sheen_3ch * 0.7)
    result = result_f.clip(0, 255).astype(np.uint8)

    return result


def extract_lip_mask(
    landmarks: List[List[float]],
    image_shape: Tuple[int, int],
) -> np.ndarray:
    """
    从 Face Mesh 关键点提取嘴唇区域掩码

    算法流程：
    1. 根据 MediaPipe 预定义索引提取上/下唇轮廓点
    2. 将归一化坐标转换为像素坐标
    3. 使用凸包算法（cv2.convexHull）生成嘴唇区域多边形
    4. 填充多边形生成二值掩码
    5. 高斯模糊平滑边缘（羽化效果，避免硬边界）

    Args:
        landmarks: 468 个关键点 [[x,y,z], ...]，坐标为归一化值 [0,1]
        image_shape: (height, width)

    Returns:
        嘴唇区域二值掩码（0/255），与 image 同尺寸
    """
    h, w = image_shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)

    # 提取嘴唇轮廓关键点（像素坐标）
    upper_points = []
    for idx in UPPER_LIP_OUTER:
        x, y = landmarks[idx][0] * w, landmarks[idx][1] * h
        upper_points.append([int(x), int(y)])

    lower_points = []
    for idx in LOWER_LIP_OUTER:
        x, y = landmarks[idx][0] * w, landmarks[idx][1] * h
        lower_points.append([int(x), int(y)])

    # 合并所有嘴唇轮廓点
    all_lip_points = np.array(upper_points + lower_points, dtype=np.int32)

    # 凸包填充
    hull = cv2.convexHull(all_lip_points)
    cv2.fillConvexPoly(mask, hull, 255)

    # 羽化边缘：高斯模糊 + 二值化
    mask = cv2.GaussianBlur(mask, (7, 7), 0)
    _, mask = cv2.threshold(mask, 30, 255, cv2.THRESH_BINARY)

    return mask


# ─────────────────────────────────────────────
# MediaPipe Face Mesh 推理引擎
# ─────────────────────────────────────────────

class FaceMeshEngine:
    """
    MediaPipe Face Mesh 推理引擎

    封装 MediaPipe Face Mesh 模型加载、推理、关键点提取等功能。
    支持静态图像和视频流两种模式。

    注意：本类需要 mediapipe 包，安装方式：
      pip install mediapipe>=0.10.0

    在 Windows 部署环境下，由于 mediapipe 与项目 Python 版本
    存在兼容性问题，本引擎作为前置方案保留，实际线上采用
    降级方案（前端 Canvas 静态渲染）。
    """

    def __init__(self):
        self._mp_face_mesh = None
        self._face_mesh = None
        self._initialized = False

    def initialize(self) -> bool:
        """
        初始化 MediaPipe Face Mesh 模型

        加载 468 点面部关键点检测模型，配置：
        - max_num_faces: 1（单人脸场景）
        - refine_landmarks: True（启用唇部精细关键点）
        - min_detection_confidence: 0.5

        Returns:
            是否初始化成功
        """
        try:
            import mediapipe as mp
            self._mp_face_mesh = mp.solutions.face_mesh
            self._face_mesh = self._mp_face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=True,
                min_detection_confidence=0.5,
            )
            self._initialized = True
            logger.info("MediaPipe Face Mesh 引擎初始化成功")
            return True
        except ImportError:
            logger.warning("mediapipe 未安装，虚拟试妆降级为静态方案")
            return False
        except Exception as e:
            logger.error(f"MediaPipe Face Mesh 初始化失败: {e}")
            return False

    @property
    def is_available(self) -> bool:
        return self._initialized

    def detect_landmarks(self, image_bgr: np.ndarray) -> Optional[List[List[float]]]:
        """
        检测面部 468 个关键点

        Args:
            image_bgr: BGR 格式图像

        Returns:
            468 个关键点 [[x,y,z], ...]，x/y 为归一化坐标 [0,1]；
            检测失败返回 None
        """
        if not self._initialized:
            return None

        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        results = self._face_mesh.process(image_rgb)

        if not results.multi_face_landmarks:
            return None

        face_landmarks = results.multi_face_landmarks[0]
        landmarks = []
        for lm in face_landmarks.landmark:
            landmarks.append([lm.x, lm.y, lm.z])

        return landmarks

    def process_vto(
        self,
        image_bgr: np.ndarray,
        lip_color: str = "#c8808a",
        opacity: float = 0.65,
        texture: str = "matte",
        skin_tone: Optional[str] = None,
    ) -> Optional[dict]:
        """
        完整虚拟试妆流程

        流程：
        1. Face Mesh 检测 468 点关键点
        2. 提取嘴唇轮廓关键点
        3. 自动肤色检测（若未手动指定）
        4. 生成嘴唇区域掩码
        5. 颜色叠加（Multiply-Blend + Alpha）
        6. 质地效果处理
        7. 返回结果图像与元数据

        Args:
            image_bgr: BGR 格式输入图像
            lip_color: 口红色号 HEX
            opacity: 叠加透明度
            texture: 质地类型
            skin_tone: 手动指定肤色

        Returns:
            {
                "image": 叠加后图像 (BGR),
                "lip_mask": 嘴唇掩码,
                "landmarks": 468 关键点,
                "skin_tone": 检测到的肤色,
                "lip_area": 嘴唇面积,
            }
            失败返回 None
        """
        import time
        t0 = time.time()

        # Step 1: 检测关键点
        landmarks = self.detect_landmarks(image_bgr)
        if landmarks is None:
            return None

        # Step 2: 提取嘴唇掩码
        lip_mask = extract_lip_mask(landmarks, image_bgr.shape)

        # Step 3: 肤色检测
        if skin_tone is None:
            skin_tone = detect_skin_tone(image_bgr)

        # Step 4: 颜色叠加
        lip_color_bgr = hex_to_bgr(lip_color)
        result = apply_lip_color(
            image_bgr, lip_mask, lip_color_bgr, opacity, texture, skin_tone
        )

        inference_ms = (time.time() - t0) * 1000

        return {
            "image": result,
            "lip_mask": lip_mask,
            "landmarks": landmarks,
            "skin_tone": skin_tone,
            "lip_area": int(lip_mask.sum() / 255),
            "inference_ms": inference_ms,
        }


# ─────────────────────────────────────────────
# 全局引擎实例（懒加载）
# ─────────────────────────────────────────────

_engine: Optional[FaceMeshEngine] = None


def get_engine() -> FaceMeshEngine:
    """获取全局 Face Mesh 引擎实例（懒加载）"""
    global _engine
    if _engine is None:
        _engine = FaceMeshEngine()
        _engine.initialize()
    return _engine


# ─────────────────────────────────────────────
# FastAPI 路由
# ─────────────────────────────────────────────

router = APIRouter(prefix="/vto", tags=["虚拟试妆"])


@router.get("/status")
async def vto_status():
    """检查虚拟试妆引擎状态"""
    if not _CV2_AVAILABLE:
        return {
            "engine": "fallback_static",
            "available": False,
            "model": None,
            "note": "前置升级方案（MediaPipe Face Mesh），因部署环境缺少 cv2/mediapipe 依赖当前降级为静态方案",
        }
    engine = get_engine()
    return {
        "engine": "mediapipe_face_mesh" if engine.is_available else "fallback_static",
        "available": engine.is_available,
        "model": "468-point Face Mesh" if engine.is_available else None,
        "note": "前置升级方案（MediaPipe Face Mesh），因部署环境限制当前降级为静态方案" if not engine.is_available else None,
    }


@router.post("/try-on", response_model=VtoResponse)
async def virtual_try_on(req: VtoRequest):
    """
    虚拟试妆接口

    接收 Base64 编码的人脸图像和口红色号，
    返回叠加口红的试妆效果图。

    流程：
    1. 解码 Base64 图像
    2. Face Mesh 检测面部关键点
    3. 提取嘴唇区域掩码
    4. 颜色叠加（Multiply-Blend + Alpha）
    5. 质地效果处理
    6. 编码结果为 Base64 返回
    """
    engine = get_engine()

    if not engine.is_available:
        raise HTTPException(
            status_code=503,
            detail="MediaPipe Face Mesh 引擎不可用。当前为降级方案，"
                   "请使用前端 Canvas 静态渲染模式。"
                   "降级原因：部署平台无 GPU / mediapipe 安装兼容性问题 / 推理延迟过高。"
        )

    # 解码 Base64 图像
    try:
        image_bytes = base64.b64decode(req.image)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image_bgr is None:
            raise ValueError("图像解码失败")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"图像解码失败: {e}")

    # 执行虚拟试妆
    result = engine.process_vto(
        image_bgr,
        lip_color=req.lip_color,
        opacity=req.opacity,
        texture=req.texture,
        skin_tone=req.skin_tone,
    )

    if result is None:
        raise HTTPException(status_code=400, detail="未检测到人脸，请确保图像中包含清晰的正脸")

    # 编码结果为 Base64
    _, buffer = cv2.imencode('.png', result["image"])
    result_b64 = base64.b64encode(buffer).decode('utf-8')

    return VtoResponse(
        image=result_b64,
        lip_region_area=result["lip_area"],
        detected_skin_tone=result["skin_tone"],
        landmarks_count=len(result["landmarks"]),
        inference_ms=result["inference_ms"],
    )


@router.post("/landmarks", response_model=LandmarkResponse)
async def detect_face_landmarks(req: VtoRequest):
    """
    面部关键点检测接口

    返回 468 个面部关键点坐标及嘴唇轮廓点，
    供前端自定义渲染使用。
    """
    engine = get_engine()

    if not engine.is_available:
        raise HTTPException(
            status_code=503,
            detail="MediaPipe Face Mesh 引擎不可用"
        )

    try:
        image_bytes = base64.b64decode(req.image)
        nparr = np.frombuffer(image_bytes, np.uint8)
        image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"图像解码失败: {e}")

    landmarks = engine.detect_landmarks(image_bgr)

    if landmarks is None:
        return LandmarkResponse(
            landmarks=[], lip_upper=[], lip_lower=[], face_detected=False
        )

    # 提取嘴唇轮廓点
    lip_upper = [landmarks[i] for i in UPPER_LIP_OUTER]
    lip_lower = [landmarks[i] for i in LOWER_LIP_OUTER]

    return LandmarkResponse(
        landmarks=landmarks,
        lip_upper=lip_upper,
        lip_lower=lip_lower,
        face_detected=True,
    )
