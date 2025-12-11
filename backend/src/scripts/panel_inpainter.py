import sys
import json
import base64
import cv2
import numpy as np
import traceback
import os
from PIL import Image

# --- 1. MONKEY PATCH CHO PILLOW ---
if not hasattr(Image, 'ANTIALIAS'):
    Image.ANTIALIAS = Image.Resampling.LANCZOS

# --- 2. KHỞI TẠO ---
try:
    from simple_lama_inpainting import SimpleLama
    LAMA_AVAILABLE = True
except ImportError:
    LAMA_AVAILABLE = False

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SEG_MODEL_PATH = os.path.join(CURRENT_DIR, 'models', 'speech-bubble-seg.pt')

def load_models():
    lama = None
    seg_model = None
    error = None

    if not LAMA_AVAILABLE: return None, None, "Thiếu thư viện simple-lama-inpainting"
    if not YOLO_AVAILABLE: return None, None, "Thiếu thư viện ultralytics"

    try:
        sys.stderr.write("[PY] Đang tải model LaMa...\n")
        lama = SimpleLama()
        
        if os.path.exists(SEG_MODEL_PATH):
            sys.stderr.write(f"[PY] Đang tải Segmentation: {SEG_MODEL_PATH}\n")
            seg_model = YOLO(SEG_MODEL_PATH)
        else:
            sys.stderr.write(f"[PY][WARNING] Không tìm thấy {SEG_MODEL_PATH}. Dùng yolov8n-seg.pt...\n")
            seg_model = YOLO("yolov8n-seg.pt")
    except Exception as e:
        error = str(e)

    return lama, seg_model, error

def base64_to_image(b64_string):
    try:
        img_data = base64.b64decode(b64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except: return None

def image_to_base64(image_bgr):
    _, buffer = cv2.imencode('.jpg', image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    return base64.b64encode(buffer).decode('utf-8')

def expand_contour_with_offset(contour, offset_px=20):
    """
    Mở rộng contour ra ngoài bằng cách offset theo pháp tuyến
    """
    # Tính tâm của contour
    M = cv2.moments(contour)
    if M['m00'] == 0:
        return contour
    
    cx = int(M['m10'] / M['m00'])
    cy = int(M['m01'] / M['m00'])
    center = np.array([cx, cy])
    
    # Mở rộng mỗi điểm theo hướng từ tâm ra ngoài
    expanded_points = []
    for point in contour:
        pt = point[0]
        # Vector từ tâm đến điểm
        vec = pt - center
        vec_norm = vec / (np.linalg.norm(vec) + 1e-6)
        # Điểm mới = điểm cũ + offset theo hướng ra ngoài
        new_pt = pt + (vec_norm * offset_px).astype(int)
        expanded_points.append(new_pt)
    
    return np.array(expanded_points).reshape(-1, 1, 2)

def get_bubble_mask_yolo(image_bgr, model):
    h, w = image_bgr.shape[:2]
    final_mask = np.zeros((h, w), dtype=np.uint8)

    results = model.predict(image_bgr, conf=0.2, iou=0.4, retina_masks=True, verbose=False)
    
    if results[0].masks is not None:
        masks = results[0].masks.data.cpu().numpy()
        for m in masks:
            m_resized = cv2.resize(m, (w, h))
            binary_mask = (m_resized > 0.5).astype(np.uint8) * 255
            
            contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for cnt in contours:
                if len(cnt) < 3:
                    continue
                
                # BƯỚC 1: Tạo Convex Hull
                hull = cv2.convexHull(cnt)
                
                # BƯỚC 2: Mở rộng hull ra ngoài 20-25px (để bao cả gai)
                expanded_hull = expand_contour_with_offset(hull, offset_px=25)
                
                # BƯỚC 3: Tạo Convex Hull mới từ điểm đã mở rộng
                final_hull = cv2.convexHull(expanded_hull)
                
                # Vẽ vào mask
                cv2.drawContours(final_mask, [final_hull], -1, 255, -1)
    
    # Làm mịn nhẹ
    final_mask = cv2.GaussianBlur(final_mask, (5, 5), 0)
    _, final_mask = cv2.threshold(final_mask, 127, 255, cv2.THRESH_BINARY)
    
    return final_mask

def smart_crop_inpaint(image, mask, lama_model):
    """
    Kỹ thuật: Cắt vùng nhỏ quanh bong bóng để inpaint nhằm giữ độ nét,
    sau đó dán ngược lại ảnh gốc.
    """
    h_orig, w_orig = image.shape[:2]
    
    # 1. Tìm các vùng bong bóng riêng biệt (contours)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Tạo ảnh kết quả (copy từ ảnh gốc)
    result_image = image.copy()
    
    if not contours:
        return result_image # Không có gì để xóa

    # 2. Duyệt qua từng bong bóng để xử lý riêng
    padding = 100 # Lấy rộng ra 100px để LaMa có ngữ cảnh vẽ nền
    
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        
        # Tính toán vùng crop (đảm bảo không vượt quá biên ảnh)
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(w_orig, x + w + padding)
        y2 = min(h_orig, y + h + padding)
        
        # Cắt ảnh con (ROI - Region of Interest)
        roi_img = result_image[y1:y2, x1:x2]
        roi_mask = mask[y1:y2, x1:x2]
        
        # Nếu vùng crop quá nhỏ hoặc rỗng, bỏ qua
        if roi_img.size == 0 or roi_mask.size == 0: continue

        # Chuyển sang PIL cho LaMa
        roi_pil = Image.fromarray(cv2.cvtColor(roi_img, cv2.COLOR_BGR2RGB))
        mask_pil = Image.fromarray(roi_mask)
        
        try:
            # CHẠY LAMA TRÊN ẢNH NHỎ (Độ nét cao)
            roi_result_pil = lama_model(roi_pil, mask_pil)
            
            # Chuyển về OpenCV
            roi_result_bgr = cv2.cvtColor(np.array(roi_result_pil), cv2.COLOR_RGB2BGR)
            
            # Dán đè vùng đã xử lý vào ảnh lớn
            # Lưu ý: LaMa có thể resize ảnh con một chút, cần resize về đúng kích thước ROI
            if roi_result_bgr.shape[:2] != roi_img.shape[:2]:
                 roi_result_bgr = cv2.resize(roi_result_bgr, (roi_img.shape[1], roi_img.shape[0]))
                 
            result_image[y1:y2, x1:x2] = roi_result_bgr
            
        except Exception as e:
            sys.stderr.write(f"[PY][WARN] Failed to inpaint region: {e}\n")
            continue

    return result_image

def process_inpainting(data, lama_model, seg_model):
    img_b64 = data.get('imageB64')
    if not img_b64: return {"success": False, "error": "Thiếu imageB64"}

    image = base64_to_image(img_b64)
    if image is None: return {"success": False, "error": "Lỗi Base64"}

    try:
        # 1. Tìm Mask toàn cục
        mask = get_bubble_mask_yolo(image, seg_model)
        
        if np.count_nonzero(mask) == 0:
            return {
                "success": True, 
                "inpaintedImageB64": img_b64, 
                "message": "Không tìm thấy bong bóng (YOLO)"
            }

        # 2. Inpaint thông minh (theo từng vùng crop)
        # Thay vì đưa cả ảnh to vào LaMa, ta dùng hàm smart_crop_inpaint
        result_bgr = smart_crop_inpaint(image, mask, lama_model)
        
        output_b64 = image_to_base64(result_bgr)
        
        return {
            "success": True,
            "inpaintedImageB64": output_b64
        }
    except Exception as e:
        sys.stderr.write(f"[PY][ERROR] Logic failed: {str(e)}\n")
        return {"success": False, "error": str(e)}

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    lama, seg_model, error = load_models()
    if error:
        print(json.dumps({"error": error})); sys.exit(1)

    try:
        input_stream = sys.stdin.read()
        if not input_stream: return
        request_data = json.loads(input_stream)
        output_results = []

        for file_info in request_data.get('filesData', []):
            processed_panels = []
            for panel in file_info.get('panels', []):
                sys.stderr.write(f"[PY] Processing {file_info.get('fileName')} - P{panel.get('panelId')}...\n")
                result = process_inpainting(panel, lama, seg_model)
                processed_panels.append({"panelId": panel.get('panelId'), **result})
            output_results.append({"fileName": file_info.get('fileName'), "panels": processed_panels})

        print(json.dumps({"data": output_results}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)})); sys.exit(1)

if __name__ == "__main__":
    main()