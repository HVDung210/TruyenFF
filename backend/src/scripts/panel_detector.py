import sys
import json
import base64
import traceback
from typing import Tuple, Dict, Any, List, Optional
import cv2
import numpy as np
import os
import time


# --- CÁC HÀM CƠ BẢN ---
def read_image_bgr(path: str) -> np.ndarray:
    # Debug logs to stderr (không ảnh hưởng JSON stdout)
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
        print(f"[PY][ERROR] Kiểm tra lại định dạng file và quyền truy cập", file=sys.stderr)
        raise ValueError("Không thể đọc ảnh: " + path)
    print(f"[PY] Image shape: {image.shape}", file=sys.stderr)
    return image

def encode_image_to_base64(image_bgr: np.ndarray) -> str:
    ok, buffer = cv2.imencode('.jpg', image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok: raise ValueError("Lỗi encode ảnh")
    return base64.b64encode(buffer.tobytes()).decode('utf-8')


# --- LOGIC PHÁT HIỆN PANEL (Phiên bản gốc) ---
def detect_panels(gray: np.ndarray) -> List[Tuple[int, int, int, int]]:
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
def detect(image_bgr: np.ndarray) -> Dict[str, Any]:
    start_time = time.time()
    start_total = time.perf_counter()
    original, result_img = image_bgr.copy(), image_bgr.copy()
    gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    t_start_detect = time.perf_counter()
    panel_coords = detect_panels(gray)
    t_end_detect = time.perf_counter()
    print(f"[TIMING] 1. Detect Panels: {t_end_detect - t_start_detect:.3f}s", file=sys.stderr)
    
    t_start_format = time.perf_counter()
    panels_final = []
    
    for i, (px, py, pw, ph) in enumerate(panel_coords):
        panel_info = {"id": i + 1, "x": px, "y": py, "w": pw, "h": ph}
        cv2.rectangle(result_img, (px, py), (px + pw, py + ph), (0, 0, 255), 3)
        cv2.putText(result_img, f'P{panel_info["id"]}', (px + 5, py + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        panels_final.append(panel_info)

    duration_ms = int((time.time() - start_time) * 1000)
    annotated = encode_image_to_base64(result_img)
    t_end_format = time.perf_counter()
    print(f"[TIMING] 2. Format & Encode: {t_end_format - t_start_format:.3f}s", file=sys.stderr)
    
    t_end_total = time.perf_counter()
    print(f"[TIMING] TOTAL STEPS FOR PANEL DETECTION: {t_end_total - start_total:.3f}s", file=sys.stderr)
    
    return {
        "panelCount": len(panels_final),
        "panels": panels_final,
        "annotatedImageBase64": annotated,
        "width": int(w),
        "height": int(h),
        "processingTime": duration_ms
    }

# --- HÀM MAIN ---
def main():
    sys.stdout.reconfigure(encoding='utf-8')
    
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Thiếu đường dẫn ảnh"})); sys.exit(1)

    image_path = sys.argv[1]
    
    try:
        image = read_image_bgr(image_path)
        result = detect(image)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0)
        
    except FileNotFoundError as e:
        print(f"[PY][ERROR] FileNotFoundError: {str(e)}", file=sys.stderr)
        print(json.dumps({"error": "File không tồn tại", "details": str(e)})); sys.exit(2)
    except ValueError as e:
        print(f"[PY][ERROR] ValueError: {str(e)}", file=sys.stderr)
        print(json.dumps({"error": "Lỗi dữ liệu ảnh", "details": str(e)})); sys.exit(2)
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"[PY][ERROR] Unexpected error: {str(e)}", file=sys.stderr)
        print(f"[PY][ERROR] Traceback: {error_details}", file=sys.stderr)
        print(json.dumps({"error": "Script Python xử lý ảnh thất bại", "details": error_details})); sys.exit(2)

if __name__ == '__main__':
    main()
