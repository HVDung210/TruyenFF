# TruyenFF — Hướng Dẫn Cài Đặt & Chạy

Tài liệu này hướng dẫn chi tiết cách cài đặt môi trường, cấu hình và chạy project TruyenFF (backend + frontend). Phần demo bạn sẽ tự thêm sau.

**Yêu cầu trước khi cài đặt**
- **Node.js**: phiên bản LTS (16.x/18.x/20.x) — kiểm tra bằng `node -v`.
- **npm** (đi kèm Node) hoặc `yarn`.
- **Python 3.10+** — dùng cho các script xử lý ảnh/YOLO. Kiểm tra bằng `python --version` hoặc `python3 --version`.
- **ffmpeg**: cần để xử lý audio/video. Kiểm tra bằng `ffmpeg -version`.

**Tên file cấu hình**
- Dự án chứa file `.env` ở `backend/.env`. Kiểm tra và chỉnh trước khi chạy.

-----------------------------------------------------------------

**1. Cài đặt backend**

1. Mở terminal, vào thư mục backend:

```
cd backend
```

2. Cài Node dependencies:

```
npm install
```

3. Tạo môi trường Python (tùy chọn nhưng khuyến nghị cho script YOLO/inpainting):

Windows (PowerShell):
```
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements-yolo.txt
```

Linux / macOS:
```
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements-yolo.txt
```

1. Cấu hình biến môi trường:

- Mở `backend/.env` và cập nhật các giá trị như `GOOGLE_API_KEY`, `PYTHON_CMD` (nếu muốn trỏ tới `.venv`), `GCS_*`, v.v.

1. Chạy backend:

```
npm start
```

-----------------------------------------------------------------

**2. Cài đặt frontend**

1. Mở terminal mới, vào thư mục frontend:

```
cd frontend
```

2. Cài dependencies và chạy dev server (Vite):

```
npm install
npm run dev
```

3. Mở trình duyệt vào URL do Vite cung cấp (mặc định `http://localhost:5173`).

-----------------------------------------------------------------

**3. Cấu hình quan trọng & lưu ý vận hành**

- `PYTHON_CMD` trong `backend/.env` nên trỏ tới trình thông dịch Python bạn đã cài/virtualenv (ví dụ `./.venv/Scripts/python.exe` trên Windows).
- Nếu gặp lỗi liên quan đến các model (ví dụ không tìm thấy `finetune_detect.pt`), kiểm tra `backend/src/scripts/models/` và tải mô hình về.

**4. Các file nằm trong `.gitignore` — cách cấu hình cục bộ (quan trọng)**

Trong repository này một số file nhạy cảm và tập tin model lớn được thêm vào `.gitignore` để tránh commit vào git. Dưới đây là mô tả cách sử dụng và cấu hình các file đó trên máy local của bạn.

- `backend/.env`: file cấu hình môi trường cho backend (biến môi trường như `PYTHON_CMD`, `GCS_CREDENTIALS`, `GOOGLE_API_KEY`, v.v.).
	- Tạo file này thủ công ở `backend/.env` . Ví dụ:

```bash
# backend/.env (ví dụ)
PYTHON_CMD=.venv/Scripts/python.exe   # windows
GOOGLE_API_KEY=your_google_api_key_here
GCS_CREDENTIALS=path/to/your/service-account.json
GCS_BUCKET_NAME=your-bucket-name
PYPORT=5000
```

	- PowerShell (tạo biến tạm):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\your_google_application_credentials.json'
```

	- Bash (Linux/macOS):

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your_google_application_credentials.json"
```

- `backend/your_google_application_credentials.json`: service-account JSON (Google Cloud)
	- Cách tạo:
		1. Vào Google Cloud Console → IAM & Admin → Service Accounts.
		2. Tạo Service Account với quyền cần thiết (Storage Admin / Vision API / Text-to-Speech nếu cần).
		3. Tạo và tải key JSON.

	- Nếu bạn muốn tránh dùng JSON, có thể dùng Application Default Credentials (`gcloud auth application-default login`) hoặc cấu hình API key (`GOOGLE_API_KEY`) cho các APIs hỗ trợ key-based auth.

- `backend/src/scripts/models/finetune_detect.pt` (và các file model lớn khác):
	- Các model lớn thường bị gitignore. Bạn cần tải chúng từ nguồn cung cấp (link nội bộ hoặc external) và đặt vào `backend/src/scripts/models/`.
	- Ví dụ: tải `finetune_detect.pt` vào `backend/src/scripts/models/finetune_detect.pt`.
	- Nếu bạn không có model, nhiều script sẽ fallback hoặc báo lỗi.

-----------------------------------------------------------------

**6. Demo**


-----------------------------------------------------------------
