# TruyenFF - Web Đọc Truyện Tranh

Ứng dụng web đọc truyện tranh với tính năng khác biệt: thu thập dữ liệu từ web truyện tranh khác, tìm kiếm truyện dựa trên mô tả văn bản, vẽ truyện tranh dựa trên văn bản truyện chữ.

## 🚀 Tổng Quan Dự Án

TruyenFF là ứng dụng full-stack chuyển đổi truyện chữ thành các panel truyện tranh trực quan. Nền tảng có các tính năng:

- **Phân Tích Nội Dung Bằng AI**: Sử dụng Google Gemini AI để phân tích nội dung truyện và chia thành các panel truyện tranh
- **Sinh Hình Ảnh Thông Minh**: Tạo ra các panel truyện tranh nhất quán sử dụng mô hình Hugging Face Stable Diffusion
- **Tính Nhất Quán Nhân Vật**: Duy trì tính nhất quán hình ảnh xuyên suốt tất cả các panel cho cùng một nhân vật
- **Web Crawler**: Thu thập dữ liệu tự động từ các trang web truyện tiếng Việt
- **Giao Diện Web Hiện Đại**: Frontend React với khả năng xử lý thời gian thực

## 🏗️ Kiến Trúc

Dự án bao gồm ba thành phần chính:

```
TruyenFF/
├── backend/          # Máy chủ API Express.js
├── crawler/          # Web crawler Python Scrapy
└── frontend/         # Ứng dụng web React.js
```

## 🛠️ Công Nghệ Sử Dụng

### Backend
- **Node.js** với framework **Express.js**
- **Google Gemini AI** để phân tích nội dung
- **Hugging Face API** để sinh hình ảnh
- **Google Cloud Storage** để lưu trữ hình ảnh
- **Prisma** ORM với hỗ trợ cơ sở dữ liệu
- **Canvas API** để xử lý hình ảnh và thêm lời thoại

### Frontend
- **React 19** với hooks hiện đại
- **Vite** để phát triển và build nhanh
- **Tailwind CSS** để styling
- **React Query** để quản lý state
- **Formik & Yup** để xử lý form và validation

### Crawler
- Framework **Python Scrapy**
- Tích hợp **Google Cloud Storage**
- **Thu thập dữ liệu tự động** từ các trang web truyện tiếng Việt

## 📋 Yêu Cầu Hệ Thống

Trước khi chạy dự án này, hãy đảm bảo bạn có:

- **Node.js** (phiên bản 18 trở lên)
- **Python** (phiên bản 3.8 trở lên)
- **npm** hoặc **yarn** package manager
- Tài khoản **Google Cloud Platform** với Storage API được bật
- **Google AI API** key cho Gemini
- **Hugging Face API** token

## 🔧 Thiết Lập Môi Trường

### 1. Clone Repository
```bash
git clone <repository-url>
cd TruyenFF
```

### 2. Thiết Lập Backend
```bash
cd backend
npm install

# Tạo file .env
cp .env.example .env
```

Cấu hình file `.env`:
```env
PORT=5000
GOOGLE_API_KEY=your_gemini_api_key
HUGGING_FACE_API_TOKEN=your_hf_token
GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
GCS_BUCKET_NAME=your-bucket-name
GOOGLE_CLOUD_PROJECT_ID=your-project-id
```

### 3. Thiết Lập Frontend
```bash
cd frontend
npm install
```

### 4. Thiết Lập Crawler
```bash
cd crawler
pip install -r requirements.txt

# Cài đặt Scrapy
pip install scrapy google-cloud-storage
```

## 🚀 Chạy Ứng Dụng

### Khởi Động Máy Chủ Backend
```bash
cd backend
npm start
# Máy chủ chạy trên http://localhost:5000
```

### Khởi Động Máy Chủ Phát Triển Frontend
```bash
cd frontend
npm run dev
# Frontend chạy trên http://localhost:5173
```

## 🔍 Tính Năng Chính

### 1. Tìm Kiếm Truyện Bằng Mô Tả Văn Bản
- **Tìm Kiếm Thông Minh**: Sử dụng AI để tìm kiếm truyện dựa trên mô tả văn bản tự nhiên
- **Phân Tích Ngữ Nghĩa**: Hiểu ý nghĩa sâu xa của yêu cầu tìm kiếm thay vì chỉ tìm từ khóa
- **Gợi Ý Truyện Phù Hợp**: Đề xuất truyện dựa trên nội dung, thể loại và bối cảnh
- **Giải Thích Lý Do**: Cung cấp lý do tại sao truyện được đề xuất phù hợp với yêu cầu

### 2. Phân Tích Nội Dung Bằng AI
- **Chia Panel Thông Minh**: Tự động chia nhỏ nội dung truyện thành 15-20 panel truyện tranh
- **Phân Loại Loại Cảnh**: Xác định cảnh thiết lập, đối thoại, hành động và phản ứng
- **Gợi Ý Góc Quay**: Đề xuất góc nhìn trực quan phù hợp cho mỗi panel
- **Lập Bản Đồ Tương Tác Nhân Vật**: Theo dõi mối quan hệ nhân vật và luồng đối thoại

### 3. Hệ Thống Nhất Quán Nhân Vật
- **Tạo Tham Chiếu Hình Ảnh**: Tạo mô tả nhân vật chi tiết từ văn bản và hình ảnh
- **Tag Thiết Kế Nhất Quán**: Duy trì tính nhất quán hình ảnh xuyên suốt tất cả các panel
- **Tích Hợp Tính Cách**: Kết hợp đặc điểm tính cách vào biểu diễn hình ảnh

### 4. Sinh Hình Ảnh Nâng Cao
- **Hỗ Trợ Đa Mô Hình**: Sử dụng mô hình Hugging Face Stable Diffusion
- **Nhất Quán Phong Cách**: Duy trì phong cách nghệ thuật nhất quán xuyên suốt các panel
- **Tối Ưu Hóa Chất Lượng**: Tham số có thể cấu hình cho chất lượng hình ảnh và tốc độ sinh
- **Logic Thử Lại**: Xử lý lỗi mạnh mẽ với cơ chế thử lại tự động

### 5. Khả Năng Web Crawler
- **Thu Thập Dữ Liệu Tự Động**: Crawl các trang web truyện tiếng Việt
- **Trích Xuất Dữ Liệu Có Cấu Trúc**: Thu thập thông tin truyện, chương và metadata
- **Tích Hợp Cloud Storage**: Tự động upload bìa và hình ảnh lên GCS
- **Giới Hạn Tốc Độ**: Tôn trọng chính sách website với độ trễ có thể cấu hình

## 🎨 Quy Trình Sinh Truyện Tranh

1. **Tải Nội Dung**: Tải nội dung truyện từ file JSON hoặc nguồn web
2. **Phân Tích AI**: Sử dụng Gemini AI để phân tích và cấu trúc nội dung thành các panel
3. **Thiết Lập Nhân Vật**: Tạo hoặc nâng cao tham chiếu nhân vật với hình ảnh
4. **Sinh Hình Ảnh**: Sinh các panel truyện tranh nhất quán sử dụng mô hình AI
5. **Thêm Lời Thoại**: Thêm bong bóng thoại và văn bản lên hình ảnh
6. **Cloud Storage**: Upload hình ảnh cuối cùng lên Google Cloud Storage
7. **Lắp Ráp Truyện Tranh**: Tạo layout truyện tranh cuối cùng với thứ tự phù hợp


**TruyenFF** - Chuyển đổi truyện chữ thành câu chuyện trực quan với công nghệ AI.
