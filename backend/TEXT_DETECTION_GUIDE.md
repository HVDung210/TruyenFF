# Hướng dẫn sử dụng Cloud Vision API để detect text trong truyện tranh

## Tổng quan

Hệ thống này sử dụng Google Cloud Vision API để phát hiện và đọc text trong các panel của truyện tranh. Quá trình bao gồm:

1. **Panel Detection**: Sử dụng OpenCV để phát hiện các panel trong ảnh comic
2. **Text Detection**: Sử dụng Cloud Vision API để đọc text trong từng panel
3. **Result Processing**: Tổng hợp và format kết quả

## Cài đặt

### 1. Cài đặt dependencies

```bash
cd backend
npm install @google-cloud/vision
```

### 2. Cấu hình Google Cloud

Bạn đã có service account file `truyenff-466701-6d617a31f7b4.json` trong thư mục backend. Đảm bảo service account có các quyền:

- **Cloud Vision API**: Để detect text
- **Cloud Storage**: Để upload/download ảnh (nếu cần)

### 3. Enable Cloud Vision API

Trong Google Cloud Console:
1. Vào **APIs & Services** > **Library**
2. Tìm **Cloud Vision API**
3. Click **Enable**

## Cấu trúc files

```
backend/src/
├── scripts/
│   ├── text_detector.py          # Python script chính
│   ├── vision_text_detector.js   # Node.js script gọi Vision API
│   └── panel_detector.py         # Script gốc (đã có)
├── services/
│   └── textDetectionService.js   # Service layer
├── controllers/
│   └── textDetectionController.js # API controllers
└── routes/
    └── textDetection.js         # API routes
```

## API Endpoints

### 1. Upload và detect text

**POST** `/api/text-detection/detect`

Upload file ảnh comic và detect text trong tất cả panels.

```bash
curl -X POST http://localhost:3000/api/text-detection/detect \
  -F "comicImage=@comic.jpg"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "panelCount": 3,
    "panels": [
      {
        "id": 1,
        "x": 100,
        "y": 200,
        "w": 300,
        "h": 400,
        "textDetected": true,
        "textContent": "Hello world!",
        "textAnnotations": [...],
        "fullTextAnnotation": {...}
      }
    ],
    "annotatedImageBase64": "base64_encoded_image",
    "totalTextDetected": 2,
    "allText": "Hello world!\nHow are you?",
    "summary": {
      "totalPanels": 3,
      "panelsWithText": 2,
      "panelsWithoutText": 1
    }
  }
}
```

### 2. Detect từ URL

**POST** `/api/text-detection/detect-url`

```bash
curl -X POST http://localhost:3000/api/text-detection/detect-url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/comic.jpg"}'
```

### 3. Detect text trong panel cụ thể

**POST** `/api/text-detection/detect-panel`

```bash
curl -X POST http://localhost:3000/api/text-detection/detect-panel \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/comic.jpg",
    "panel": {
      "x": 100,
      "y": 200,
      "w": 300,
      "h": 400
    }
  }'
```

### 4. Batch processing

**POST** `/api/text-detection/batch-detect`

```bash
curl -X POST http://localhost:3000/api/text-detection/batch-detect \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrls": [
      "https://example.com/comic1.jpg",
      "https://example.com/comic2.jpg"
    ]
  }'
```

### 5. Health check

**GET** `/api/text-detection/health`

```bash
curl http://localhost:3000/api/text-detection/health
```

## Sử dụng trực tiếp Python script

Bạn cũng có thể sử dụng trực tiếp Python script:

```bash
cd backend/src/scripts
python text_detector.py "path/to/comic.jpg" "path/to/credentials.json"
```

## Cấu hình và tối ưu

### 1. Panel Detection Parameters

Trong `text_detector.py`, bạn có thể điều chỉnh các tham số:

```python
# Trong hàm detect_panels()
min_area = w * h * 0.01  # Minimum panel area (1% of image)
min_width = w * 0.1      # Minimum panel width (10% of image)
min_height = h * 0.1     # Minimum panel height (10% of image)
```

### 2. Vision API Settings

Trong `vision_text_detector.js`:

```javascript
features: [
    {
        type: 'TEXT_DETECTION',
        maxResults: 50,  // Maximum text annotations
    },
    {
        type: 'DOCUMENT_TEXT_DETECTION',
        maxResults: 1,   // Full document text
    }
]
```

### 3. Image Processing

- **Format hỗ trợ**: JPEG, PNG, GIF, WebP
- **Kích thước tối đa**: 50MB
- **Timeout**: 2 phút cho mỗi request

## Xử lý lỗi

### 1. Common Errors

- **FileNotFoundError**: File ảnh không tồn tại
- **ValueError**: File ảnh bị lỗi hoặc không đọc được
- **RuntimeError**: Vision API call thất bại
- **TimeoutError**: Request timeout

### 2. Debug

Enable debug logs bằng cách kiểm tra stderr output:

```bash
python text_detector.py comic.jpg credentials.json 2> debug.log
```

## Performance Tips

1. **Batch Processing**: Sử dụng batch endpoint cho nhiều ảnh
2. **Image Optimization**: Resize ảnh lớn trước khi xử lý
3. **Caching**: Cache kết quả cho ảnh đã xử lý
4. **Async Processing**: Xử lý bất đồng bộ cho large batches

## Giới hạn và Cost

### 1. Vision API Limits

- **Free tier**: 1,000 requests/month
- **Paid tier**: $1.50 per 1,000 requests
- **Rate limit**: 600 requests/minute

### 2. Best Practices

- Sử dụng `DOCUMENT_TEXT_DETECTION` cho text dài
- Sử dụng `TEXT_DETECTION` cho text ngắn
- Crop ảnh để giảm cost
- Cache kết quả khi có thể

## Troubleshooting

### 1. Vision API không hoạt động

```bash
# Kiểm tra credentials
export GOOGLE_APPLICATION_CREDENTIALS="path/to/credentials.json"
gcloud auth application-default print-access-token
```

### 2. Python dependencies

```bash
pip install opencv-python numpy
```

### 3. Node.js dependencies

```bash
npm install @google-cloud/vision
```

## Ví dụ sử dụng trong Frontend

```javascript
// Upload và detect text
const formData = new FormData();
formData.append('comicImage', file);

const response = await fetch('/api/text-detection/detect', {
    method: 'POST',
    body: formData
});

const result = await response.json();

if (result.success) {
    console.log('Panels detected:', result.data.panelCount);
    console.log('Text found in:', result.data.totalTextDetected, 'panels');
    
    // Display annotated image
    const img = document.createElement('img');
    img.src = 'data:image/jpeg;base64,' + result.data.annotatedImageBase64;
    document.body.appendChild(img);
    
    // Show all text
    console.log('All text:', result.data.allText);
}
```

## Kết luận

Hệ thống này cung cấp một giải pháp hoàn chỉnh để detect và đọc text trong truyện tranh sử dụng Google Cloud Vision API. Với khả năng phát hiện panel tự động và xử lý batch, nó có thể được sử dụng cho các ứng dụng quy mô lớn.
