import sys
import json
import base64
import os
import io
import torch
import tempfile
import warnings
from PIL import Image

# Tắt các cảnh báo không cần thiết
warnings.filterwarnings("ignore")

# --- ÁP DỤNG HƯỚNG DẪN TỪ HUGGING FACE ---
try:
    # Dùng DiffusionPipeline như hướng dẫn để tự động load cấu hình chuẩn
    from diffusers import DiffusionPipeline 
    from diffusers.utils import export_to_video
    DIFFUSERS_AVAILABLE = True
except ImportError:
    DIFFUSERS_AVAILABLE = False

MODEL_ID = "stabilityai/stable-video-diffusion-img2vid-xt"

def load_model():
    if not DIFFUSERS_AVAILABLE:
        return None, "Thiếu thư viện diffusers. Hãy chạy pip install -U diffusers transformers accelerate"
    
    try:
        sys.stderr.write(f"[PY] Loading SVD model (via DiffusionPipeline): {MODEL_ID}...\n")
        
        # 1. Load Model theo chuẩn mới
        # Dùng float16 để tiết kiệm VRAM (bfloat16 chỉ tốt cho card RTX 30/40 series, float16 an toàn hơn cho mọi card)
        pipe = DiffusionPipeline.from_pretrained(
            MODEL_ID, 
            torch_dtype=torch.float16, 
            variant="fp16"
        )
        
        # 2. TỐI ƯU BỘ NHỚ (QUAN TRỌNG CHO GPU DÂN DỤNG)
        # Thay vì pipe.to("cuda") như mẫu (ăn hết VRAM), ta dùng offload
        try:
            pipe.enable_sequential_cpu_offload()
            sys.stderr.write("[PY] Enabled sequential CPU offload (VRAM Saving)\n")
        except Exception as e:
            sys.stderr.write(f"[PY][WARN] Offload failed: {e}. Trying simple GPU loading...\n")
            pipe.to("cuda")

        # 3. BẬT TILING (Sau khi update thư viện ở Bước 1, hàm này sẽ có sẵn)
        # Giúp giảm VRAM khi decode video 
        try:
            pipe.vae.enable_tiling()
            sys.stderr.write("[PY] Enabled VAE tiling\n")
        except AttributeError:
            sys.stderr.write("[PY][WARN] VAE tiling not found (Did you upgrade diffusers?)\n")
        
        return pipe, None
    except Exception as e:
        return None, str(e)

def base64_to_pil(b64_string):
    try:
        img_data = base64.b64decode(b64_string)
        return Image.open(io.BytesIO(img_data)).convert("RGB")
    except: return None

def resize_image_for_svd(image):
    # Resize về 1024x576 (chuẩn SVD)
    w, h = image.size
    target_w, target_h = 1024, 576
    if h > w: target_w, target_h = 576, 1024
    return image.resize((target_w, target_h), Image.LANCZOS)

def generate_video_clip(pipe, image_pil, output_path):
    image_sized = resize_image_for_svd(image_pil)
    
    # Sinh video
    # Lưu ý: SVD là Image-to-Video, không cần prompt text
    frames = pipe(
        image=image_sized, 
        decode_chunk_size=1, # Giảm xuống 1 để đỡ tốn RAM
        num_inference_steps=10, 
        generator=torch.manual_seed(42)
    ).frames[0]
    
    export_to_video(frames, output_path, fps=7)
    return output_path

def process_animation(data, pipe):
    img_b64 = data.get('imageB64')
    if not img_b64: return {"success": False, "error": "No Image"}
    
    # Dọn dẹp VRAM
    if torch.cuda.is_available(): torch.cuda.empty_cache()

    image = base64_to_pil(img_b64)
    if not image: return {"success": False, "error": "Decode Error"}

    try:
        with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as tmp_file:
            output_path = tmp_file.name
        
        sys.stderr.write(f"[PY] Rendering panel {data.get('panelId')}...\n")
        generate_video_clip(pipe, image, output_path)
        
        with open(output_path, "rb") as f:
            video_b64 = base64.b64encode(f.read()).decode('utf-8')
        try: os.remove(output_path)
        except: pass

        return { "success": True, "videoBase64": video_b64 }
    except Exception as e:
        sys.stderr.write(f"[PY][ERROR] Render Error: {str(e)}\n")
        return {"success": False, "error": str(e)}

def main():
    sys.stdout.reconfigure(encoding='utf-8')
    
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Thiếu đường dẫn file input"})); sys.exit(1)
        
    input_file_path = sys.argv[1]
    
    # Load model
    pipe, error = load_model()
    if error:
        print(json.dumps({"error": error})); sys.exit(1)

    try:
        if not os.path.exists(input_file_path):
             print(json.dumps({"error": "File input không tồn tại"})); sys.exit(1)

        with open(input_file_path, 'r', encoding='utf-8') as f:
            request_data = json.load(f)

        files_data = request_data.get('filesData', [])
        output_results = []

        for file_info in files_data:
            processed_panels = []
            panels = file_info.get('panels', [])
            sys.stderr.write(f"[PY] Processing {file_info.get('fileName')} ({len(panels)} panels)\n")
            
            for panel in panels:
                result = process_animation(panel, pipe)
                processed_panels.append({"panelId": panel.get('panelId'), **result})
                
            output_results.append({"fileName": file_info.get('fileName'), "panels": processed_panels})

        print(json.dumps({"data": output_results}, ensure_ascii=False))

    except Exception as e:
        sys.stderr.write(f"[PY][FATAL] {str(e)}\n")
        print(json.dumps({"error": str(e)})); sys.exit(1)

if __name__ == "__main__":
    main()