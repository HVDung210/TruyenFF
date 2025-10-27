# Hướng dẫn cài đặt YOLOv12 Panel Detection

## Tổng quan

YOLOv12 model từ [Hugging Face](https://huggingface.co/mosesb/best-comic-panel-detection) được training trên custom dataset với **mAP50-95: 0.985**, cải thiện đáng kể so với phương pháp OpenCV cơ bản.

## Ưu điểm YOLOv12

### So với OpenCV (phương pháp cũ):

| Tiêu chí | OpenCV | YOLOv12 |
|----------|---------|---------|
| **Độ chính xác** | ~70-80% | **98.5%** (mAP50-95) |
| **Panel không chuẩn** | Kém | Tốt |
| **Panel chồng lấp** | Rất kém | Tốt |
| **Tốc độ** | Nhanh (~10ms) | Trung bình (~100-200ms) |
| **Cần training** | Không | Có (đã trained) |

### Khả năng:
- ✅ Phát hiện panels với độ chính xác cao
- ✅ Xử lý được panels không hình chữ nhật
- ✅ Xử lý được panels chồng lấp
- ✅ Robust với nhiều style comic khác nhau
- ✅ Confidence score cho mỗi panel

## Cài đặt

### Bước 1: Cài đặt dependencies

```bash
cd backend

# Sử dụng pip
pip install -r requirements-yolo.txt

# Hoặc từng package
pip install ultralytics torch torchvision pillow opencv-python numpy huggingface-hub
```

### Bước 2: Download YOLO model

**Option 1: Tự động download khi chạy**
```bash
cd src/scripts
python download_yolo_model.py
```

**Option 2: Model sẽ tự động download lần đầu sử dụng**
- Script sẽ tự động download từ Hugging Face
- Model được cache tại `~/.cache/ultralytics/`

### Bước 3: Test model

```bash
cd src/scripts
python panel_detector_yolo.py path/to/comic.jpg
```

## Sử dụng

### 1. Standalone Script

```bash
# Sử dụng YOLOv12 (mặc định)
python panel_detector_yolo.py comic.jpg

# Sử dụng OpenCV (fallback)
python panel_detector_yolo.py comic.jpg none opencv

# Sử dụng custom model path
python panel_detector_yolo.py comic.jpg path/to/best.pt yolo
```

### 2. Python Code

```python
from ultralytics import YOLO
import cv2

# Load model (auto-download nếu chưa có)
model = YOLO('mosesb/best-comic-panel-detection')

# Hoặc load từ file local
# model = YOLO('path/to/best.pt')

# Đọc ảnh
image = cv2.imread('comic.jpg')

# Detect panels
results = model.predict(source=image, conf=0.25, iou=0.45)

# Xử lý kết quả
for result in results:
    boxes = result.boxes
    for box in boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        confidence = box.conf.item()
        print(f"Panel: x={int(x1)}, y={int(y1)}, w={int(x2-x1)}, h={int(y2-y1)}, conf={confidence:.2f}")
```

### 3. Tích hợp vào Backend Service

Script đã có sẵn fallback mechanism:
- Nếu YOLO available → Sử dụng YOLOv12
- Nếu YOLO không available → Fallback về OpenCV

## Cấu hình

### Trong panel_detector_yolo.py:

```python
# Thay đổi confidence threshold
results = model.predict(source=image_bgr, conf=0.25, iou=0.45)
#                                         ^^^^      ^^^^
#                                     Confidence   IoU threshold
```

### Parameters:
- **conf** (0.0-1.0): Minimum confidence score (default: 0.25)
  - Giảm xuống nếu miss panels: `conf=0.15`
  - Tăng lên nếu quá nhiều false positives: `conf=0.35`
  
- **iou** (0.0-1.0): IoU threshold for NMS (default: 0.45)
  - Giảm xuống nếu panels bị merge: `iou=0.35`
  - Tăng lên nếu quá nhiều overlapping detections: `iou=0.55`

## Performance

### Model Metrics (từ Hugging Face):
- **mAP50**: 0.991 (99.1%)
- **mAP50-95**: 0.985 (98.5%)
- **Near-perfect precision and recall**

### Inference Speed:
- **GPU**: ~50-100ms per image
- **CPU**: ~200-500ms per image
- **Batch processing**: Faster per image

### Memory Usage:
- **Model size**: ~130MB (YOLOv12x)
- **RAM usage**: ~2-3GB during inference

## Troubleshooting

### 1. ImportError: No module named 'ultralytics'

```bash
pip install ultralytics
```

### 2. Model download fails

```bash
# Manual download
pip install huggingface-hub
python download_yolo_model.py
```

### 3. CUDA/GPU issues

```bash
# CPU-only version
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
```

### 4. Script fallback to OpenCV

Check logs:
```
[PY][WARNING] Ultralytics not installed. Using fallback OpenCV method.
```

Install ultralytics to enable YOLO.

## So sánh kết quả

### OpenCV (Cũ):
```json
{
  "panelCount": 3,
  "detectionMethod": "OpenCV",
  "processingTime": 10
}
```

### YOLOv12 (Mới):
```json
{
  "panelCount": 5,
  "detectionMethod": "YOLOv12",
  "processingTime": 150
}
```

YOLOv12 phát hiện được 2 panels mà OpenCV bỏ sót!

## Best Practices

1. **Sử dụng YOLOv12 cho production** - Độ chính xác cao hơn đáng kể
2. **Giữ OpenCV làm fallback** - Đảm bảo service không bị down
3. **Cache model** - Download một lần, sử dụng nhiều lần
4. **Batch processing** - Xử lý nhiều ảnh cùng lúc nhanh hơn
5. **Monitor performance** - Track accuracy và speed

## Links

- **Model**: https://huggingface.co/mosesb/best-comic-panel-detection
- **Ultralytics Docs**: https://docs.ultralytics.com/
- **YOLOv12**: https://github.com/ultralytics/ultralytics

## Kết luận

YOLOv12 model cung cấp độ chính xác cao hơn nhiều (98.5% mAP50-95) so với phương pháp OpenCV cơ bản. Mặc dù chậm hơn một chút, nhưng độ chính xác cải thiện đáng kể giúp ứng dụng hoạt động tốt hơn với nhiều loại comic khác nhau.

