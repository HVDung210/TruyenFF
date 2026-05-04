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


# --- CÁC HÀM CƠ BẢN --- (Giữ nguyên)
def read_image_bgr(path: str) -> np.ndarray:
    """Đọc ảnh từ đường dẫn và trả về numpy array"""
    try:
        file_exists = os.path.exists(path)
        file_size = os.path.getsize(path) if file_exists else 0
        
        if not file_exists:
            raise FileNotFoundError(f"File không tồn tại: {path}")
            
        if file_size == 0:
            raise ValueError(f"File rỗng: {path}")
            
    except Exception as e:
        raise

    image = cv2.imread(path)
    if image is None:
        raise ValueError("Không thể đọc ảnh: " + path)
    return image

def encode_image_to_base64(image_bgr: np.ndarray) -> str:
    """Encode ảnh thành base64 string"""
    ok, buffer = cv2.imencode('.jpg', image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok: raise ValueError("Lỗi encode ảnh")
    return base64.b64encode(buffer.tobytes()).decode('utf-8')


# --- YOLOv12 PANEL DETECTION --- (Giữ nguyên)
def detect_panels_yolo(image_bgr: np.ndarray, model_path: str = None) -> List[tuple]:
    if not YOLO_AVAILABLE:
        return detect_panels_opencv(image_bgr)
    
    try:
        if model_path is None or not os.path.exists(model_path):
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_path = os.path.join(current_dir, 'models', 'finetune_detect.pt')
        
        model = YOLO(model_path)
        results = model.predict(source=image_bgr, conf=0.3, iou=0.45, verbose=False)
        
        panels = []
        if len(results) > 0:
            result = results[0]
            boxes = result.boxes
            
            for box in boxes:
                cls_id = int(box.cls[0].item())
                if cls_id == 0:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    x = int(x1)
                    y = int(y1)
                    w = int(x2 - x1)
                    h = int(y2 - y1)
                    panels.append((x, y, w, h))
        
        return panels
        
    except Exception as e:
        print(f"[PY][ERROR] YOLO detection failed: {str(e)}", file=sys.stderr)
        return detect_panels_opencv(image_bgr)


# --- FALLBACK: OPENCV PANEL DETECTION (Phương pháp cũ) --- (Giữ nguyên)
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


# --- HÀM ĐIỀU PHỐI CHÍNH (ĐÃ CẬP NHẬT LOGIC SẮP XẾP) ---
def detect(image_bgr: np.ndarray, use_yolo: bool = True, model_path: str = None) -> Dict[str, Any]:
    """
    Phát hiện panels trong ảnh comic
    """
    start_time = time.time()
    start_total = time.perf_counter()
    original, result_img = image_bgr.copy(), image_bgr.copy()
    h, w, _ = original.shape

    t_start_detect = time.perf_counter()
    if use_yolo and YOLO_AVAILABLE:
        panel_coords = detect_panels_yolo(original, model_path)
        method = "YOLOv12"
    else:
        panel_coords = detect_panels_opencv(original)
        method = "OpenCV"
    t_end_detect = time.perf_counter()
    print(f"[TIMING] 1. Detect Panel ({method}): {t_end_detect - t_start_detect:.3f}s", file=sys.stderr)

    # === CẬP NHẬT KHỐI SẮP XẾP (LOGIC MỚI) ===
    t_start_sort = time.perf_counter()
    try:
        if len(panel_coords) > 0:
            
            # --- LOGIC SẮP XẾP MỚI ---
            # 1. Sắp xếp sơ bộ theo Y (trên xuống)
            panel_coords.sort(key=lambda coord: coord[1])

            # 2. Nhóm các panel vào các hàng
            rows = []
            if not panel_coords:
                pass # Bỏ qua nếu không có panel
            else:
                current_row = []
                # Lấy panel đầu tiên làm mốc cho hàng đầu tiên
                current_row.append(panel_coords[0])
                # Lấy Y và Chiều cao của panel đầu tiên làm mốc
                row_anchor_y = panel_coords[0][1] 
                row_anchor_height = panel_coords[0][3]
                
                for i in range(1, len(panel_coords)):
                    panel = panel_coords[i]
                    panel_y = panel[1]
                    
                    # Ngưỡng: Coi là "cùng hàng" nếu Y của panel mới
                    # nằm trong phạm vi 50% chiều cao của mốc hàng.
                    threshold = row_anchor_height * 0.5 
                    
                    if panel_y < (row_anchor_y + threshold):
                        # CÙNG HÀNG: Thêm vào hàng hiện tại
                        current_row.append(panel)
                        # Cập nhật lại mốc Y và chiều cao (dùng giá trị trung bình)
                        all_y = [p[1] for p in current_row]
                        all_h = [p[3] for p in current_row]
                        row_anchor_y = sum(all_y) / len(all_y)
                        row_anchor_height = sum(all_h) / len(all_h)
                    else:
                        # HÀNG MỚI: Hàng cũ kết thúc, bắt đầu hàng mới
                        rows.append(current_row) # Lưu hàng cũ
                        current_row = [panel]    # Hàng mới
                        row_anchor_y = panel_y   # Đặt lại mốc Y
                        row_anchor_height = panel[3] # Đặt lại mốc chiều cao
                
                # Lưu hàng cuối cùng
                if current_row:
                    rows.append(current_row)

            # 3. Sắp xếp X bên trong mỗi hàng và làm phẳng danh sách
            sorted_panels = []
            for i, row in enumerate(rows):
                # Sắp xếp các panel trong hàng này theo tọa độ X
                row.sort(key=lambda coord: coord[0])
                sorted_panels.extend(row) # Thêm vào danh sách cuối cùng
            
            panel_coords = sorted_panels # Gán lại danh sách đã sắp xếp
            # --- HẾT LOGIC SẮP XẾP MỚI ---
            
    except Exception as e:
        print(f"[PY][ERROR] Panel sorting failed: {str(e)}", file=sys.stderr)
    # =======================================
    t_end_sort = time.perf_counter()
    print(f"[TIMING] 2. Sort Panels: {t_end_sort - t_start_sort:.3f}s", file=sys.stderr)
    
    t_start_format = time.perf_counter()
    # Format kết quả (Giữ nguyên)
    panels_final = []
    for i, (px, py, pw, ph) in enumerate(panel_coords):
        panel_info = {"id": i + 1, "x": px, "y": py, "w": pw, "h": ph}
        cv2.rectangle(result_img, (px, py), (px + pw, py + ph), (0, 0, 255), 3)
        cv2.putText(result_img, f'P{panel_info["id"]}', (px + 5, py + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        panels_final.append(panel_info)

    duration_ms = int((time.time() - start_time) * 1000)

    annotated = encode_image_to_base64(result_img)
    t_end_format = time.perf_counter()
    print(f"[TIMING] 3. Format & Encode: {t_end_format - t_start_format:.3f}s", file=sys.stderr)
    
    t_end_total = time.perf_counter()
    print(f"[TIMING] TOTAL STEPS FOR PANEL DETECTION: {t_end_total - start_total:.3f}s", file=sys.stderr)
    
    return {
        "panelCount": len(panels_final),
        "panels": panels_final,
        "annotatedImageBase64": annotated,
        "width": int(w),
        "height": int(h),
        "processingTime": duration_ms,
        "detectionMethod": method
    }


# --- HÀM MAIN --- (Giữ nguyên)
def main():
    sys.stdout.reconfigure(encoding='utf-8')
    
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Thiếu đường dẫn ảnh"})); sys.exit(1)

    image_path = sys.argv[1]
    model_path = sys.argv[2] if len(sys.argv) > 2 else None
    use_yolo = True
    if len(sys.argv) > 3:
        use_yolo = sys.argv[3].lower() != 'opencv'
    
    try:
        image = read_image_bgr(image_path)
        result = detect(image, use_yolo=use_yolo, model_path=model_path)
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