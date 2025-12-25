# Hướng dẫn sử dụng Frontend Text Detection

## Tổng quan

Frontend đã được cập nhật để hỗ trợ text detection trong truyện tranh với giao diện tương tự như panel detection. Có 3 tab chính:

1. **Panel Detection** - Phát hiện panels (chức năng cũ)
2. **Text Detection** - Phát hiện text trong panels (chức năng mới)
3. **API Tester** - Test trực tiếp API text detection

## Cấu trúc Components

```
frontend/src/components/
├── ComicToVideoDashboard.jsx     # Dashboard chính với tabs
├── ComicToVideoTester.jsx         # Panel detection (cũ)
├── TextDetectionTester.jsx        # Text detection với multiple files
└── TextDetectionAPITester.jsx    # API tester cho single file
```

## Cách sử dụng

### 1. Panel Detection (Tab đầu tiên)
- Upload nhiều ảnh comic
- Phát hiện panels trong từng ảnh
- Hiển thị ảnh đã đánh dấu panels
- Thống kê số lượng panels

### 2. Text Detection (Tab thứ hai)
- Upload nhiều ảnh comic
- Phát hiện text trong từng panel
- Hiển thị ảnh đã đánh dấu với màu sắc:
  - **Xanh**: Panel có text
  - **Đỏ**: Panel không có text
- Hiển thị tất cả text phát hiện được
- Chi tiết từng panel với text content

### 3. API Tester (Tab thứ ba)
- Upload 1 ảnh để test API
- Hiển thị chi tiết kết quả text detection
- Modal để xem chi tiết từng panel
- Debug thông tin API response

## Tính năng chính

### Text Detection Features

1. **Panel Detection + Text Recognition**
   - Tự động phát hiện panels bằng OpenCV
   - Gọi Cloud Vision API cho từng panel
   - Tổng hợp kết quả text

2. **Visual Feedback**
   - Ảnh annotated với bounding boxes
   - Màu sắc phân biệt panels có/không có text
   - Preview text ngay trên ảnh

3. **Detailed Results**
   - Thống kê tổng quan (số panels, panels có text)
   - Text content từng panel
   - Confidence scores từ Vision API
   - Error handling cho từng panel

4. **Interactive UI**
   - Click vào panel để xem chi tiết
   - Modal hiển thị text annotations
   - Progress tracking cho multiple files

### API Integration

```javascript
// Endpoint chính
POST /api/text-detection/detect

// Request
FormData: {
  comicImage: File
}

// Response
{
  "success": true,
  "data": {
    "panelCount": 3,
    "panels": [...],
    "annotatedImageBase64": "...",
    "totalTextDetected": 2,
    "allText": "...",
    "summary": {...}
  }
}
```

## Cách chạy

### 1. Backend
```bash
cd backend
npm install @google-cloud/vision
npm start
```

### 2. Frontend
```bash
cd frontend
npm start
```

### 3. Truy cập
- Mở http://localhost:3000
- Chọn tab "Text Detection"
- Upload ảnh comic và test

## Troubleshooting

### 1. API không hoạt động
- Kiểm tra backend đang chạy trên port 5000
- Kiểm tra credentials file tồn tại
- Kiểm tra Cloud Vision API đã enable

### 2. Upload lỗi
- Kiểm tra file size < 50MB
- Kiểm tra format ảnh (JPEG, PNG, GIF, WebP)
- Kiểm tra network connection

### 3. Text không được phát hiện
- Kiểm tra chất lượng ảnh
- Kiểm tra text có rõ ràng không
- Kiểm tra logs trong browser console

## Customization

### 1. Thay đổi API URL
```javascript
// Trong các component
const API_BASE_URL = 'http://your-backend-url:port';
```

### 2. Thay đổi UI colors
```css
/* Trong CSS hoặc Tailwind classes */
.panel-with-text { @apply bg-green-900/30 border-green-600; }
.panel-without-text { @apply bg-red-900/30 border-red-600; }
```

### 3. Thêm tính năng mới
- Thêm tab mới trong ComicToVideoDashboard
- Tạo component mới
- Import và sử dụng

## Performance Tips

1. **Batch Processing**: Text Detection xử lý từng file tuần tự
2. **Image Optimization**: Resize ảnh lớn trước khi upload
3. **Caching**: Cache kết quả để tránh gọi API lại
4. **Error Handling**: Xử lý lỗi gracefully cho từng file

## Kết luận

Frontend đã được tích hợp hoàn chỉnh với Cloud Vision API để phát hiện text trong truyện tranh. Giao diện thân thiện và dễ sử dụng, hỗ trợ cả single file và batch processing.
