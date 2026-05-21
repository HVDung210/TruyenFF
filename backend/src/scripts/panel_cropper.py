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

# Đọc file ảnh từ đường dẫn `path` và trả về ảnh dưới dạng BGR numpy array.
# - Kiểm tra tồn tại file và kích thước trước khi đọc.
# - Ghi log chi tiết ra `stderr` để tiện debug khi chạy dưới Python từ Node.
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

# Encode một ảnh BGR (numpy array) sang Base64 JPEG.
# Trả về string Base64 dùng để truyền qua JSON về Node/JS.
def encode_image_to_base64(image_bgr: np.ndarray) -> str:
    """Encode ảnh (dưới dạng numpy array) thành base64 string"""
    ok, buffer = cv2.imencode('.jpg', image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok: raise ValueError("Lỗi encode ảnh")
    return base64.b64encode(buffer.tobytes()).decode('utf-8')

# --- HÀM DETECT PANELS ---

# Dùng mô hình YOLO để phát hiện bounding boxes của panel.
# Nếu YOLO không khả dụng thì fallback sang `detect_panels_opencv`.
# Trả về danh sách tuple (x, y, w, h).
def detect_panels_yolo(image_bgr: np.ndarray, model_path: str = None) -> List[tuple]:
    if not YOLO_AVAILABLE:
        return detect_panels_opencv(image_bgr)
    try:
        if model_path is None or not os.path.exists(model_path):
            model_path = 'D:/Ky_2/Thuc_tap/TruyenFF/backend/src/scripts/models/finetune_detect.pt'
        model = YOLO(model_path)
        results = model.predict(source=image_bgr, conf=0.3, iou=0.45, verbose=False)
        panels = []
        if len(results) > 0:
            result = results[0]
            boxes = result.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                x, y, w, h = int(x1), int(y1), int(x2 - x1), int(y2 - y1)
                panels.append((x, y, w, h))
        return panels
    except Exception as e:
        print(f"[PY][ERROR] YOLO detection failed: {str(e)}", file=sys.stderr)
        return detect_panels_opencv(image_bgr)

# Fallback phát hiện panel bằng kỹ thuật xử lý ảnh truyền thống (OpenCV):
# - Chuyển sang grayscale, adaptive threshold, morphological close
# - Tìm contours lớn, lọc theo diện tích/tỉ lệ để loại nhiễu
def detect_panels_opencv(image_bgr: np.ndarray) -> List[tuple]:
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

# --- HÀM ĐIỀU PHỐI CHÍNH ---
# Hàm chính điều phối việc phát hiện và cắt panel.
# - `panel_coords_json`: nếu cung cấp thì dùng trực tiếp thay vì detect
# - `use_yolo`: ưu tiên YOLO nếu có mô hình và tùy chọn bật
# Trả về dict chứa `panels` (mỗi panel kèm base64), kích thước ảnh, thời gian xử lý
def crop_and_detect(
    image_bgr: np.ndarray, 
    use_yolo: bool = True, 
    model_path: str = None,
    panel_coords_json: Optional[str] = None
) -> Dict[str, Any]:
    """
    Phát hiện, cắt và trả về panels
    """
    start_time = time.time()
    start_total = time.perf_counter()
    original = image_bgr.copy()
    h, w, _ = original.shape

    panel_coords = []
    method = ""

    # BƯỚC 1: Lấy tọa độ panel
    t_start_detect = time.perf_counter()
    if panel_coords_json:
        try:
            panel_list = json.loads(panel_coords_json)
            panel_coords = [(p['x'], p['y'], p['w'], p['h']) for p in panel_list]
            method = "JSON_Input"
        except Exception as e:
            print(f"[PY][ERROR] Failed to parse panel_coords_json: {e}", file=sys.stderr)
            panel_coords_json = None
    
    if not panel_coords_json:
        if use_yolo and YOLO_AVAILABLE:
            panel_coords = detect_panels_yolo(original, model_path)
            method = "YOLOv12"
        else:
            panel_coords = detect_panels_opencv(original)
            method = "OpenCV"
    t_end_detect = time.perf_counter()
    print(f"[TIMING] 1. Detect Panel ({method}): {t_end_detect - t_start_detect:.3f}s", file=sys.stderr)
    
    # BƯỚC 2: Format kết quả VÀ CẮT ẢNH
    # Lưu ý: vòng lặp dưới đây cắt region trên ảnh gốc theo tọa độ (x,y,w,h)
    # và encode sang Base64 để trả về, tránh ghi tạm file trên đĩa.
    t_start_crop = time.perf_counter()
    panels_final = []
    for i, (px, py, pw, ph) in enumerate(panel_coords):
        cropped_panel_bgr = original[py:py+ph, px:px+pw]
        cropped_base64 = encode_image_to_base64(cropped_panel_bgr)
        panel_info = {
            "id": i + 1, 
            "x": px, "y": py, "w": pw, "h": ph,
            "croppedImageBase64": cropped_base64
        }
        panels_final.append(panel_info)
    t_end_crop = time.perf_counter()
    print(f"[TIMING] 2. Crop Panels: {t_end_crop - t_start_crop:.3f}s", file=sys.stderr)

    duration_ms = int((time.time() - start_time) * 1000)
    t_end_total = time.perf_counter()
    print(f"[TIMING] TOTAL STEPS FOR PANEL CROPPING: {t_end_total - start_total:.3f}s", file=sys.stderr)

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
    
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python panel_cropper.py <image_path> [model_path] [panel_json_string]"})); sys.exit(1)

    image_path = sys.argv[1]
    model_path = sys.argv[2] if len(sys.argv) > 2 else None
    panel_json_string = sys.argv[3] if len(sys.argv) > 3 else None
    use_yolo = True
    
    try:
        image = read_image_bgr(image_path)
        
        result = crop_and_detect(
            image, 
            use_yolo=use_yolo, 
            model_path=model_path, 
            panel_coords_json=panel_json_string
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0)
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"[PY][ERROR] Unexpected error: {str(e)}", file=sys.stderr)
        print(json.dumps({"error": "Script Python xử lý ảnh thất bại", "details": error_details})); sys.exit(2)

if __name__ == '__main__':
    main()