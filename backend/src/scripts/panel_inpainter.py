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
                if len(cnt) < 5:
                    hull = cv2.convexHull(cnt)
                    cv2.drawContours(final_mask, [hull], -1, 255, -1)
                    continue
                
                hull = cv2.convexHull(cnt, returnPoints=False)
                hull_points = cv2.convexHull(cnt)
                
                hull_area = cv2.contourArea(hull_points)
                contour_area = cv2.contourArea(cnt)
                
                if hull_area == 0:
                    cv2.drawContours(final_mask, [cnt], -1, 255, -1)
                    continue
                
                convexity = contour_area / hull_area
                
                hull_perimeter = cv2.arcLength(hull_points, True)
                contour_perimeter = cv2.arcLength(cnt, True)
                
                if hull_perimeter == 0:
                    perimeter_ratio = 1.0
                else:
                    perimeter_ratio = contour_perimeter / hull_perimeter
                
                defects = cv2.convexityDefects(cnt, hull)
                max_depth = 0
                
                if defects is not None:
                    for i in range(defects.shape[0]):
                        s, e, f, d = defects[i, 0]
                        depth = d / 256.0
                        if depth > max_depth:
                            max_depth = depth
                
                x, y, bw, bh = cv2.boundingRect(hull_points)
                bubble_size = max(bw, bh)
                
                has_spikes = False
                spike_type = "NONE"
                
                # ⭐ ĐIỀU CHỈNH NGƯỠNG
                
                # Điều kiện 1: Gai dài (Convexity Defects)
                if max_depth > 8:  # Giảm từ 10 xuống 8
                    has_spikes = True
                    spike_type = "LONG"
                
                # Điều kiện 2: Gai ngắn dày đặc (Perimeter Ratio)
                elif perimeter_ratio > 1.04:  # ⭐ GIẢM TỪ 1.15 XUỐNG 1.04
                    has_spikes = True
                    spike_type = "SHORT"
                
                # Điều kiện 3: Độ lồi thấp (Convexity)
                elif convexity < 0.92:  # Nới lỏng từ 0.90 lên 0.92
                    has_spikes = True
                    spike_type = "ROUGH"
                
                # ⭐ TĂNG OFFSET CHO GẠI NGẮN
                if has_spikes:
                    if spike_type == "LONG":
                        offset_ratio = 0.15
                        offset_px = int(bubble_size * offset_ratio)
                        offset_px = max(20, min(offset_px, 40))
                    else:
                        # ⭐ TĂNG OFFSET TỪ 18-30 LÊN 22-35
                        offset_ratio = 0.14  # Tăng từ 0.12 lên 0.14
                        offset_px = int(bubble_size * offset_ratio)
                        offset_px = max(22, min(offset_px, 35))  # Tăng min từ 18→22, max từ 30→35
                    
                    sys.stderr.write(
                        f"[PY] ⚡ SPIKY bubble {bw}x{bh}px "
                        f"(type={spike_type}, depth={max_depth:.1f}px, "
                        f"convexity={convexity:.3f}, perimeter_ratio={perimeter_ratio:.3f}) "
                        f"→ offset={offset_px}px\n"
                    )
                else:
                    offset_ratio = 0.08
                    offset_px = int(bubble_size * offset_ratio)
                    offset_px = max(10, min(offset_px, 20))
                    
                    sys.stderr.write(
                        f"[PY] ⚪ SMOOTH bubble {bw}x{bh}px "
                        f"(depth={max_depth:.1f}px, convexity={convexity:.3f}, "
                        f"perimeter_ratio={perimeter_ratio:.3f}) → offset={offset_px}px\n"
                    )
                
                expanded_hull = expand_contour_with_offset(hull_points, offset_px=offset_px)
                final_hull = cv2.convexHull(expanded_hull)
                cv2.drawContours(final_mask, [final_hull], -1, 255, -1)
    
    final_mask = cv2.GaussianBlur(final_mask, (5, 5), 0)
    _, final_mask = cv2.threshold(final_mask, 127, 255, cv2.THRESH_BINARY)
    
    return final_mask

def smart_crop_inpaint(image, mask, lama_model):
    h_orig, w_orig = image.shape[:2]
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    result_image = image.copy()
    
    if not contours:
        return result_image

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        
        bubble_size = max(w, h)
        
        # ⭐ BƯỚC 1: Tính padding cơ bản theo bubble
        if bubble_size < 60:
            base_padding = 40   # Bubble cực nhỏ (text ngắn)
        elif bubble_size < 100:
            base_padding = 60   
        elif bubble_size < 200:
            base_padding = 80   
        elif bubble_size < 350:
            base_padding = 100  
        elif bubble_size < 500:
            base_padding = 130  
        else:
            base_padding = 160  
        
        # ⭐ BƯỚC 2: Giới hạn theo ảnh 
        max_padding_from_image = min(h_orig, w_orig) * 0.25
        
        # ⭐ BƯỚC 3: Áp dụng giới hạn NHƯNG ƯU TIÊN bubble lớn
        if bubble_size >= 300:  # Bubble lớn (>= 300px)
            # Cho phép padding lớn hơn, tối thiểu 100px
            padding = max(100, min(base_padding, int(max_padding_from_image)))
        else:  # Bubble nhỏ/trung bình
            padding = min(base_padding, int(max_padding_from_image))
        
        # ⭐ BƯỚC 4: Padding tối thiểu linh động
        min_padding = min(40, bubble_size // 2)  # Tối thiểu = 50% kích thước bubble
        padding = max(min_padding, padding)
        
        # Log chi tiết
        sys.stderr.write(
            f"[PY] Bubble {w}x{h}px → base={base_padding}px, "
            f"max_allowed={int(max_padding_from_image)}px, "
            f"final={padding}px (image={w_orig}x{h_orig})\n"
        )
        
        # Tính toán vùng crop (đảm bảo không vượt quá biên ảnh)
        x1 = max(0, x - padding)
        y1 = max(0, y - padding)
        x2 = min(w_orig, x + w + padding)
        y2 = min(h_orig, y + h + padding)
        
        # Cắt ảnh con (ROI - Region of Interest)
        roi_img = result_image[y1:y2, x1:x2]
        roi_mask = mask[y1:y2, x1:x2]
        
        # Nếu vùng crop quá nhỏ hoặc rỗng, bỏ qua
        if roi_img.size == 0 or roi_mask.size == 0: 
            continue

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
            sys.stderr.write(f"[PY][WARN] Failed to inpaint bubble (w={w}, h={h}, padding={padding}): {e}\n")
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