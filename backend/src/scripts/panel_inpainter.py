import sys
import json
import base64
import cv2
import numpy as np
import traceback
import os
import time
from PIL import Image

# Monkey-patch Pillow cho tương thích các phiên bản
if not hasattr(Image, 'ANTIALIAS'):
    Image.ANTIALIAS = Image.Resampling.LANCZOS

# --- KHỞI TẠO ---
# `simple_lama_inpainting` (LaMa) là tùy chọn. Nếu chưa cài, script vẫn chạy
# nhưng tính năng inpainting sẽ bị vô hiệu. Cài bằng: `pip install simple-lama-inpainting`.
try:
    from simple_lama_inpainting import SimpleLama  # type: ignore[import]
    LAMA_AVAILABLE = True
except ImportError:
    LAMA_AVAILABLE = False

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SEG_MODEL_PATH = os.path.join(CURRENT_DIR, 'models', 'finetune_detect.pt')

def load_models():
    lama = None
    seg_model = None
    error = None

    if not LAMA_AVAILABLE: return None, None, "Thiếu thư viện simple-lama-inpainting"
    if not YOLO_AVAILABLE: return None, None, "Thiếu thư viện ultralytics"

    try:
        lama = SimpleLama()
        
        if os.path.exists(SEG_MODEL_PATH):
            seg_model = YOLO(SEG_MODEL_PATH)
        else:
            sys.stderr.write(f"[PY][WARNING] Không tìm thấy {SEG_MODEL_PATH}. Dùng yolov8n-seg.pt...\n")
            seg_model = YOLO("yolov8n-seg.pt")
    except Exception as e:
        error = str(e)

    return lama, seg_model, error

# Chuyển Base64 -> OpenCV BGR image
def base64_to_image(b64_string):
    try:
        img_data = base64.b64decode(b64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except:
        return None

def base64_to_image(b64_string):
    try:
        img_data = base64.b64decode(b64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except: return None

def image_to_base64(image_bgr):
    _, buffer = cv2.imencode('.jpg', image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
    return base64.b64encode(buffer).decode('utf-8')


# Mở rộng contour bằng offset để bao phủ vùng xung quanh (dùng cho mask)

def expand_contour_with_offset(contour, offset_px=10):
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
    offset_px = 35

    results = model.predict(image_bgr, conf=0.3, iou=0.4, retina_masks=True, verbose=False)
    
    if results[0].masks is not None:
        classes = results[0].boxes.cls.cpu().numpy()
        masks = results[0].masks.data.cpu().numpy()
        for i, m in enumerate(masks):
            cls_id = int(classes[i])
            if cls_id != 1:
                continue
            m_resized = cv2.resize(m, (w, h))
            binary_mask = (m_resized > 0.5).astype(np.uint8) * 255

            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (offset_px, offset_px))
            dilated_mask = cv2.dilate(binary_mask, kernel, iterations=1)
            
            contours, _ = cv2.findContours(dilated_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for cnt in contours:
                cv2.drawContours(final_mask, [cnt], -1, 255, -1)
    
    # Làm mịn nhẹ
    final_mask = cv2.GaussianBlur(final_mask, (5, 5), 0)
    _, final_mask = cv2.threshold(final_mask, 127, 255, cv2.THRESH_BINARY)
    
    return final_mask

# Tạo mask vùng chữ từ kết quả Vision API (text_blocks là danh sách vertices)

def get_text_mask_vision(image_shape, text_blocks):
    """
    Tạo mask từ danh sách textBlocks của Vision API
    """
    h, w = image_shape[:2]
    text_mask = np.zeros((h, w), dtype=np.uint8)
    
    if not text_blocks:
        return text_mask

    for block in text_blocks:
        vertices = block.get('vertices', [])
        if len(vertices) < 3: continue
        
        # Chuyển đổi tọa độ thành numpy array
        pts = np.array([[int(v.get('x', 0)), int(v.get('y', 0))] for v in vertices], np.int32)
        
        # Vẽ đa giác màu trắng
        cv2.fillPoly(text_mask, [pts], 255)

    # Phình mask ra để xóa sạch viền chữ (đặc biệt là SFX có viền màu)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 20))
    text_mask = cv2.dilate(text_mask, kernel, iterations=1)
    
    return text_mask


# Thực hiện quy trình inpainting cho một panel:
# - Tạo mask (bong bóng + chữ)
# - Nếu có mask, gọi LaMa để phục hồi ảnh
# - Trả về Base64 kết quả hoặc lỗi

def process_inpainting(data, lama_model, seg_model):
    img_b64 = data.get('imageB64')
    if not img_b64: return {"success": False, "error": "Thiếu imageB64"}

    image = base64_to_image(img_b64)
    if image is None: return {"success": False, "error": "Lỗi Base64"}

    try:
        t_start_mask = time.perf_counter() # Đo thời gian gộp Mask
        # 1. Tìm Mask bong bóng (YOLO)
        bubble_mask = get_bubble_mask_yolo(image, seg_model)
        
        # 2. Tạo mask cho vùng chữ lấy từ textBlocks.
        text_blocks = data.get('textBlocks', [])
        vision_mask = get_text_mask_vision(image.shape, text_blocks)

        # 3. GỘP CẢ 2 MASK LẠI (Phép cộng)
        combined_mask = cv2.bitwise_or(bubble_mask, vision_mask)
        t_end_mask = time.perf_counter()
        print(f"[TIMING] 2a. Make Mask (YOLO Seg + Vision): {t_end_mask - t_start_mask:.3f}s", file=sys.stderr)
                
        if np.count_nonzero(combined_mask) == 0:
            return {"success": True, "inpaintedImageB64": img_b64, "message": "Không tìm thấy nội dung cần xóa"}

        # 4. Inpaint bằng LaMa
        t_start_lama = time.perf_counter() # Đo thời gian LaMa chạy
        image_pil = Image.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        mask_pil = Image.fromarray(combined_mask)
        result_pil = lama_model(image_pil, mask_pil)
        t_end_lama = time.perf_counter()
        print(f"[TIMING] 2b. Restore Image (LaMa Inpaint): {t_end_lama - t_start_lama:.3f}s", file=sys.stderr)
        print(f"[TIMING] 2. TOTAL STEPS FOR IMAGE CLEANUP: {t_end_lama - t_start_mask:.3f}s", file=sys.stderr)
        
        result_bgr = cv2.cvtColor(np.array(result_pil), cv2.COLOR_RGB2BGR)
        output_b64 = image_to_base64(result_bgr)
        
        return {"success": True, "inpaintedImageB64": output_b64}
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