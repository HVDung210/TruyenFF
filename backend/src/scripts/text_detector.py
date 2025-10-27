import sys
import json
import base64
import traceback
from typing import Tuple, Dict, Any, List, Optional
import cv2
import numpy as np
import os
import time
import subprocess
import tempfile
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
        print(f"[PY] read_image_bgr path=\"{path}\" exists={file_exists} size={file_size}", file=sys.stderr)
        
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
    """Encode ảnh thành base64 string"""
    ok, buffer = cv2.imencode('.jpg', image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok: 
        raise ValueError("Lỗi encode ảnh")
    return base64.b64encode(buffer.tobytes()).decode('utf-8')

def crop_panel(image_bgr: np.ndarray, x: int, y: int, w: int, h: int) -> np.ndarray:
    """Crop panel từ ảnh gốc"""
    return image_bgr[y:y+h, x:x+w]

def call_vision_api(image_base64: str, credentials_path: str) -> Dict[str, Any]:
    """Gọi Google Cloud Vision API để detect text"""
    try:
        # Tạo file tạm để lưu ảnh
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            # Decode base64 và lưu vào file tạm
            image_data = base64.b64decode(image_base64)
            temp_file.write(image_data)
            temp_file_path = temp_file.name
        
        # Gọi Node.js script để sử dụng Vision API
        node_script_path = os.path.join(os.path.dirname(__file__), 'vision_text_detector.js')
        
        cmd = [
            'node', 
            node_script_path,
            temp_file_path,
            credentials_path
        ]
        
        print(f"[PY] Calling Vision API with cmd: {' '.join(cmd)}", file=sys.stderr)
        
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            timeout=30,
            cwd=os.path.dirname(__file__),
            encoding='utf-8',
            errors='replace'
        )
        
        # Cleanup temp file
        try:
            os.unlink(temp_file_path)
        except:
            pass
        
        if result.returncode != 0:
            print(f"[PY][ERROR] Vision API call failed: {result.stderr}", file=sys.stderr)
            raise RuntimeError(f"Vision API call failed: {result.stderr}")
        
        # Parse JSON response
        if not result.stdout:
            print(f"[PY][ERROR] Vision API returned empty stdout", file=sys.stderr)
            raise RuntimeError("Vision API returned empty response")
        
        # Debug stdout content
        print(f"[PY] Raw stdout length: {len(result.stdout)}", file=sys.stderr)
        print(f"[PY] Raw stdout preview: {repr(result.stdout[:200])}", file=sys.stderr)
            
        try:
            response = json.loads(result.stdout)
            print(f"[PY] Vision API response parsed successfully", file=sys.stderr)
        except json.JSONDecodeError as e:
            print(f"[PY][ERROR] JSON decode error: {e}", file=sys.stderr)
            print(f"[PY][ERROR] Raw stdout: {result.stdout}", file=sys.stderr)
            raise RuntimeError(f"Failed to parse Vision API response: {e}")
        
        return response
        
    except subprocess.TimeoutExpired:
        print(f"[PY][ERROR] Vision API call timeout", file=sys.stderr)
        raise RuntimeError("Vision API call timeout")
    except json.JSONDecodeError as e:
        print(f"[PY][ERROR] Failed to parse Vision API response: {e}", file=sys.stderr)
        print(f"[PY][ERROR] Raw response: {result.stdout}", file=sys.stderr)
        raise RuntimeError(f"Failed to parse Vision API response: {e}")
    except Exception as e:
        print(f"[PY][ERROR] Vision API call error: {str(e)}", file=sys.stderr)
        raise


# --- YOLOv12 PANEL DETECTION (MỚI) ---
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
            print("[PY] Using default YOLOv12 model path...", file=sys.stderr)
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


# --- FALLBACK: OPENCV PANEL DETECTION (ĐÃ CẬP NHẬT) ---
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


# --- HÀM ĐIỀU PHỐI CHÍNH (ĐÃ CẬP NHẬT) ---
def detect_text_in_comic(image_bgr: np.ndarray, credentials_path: str, model_path: Optional[str] = None) -> Dict[str, Any]:
    """Detect text trong comic bằng cách phân tích từng panel"""
    start_time = time.time()
    original = image_bgr.copy()
    h, w, _ = original.shape

    # Detect panels (SỬ DỤNG LOGIC MỚI)
    panel_coords = []
    method = ""
    if YOLO_AVAILABLE:
        print("[PY] Using YOLOv12 for panel detection", file=sys.stderr)
        panel_coords = detect_panels_yolo(original, model_path)
        method = "YOLOv12"
    else:
        print("[PY] Using OpenCV for panel detection (fallback)", file=sys.stderr)
        panel_coords = detect_panels_opencv(original)
        method = "OpenCV"
    
    panels_with_text = []
    
    print(f"[PY] Detected {len(panel_coords)} panels using {method}", file=sys.stderr)
    
    for i, (px, py, pw, ph) in enumerate(panel_coords):
        print(f"[PY] Processing panel {i+1}: x={px}, y={py}, w={pw}, h={ph}", file=sys.stderr)
        
        # Crop panel
        panel_image = crop_panel(original, px, py, pw, ph)
        
        # Encode panel thành base64
        panel_base64 = encode_image_to_base64(panel_image)
        
        try:
            # Gọi Vision API cho panel này
            vision_result = call_vision_api(panel_base64, credentials_path)
            
            panel_info = {
                "id": i + 1,
                "x": px, 
                "y": py, 
                "w": pw, 
                "h": ph,
                "textDetected": len(vision_result.get('textAnnotations', [])) > 0,
                "textAnnotations": vision_result.get('textAnnotations', []),
                "fullTextAnnotation": vision_result.get('fullTextAnnotation', {}),
                "textContent": vision_result.get('fullTextAnnotation', {}).get('text', '')
            }
            
            panels_with_text.append(panel_info)
            
            print(f"[PY] Panel {i+1} text detection completed. Text found: {panel_info['textDetected']}", file=sys.stderr)
            
        except Exception as e:
            print(f"[PY][ERROR] Failed to process panel {i+1}: {str(e)}", file=sys.stderr)
            # Vẫn thêm panel nhưng không có text
            panel_info = {
                "id": i + 1,
                "x": px, 
                "y": py, 
                "w": pw, 
                "h": ph,
                "textDetected": False,
                "textAnnotations": [],
                "fullTextAnnotation": {},
                "textContent": "",
                "error": str(e)
            }
            panels_with_text.append(panel_info)

    # Tạo ảnh annotated
    result_img = original.copy()
    for panel in panels_with_text:
        px, py, pw, ph = panel['x'], panel['y'], panel['w'], panel['h']
        color = (0, 255, 0) if panel['textDetected'] else (0, 0, 255)  # Xanh nếu có text, đỏ nếu không
        cv2.rectangle(result_img, (px, py), (px + pw, py + ph), color, 3)
        cv2.putText(result_img, f'P{panel["id"]}', (px + 5, py + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
    duration_ms = int((time.time() - start_time) * 1000)
    annotated = encode_image_to_base64(result_img)
    
    # Tổng hợp tất cả text
    all_text = []
    for panel in panels_with_text:
        if panel['textContent']:
            all_text.append(panel['textContent'])
    
    return {
        "panelCount": len(panels_with_text),
        "panels": panels_with_text,
        "annotatedImageBase64": annotated,
        "width": int(w),
        "height": int(h),
        "processingTime": duration_ms,
        "detectionMethod": method, # Thêm phương thức đã dùng
        "totalTextDetected": len([p for p in panels_with_text if p['textDetected']]),
        "allText": "\n".join(all_text),
        "summary": {
            "totalPanels": len(panels_with_text),
            "panelsWithText": len([p for p in panels_with_text if p['textDetected']]),
            "panelsWithoutText": len([p for p in panels_with_text if not p['textDetected']])
        }
    }


# --- HÀM MAIN (ĐÃ CẬP NHẬT) ---
def main():
    sys.stdout.reconfigure(encoding='utf-8')
    print(f"[PY] Text detector script started with {len(sys.argv)} arguments", file=sys.stderr)
    
    if len(sys.argv) < 3:
        print("[PY][ERROR] Thiếu đường dẫn ảnh hoặc credentials", file=sys.stderr)
        print(json.dumps({"error": "Usage: python text_detector.py <image_path> <credentials_path> [model_path]"}))
        sys.exit(1)

    image_path = sys.argv[1]
    credentials_path = sys.argv[2]
    model_path = sys.argv[3] if len(sys.argv) > 3 else None # Thêm model_path
    
    print(f"[PY] Start text detection image=\"{image_path}\" credentials=\"{credentials_path}\" model=\"{model_path}\"", file=sys.stderr)
    
    try:
        print(f"[PY] Bước 1: Đọc ảnh từ {image_path}", file=sys.stderr)
        image = read_image_bgr(image_path)
        
        print(f"[PY] Bước 2: Bắt đầu detect text trong comic", file=sys.stderr)
        result = detect_text_in_comic(image, credentials_path, model_path) # Truyền model_path
        
        print(f"[PY] Bước 3: Hoàn thành xử lý, trả về kết quả", file=sys.stderr)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(0)
        
    except FileNotFoundError as e:
        print(f"[PY][ERROR] FileNotFoundError: {str(e)}", file=sys.stderr)
        print(json.dumps({"error": "File không tồn tại", "details": str(e)}))
        sys.exit(2)
    except ValueError as e:
        print(f"[PY][ERROR] ValueError: {str(e)}", file=sys.stderr)
        print(json.dumps({"error": "Lỗi dữ liệu ảnh", "details": str(e)}))
        sys.exit(2)
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"[PY][ERROR] Unexpected error: {str(e)}", file=sys.stderr)
        print(f"[PY][ERROR] Traceback: {error_details}", file=sys.stderr)
        print(json.dumps({"error": "Script Python xử lý ảnh thất bại", "details": error_details}))
        sys.exit(2)

if __name__ == '__main__':
    main()