import sys
import json
import cv2
import numpy as np
import base64
import os

try:
    from ultralytics import YOLO
except ImportError:
    print(json.dumps({"error": "Thiếu thư viện ultralytics"})); sys.exit(1)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(CURRENT_DIR, 'models', 'speech-bubble-seg.pt')

def load_model():
    if os.path.exists(MODEL_PATH):
        return YOLO(MODEL_PATH)
    return YOLO("yolov8n-seg.pt")

def base64_to_image(b64_string):
    try:
        img_data = base64.b64decode(b64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except: return None

def detect_bubbles_in_panel(image_bgr, model):
    h, w = image_bgr.shape[:2]
    # Logic giống hệt inpainter để đảm bảo tính nhất quán
    results = model.predict(image_bgr, conf=0.2, iou=0.4, retina_masks=True, verbose=False)
    
    bubbles = []
    if results[0].masks is not None:
        masks = results[0].masks.data.cpu().numpy()
        for i, m in enumerate(masks):
            m_resized = cv2.resize(m, (w, h))
            binary_mask = (m_resized > 0.5).astype(np.uint8) * 255
            
            # Lấy contour để vẽ viền (giống logic hiển thị)
            contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            for cnt in contours:
                # Convex Hull để mô phỏng logic inpaint
                hull = cv2.convexHull(cnt)
                
                # Phóng to nhẹ hull để mô phỏng dilation (visualize)
                # Lưu ý: Đây chỉ là visualize, tọa độ trả về để frontend vẽ
                points = hull.reshape(-1, 2).tolist()
                
                bubbles.append({
                    "id": i + 1,
                    "points": points
                })
                
    return bubbles

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    model = load_model()
    
    try:
        input_stream = sys.stdin.read()
        if not input_stream: return
        request_data = json.loads(input_stream)
        
        output_results = []
        
        for file_info in request_data.get('filesData', []):
            processed_panels = []
            for panel in file_info.get('panels', []):
                sys.stderr.write(f"[PY] Detect Bubble: {file_info.get('fileName')} - P{panel.get('panelId')}\n")
                
                img = base64_to_image(panel.get('croppedImageBase64'))
                if img is None:
                    processed_panels.append({"panelId": panel.get('panelId'), "error": "Bad Base64"})
                    continue

                bubbles = detect_bubbles_in_panel(img, model)
                
                processed_panels.append({
                    "panelId": panel.get('panelId'),
                    "bubbles": bubbles,
                    "width": img.shape[1],
                    "height": img.shape[0]
                })
            
            output_results.append({
                "fileName": file_info.get('fileName'),
                "panels": processed_panels
            })

        print(json.dumps({"data": output_results}, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    main()