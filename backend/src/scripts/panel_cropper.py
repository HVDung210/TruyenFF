import sys
import json
import base64
import traceback
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
import os
import time

# --- CÁC HÀM TỪ panel_detector_yolo.py ---

# YOLOv12 imports
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("[PY][WARNING] Ultralytics not installed. Using fallback OpenCV method.", file=sys.stderr)

def read_image_bgr(path: str) -> np.ndarray:
    """Đọc ảnh từ đường dẫn và trả về numpy array"""
    try:
        file_exists = os.path.exists(path)
        file_size = os.path.getsize(path) if file_exists else 0
        print(f"[PY] read_image_bgr path=\"{path}\" exists={file_exists} size={file_size} cwd=\"{os.getcwd()}\" cv2={cv2.__version__}", file=sys.stderr)
        if not file_exists:
            print(f"[PY][ERROR] File không tồn tại: {path}", file=sys.stderr)
            raise FileNotFoundError(f"File không tồn tại: {path}")
        if file_size == 0:
            print(f"[PY][ERROR] File rỗng: {path}", file=sys.stderr)
            raise ValueError(f"File rỗng: {path}")
    except Exception as e:
        print(f"[PY][ERROR] Lỗi kiểm tra file: {str(e)}", file=sys.stderr)
        raise
    image = cv2.imread(path)
    if image is None:
        print(f"[PY][ERROR] cv2.imread returned None cho file: {path}", file=sys.stderr)
        raise ValueError("Không thể đọc ảnh: " + path)
    print(f"[PY] Image shape: {image.shape}", file=sys.stderr)
    return image

def encode_image_to_base64(image_bgr: np.ndarray) -> str:
    """Encode ảnh (dưới dạng numpy array) thành base64 string"""
    ok, buffer = cv2.imencode('.jpg', image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok: raise ValueError("Lỗi encode ảnh")
    return base64.b64encode(buffer.tobytes()).decode('utf-8')

# --- HÀM DETECT PANELS (Giữ nguyên từ panel_detector_yolo.py) ---

def detect_panels_yolo(image_bgr: np.ndarray, model_path: str = None) -> List[tuple]:
    if not YOLO_AVAILABLE:
        print("[PY][WARNING] YOLO not available, using fallback method", file=sys.stderr)
        return detect_panels_opencv(image_bgr)
    try:
        if model_path is None or not os.path.exists(model_path):
            model_path = 'D:/Ky_2/Thuc_tap/TruyenFF/backend/src/scripts/models/best.pt'
        print(f"[PY] Loading YOLO model from: {model_path}", file=sys.stderr)
        model = YOLO(model_path)
        print("[PY] Running YOLO inference...", file=sys.stderr)
        results = model.predict(source=image_bgr, conf=0.25, iou=0.45, verbose=False)
        panels = []
        if len(results) > 0:
            result = results[0]
            boxes = result.boxes
            print(f"[PY] YOLO detected {len(boxes)} panels", file=sys.stderr)
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                x, y, w, h = int(x1), int(y1), int(x2 - x1), int(y2 - y1)
                panels.append((x, y, w, h))
        return panels
    except Exception as e:
        print(f"[PY][ERROR] YOLO detection failed: {str(e)}", file=sys.stderr)
        return detect_panels_opencv(image_bgr)

def detect_panels_opencv(image_bgr: np.ndarray) -> List[tuple]:
    print("[PY] Using OpenCV panel detection (fallback)", file=sys.stderr)
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 15, 10)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    panels = []
    min_area = w * h * 0.01
    for cnt in contours:
        if cv2.contourArea(cnt) < min_area: continue
        x, y, pw, ph = cv2.boundingRect(cnt)
        if pw < w * 0.1 or ph < h * 0.1: continue
        if pw > w * 0.95 and ph > h * 0.95: continue
        panels.append((x, y, pw, ph))
    return panels

# --- HÀM ĐIỀU PHỐI CHÍNH (ĐÃ CẬP NHẬT) ---
def crop_and_detect(
    image_bgr: np.ndarray, 
    use_yolo: bool = True, 
    model_path: str = None,
    panel_coords_json: Optional[str] = None # <-- THAM SỐ MỚI
) -> Dict[str, Any]:
    """
    Phát hiện, cắt và trả về panels
    """
    start_time = time.time()
    original = image_bgr.copy()
    h, w, _ = original.shape

    panel_coords = []
    method = ""

    # BƯỚC 1: Lấy tọa độ panel
    if panel_coords_json:
        print("[PY] Using panels from JSON input", file=sys.stderr)
        # Nếu có JSON, đọc từ đó
        try:
            panel_list = json.loads(panel_coords_json)
            # Chuyển đổi từ format {x, y, w, h} sang (x, y, w, h)
            panel_coords = [(p['x'], p['y'], p['w'], p['h']) for p in panel_list]
            method = "JSON_Input"
        except Exception as e:
            print(f"[PY][ERROR] Failed to parse panel_coords_json: {e}", file=sys.stderr)
            print("[PY] Falling back to YOLO/OpenCV detection", file=sys.stderr)
            # Nếu lỗi, quay về detect
            panel_coords_json = None # reset
    
    if not panel_coords_json:
        # Logic cũ: Tự detect
        if use_yolo and YOLO_AVAILABLE:
            print("[PY] Using YOLOv12 for panel detection", file=sys.stderr)
            panel_coords = detect_panels_yolo(original, model_path)
            method = "YOLOv12"
        else:
            print("[PY] Using OpenCV for panel detection", file=sys.stderr)
            panel_coords = detect_panels_opencv(original)
            method = "OpenCV"
    
    # BƯỚC 2: Format kết quả VÀ CẮT ẢNH
    panels_final = []
    for i, (px, py, pw, ph) in enumerate(panel_coords):
        
        # Cắt panel
        cropped_panel_bgr = original[py:py+ph, px:px+pw]
        
        # Encode panel đã cắt sang Base64
        cropped_base64 = encode_image_to_base64(cropped_panel_bgr)
        
        panel_info = {
            "id": i + 1, 
            "x": px, "y": py, "w": pw, "h": ph,
            "croppedImageBase64": cropped_base64
        }
        panels_final.append(panel_info)

    duration_ms = int((time.time() - start_time) * 1000)
    print(f"[PY] Panels cropped: {len(panels_final)} | method={method} | durationMs={duration_ms}", file=sys.stderr)

    return {
        "panelCount": len(panels_final),
        "panels": panels_final,
        "width": int(w),
        "height": int(h),
        "processingTime": duration_ms,
        "detectionMethod": method
    }

# --- HÀM MAIN (Giống panel_detector_yolo.py) ---
def main():
    sys.stdout.reconfigure(encoding='utf-8')
    print(f"[PY] Cropper script started with {len(sys.argv)} arguments", file=sys.stderr)
    
    if len(sys.argv) < 2:
        print("[PY][ERROR] Thiếu đường dẫn ảnh", file=sys.stderr)
        print(json.dumps({"error": "Usage: python panel_cropper.py <image_path> [model_path] [panel_json_string]"})); sys.exit(1)

    image_path = sys.argv[1]
    model_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    # THAM SỐ THỨ 3 (mới): JSON string của tọa độ panel
    panel_json_string = sys.argv[3] if len(sys.argv) > 3 else None
    
    use_yolo = True # Giữ logic này (chỉ dùng nếu panel_json_string là None)
    
    print(f"[PY] Start panel cropping image=\"{image_path}\" use_yolo={use_yolo} has_json={panel_json_string is not None}", file=sys.stderr)
    
    try:
        image = read_image_bgr(image_path)
        
        result = crop_and_detect(
            image, 
            use_yolo=use_yolo, 
            model_path=model_path, 
            panel_coords_json=panel_json_string # <-- Truyền vào
        )
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0)
        
    except Exception as e:
        # ... (giữ nguyên error handling) ...
        error_details = traceback.format_exc()
        print(f"[PY][ERROR] Unexpected error: {str(e)}", file=sys.stderr)
        print(f"[PY][ERROR] Traceback: {error_details}", file=sys.stderr)
        print(json.dumps({"error": "Script Python xử lý ảnh thất bại", "details": error_details})); sys.exit(2)

if __name__ == '__main__':
    main()