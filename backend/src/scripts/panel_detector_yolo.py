import sys
import json
import base64
import traceback
from typing import List, Dict, Any
import cv2
import numpy as np
import os
import time
from pathlib import Path

# YOLOv12 imports
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("[PY][WARNING] Ultralytics not installed. Using fallback OpenCV method.", file=sys.stderr)


# --- CÁC HÀM CƠ BẢN ---
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
        print(f"[PY][ERROR] Kiểm tra lại định dạng file và quyền truy cập", file=sys.stderr)
        raise ValueError("Không thể đọc ảnh: " + path)
    print(f"[PY] Image shape: {image.shape}", file=sys.stderr)
    return image

def encode_image_to_base64(image_bgr: np.ndarray) -> str:
    """Encode ảnh thành base64 string"""
    ok, buffer = cv2.imencode('.jpg', image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok: raise ValueError("Lỗi encode ảnh")
    return base64.b64encode(buffer.tobytes()).decode('utf-8')


# --- YOLOv12 PANEL DETECTION ---
def detect_panels_yolo(image_bgr: np.ndarray, model_path: str = None) -> List[tuple]:
    """
    Phát hiện panels bằng YOLOv12 model từ Hugging Face
    
    Args:
        image_bgr: Ảnh đầu vào (BGR format)
        model_path: Đường dẫn đến file model best.pt (nếu None sẽ tự động download)
    
    Returns:
        List of tuples (x, y, w, h) cho mỗi panel
    """
    if not YOLO_AVAILABLE:
        print("[PY][WARNING] YOLO not available, using fallback method", file=sys.stderr)
        return detect_panels_opencv(image_bgr)
    
    try:
        # Load YOLO model
        if model_path is None or not os.path.exists(model_path):
            print("[PY] Downloading YOLOv12 model from Hugging Face...", file=sys.stderr)
            # Model sẽ tự động download từ Hugging Face
            model_path = 'D:/Ky_2/Thuc_tap/TruyenFF/backend/src/scripts/models/best.pt'
        
        print(f"[PY] Loading YOLO model from: {model_path}", file=sys.stderr)
        model = YOLO(model_path)
        
        # Run inference
        print("[PY] Running YOLO inference...", file=sys.stderr)
        results = model.predict(source=image_bgr, conf=0.25, iou=0.45, verbose=False)
        
        # Extract bounding boxes
        panels = []
        if len(results) > 0:
            result = results[0]
            boxes = result.boxes
            
            print(f"[PY] YOLO detected {len(boxes)} panels", file=sys.stderr)
            
            for box in boxes:
                # Get coordinates (xyxy format)
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                
                # Convert to (x, y, w, h) format
                x = int(x1)
                y = int(y1)
                w = int(x2 - x1)
                h = int(y2 - y1)
                
                confidence = box.conf.item()
                print(f"[PY] Panel detected: x={x}, y={y}, w={w}, h={h}, conf={confidence:.2f}", file=sys.stderr)
                
                panels.append((x, y, w, h))
        
        return panels
        
    except Exception as e:
        print(f"[PY][ERROR] YOLO detection failed: {str(e)}", file=sys.stderr)
        print(f"[PY] Falling back to OpenCV method", file=sys.stderr)
        return detect_panels_opencv(image_bgr)


# --- FALLBACK: OPENCV PANEL DETECTION (Phương pháp cũ) ---
def detect_panels_opencv(image_bgr: np.ndarray) -> List[tuple]:
    """
    Phát hiện panels bằng OpenCV (phương pháp cũ - fallback)
    """
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


# --- HÀM ĐIỀU PHỐI CHÍNH ---
def detect(image_bgr: np.ndarray, use_yolo: bool = True, model_path: str = None) -> Dict[str, Any]:
    """
    Phát hiện panels trong ảnh comic
    
    Args:
        image_bgr: Ảnh đầu vào
        use_yolo: True để dùng YOLOv12, False để dùng OpenCV
        model_path: Đường dẫn đến YOLO model (optional)
    """
    start_time = time.time()
    original, result_img = image_bgr.copy(), image_bgr.copy()
    h, w, _ = original.shape

    # Chọn phương pháp detection
    if use_yolo and YOLO_AVAILABLE:
        print("[PY] Using YOLOv12 for panel detection", file=sys.stderr)
        panel_coords = detect_panels_yolo(original, model_path)
        method = "YOLOv12"
    else:
        print("[PY] Using OpenCV for panel detection", file=sys.stderr)
        panel_coords = detect_panels_opencv(original)
        method = "OpenCV"
    
    # Format kết quả
    panels_final = []
    for i, (px, py, pw, ph) in enumerate(panel_coords):
        panel_info = {"id": i + 1, "x": px, "y": py, "w": pw, "h": ph}
        cv2.rectangle(result_img, (px, py), (px + pw, py + ph), (0, 0, 255), 3)
        cv2.putText(result_img, f'P{panel_info["id"]}', (px + 5, py + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        panels_final.append(panel_info)

    duration_ms = int((time.time() - start_time) * 1000)
    print(f"[PY] Panels detected: {len(panels_final)} | method={method} | durationMs={duration_ms}", file=sys.stderr)

    annotated = encode_image_to_base64(result_img)
    return {
        "panelCount": len(panels_final),
        "panels": panels_final,
        "annotatedImageBase64": annotated,
        "width": int(w),
        "height": int(h),
        "processingTime": duration_ms,
        "detectionMethod": method
    }


# --- HÀM MAIN ---
def main():
    sys.stdout.reconfigure(encoding='utf-8')
    print(f"[PY] Script started with {len(sys.argv)} arguments", file=sys.stderr)
    
    if len(sys.argv) < 2:
        print("[PY][ERROR] Thiếu đường dẫn ảnh", file=sys.stderr)
        print(json.dumps({"error": "Thiếu đường dẫn ảnh"})); sys.exit(1)

    image_path = sys.argv[1]
    
    # Optional: Đường dẫn đến YOLO model
    model_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    # Optional: Cờ để chọn phương pháp (yolo hoặc opencv)
    use_yolo = True
    if len(sys.argv) > 3:
        use_yolo = sys.argv[3].lower() != 'opencv'
    
    print(f"[PY] Start panel detection image=\"{image_path}\" use_yolo={use_yolo}", file=sys.stderr)
    print(f"[PY] Arguments: {sys.argv}", file=sys.stderr)
    
    try:
        print(f"[PY] Bước 1: Đọc ảnh từ {image_path}", file=sys.stderr)
        image = read_image_bgr(image_path)
        
        print(f"[PY] Bước 2: Bắt đầu phát hiện panel", file=sys.stderr)
        result = detect(image, use_yolo=use_yolo, model_path=model_path)
        
        print(f"[PY] Bước 3: Hoàn thành xử lý, trả về kết quả", file=sys.stderr)
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

