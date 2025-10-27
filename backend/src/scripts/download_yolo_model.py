#!/usr/bin/env python3
"""
Script để download YOLOv12 Comic Panel Detection model từ Hugging Face
"""
import os
import sys
from pathlib import Path

try:
    from ultralytics import YOLO
    from huggingface_hub import hf_hub_download
except ImportError:
    print("Error: Required packages not installed.")
    print("Please run: pip install ultralytics huggingface-hub")
    sys.exit(1)

def download_model():
    """Download model từ Hugging Face"""
    print("=" * 60)
    print("Downloading YOLOv12 Comic Panel Detection Model")
    print("Source: https://huggingface.co/mosesb/best-comic-panel-detection")
    print("=" * 60)
    
    # Tạo thư mục models nếu chưa có
    model_dir = Path(__file__).parent / "models"
    model_dir.mkdir(exist_ok=True)
    
    model_path = model_dir / "best-comic-panel-detection.pt"
    
    try:
        # Cách 1: Download trực tiếp từ Hugging Face Hub
        print("\nDownloading model from Hugging Face...")
        downloaded_path = hf_hub_download(
            repo_id="mosesb/best-comic-panel-detection",
            filename="best.pt",
            local_dir=model_dir,
            local_dir_use_symlinks=False
        )
        
        print(f"✓ Model downloaded successfully!")
        print(f"✓ Saved to: {downloaded_path}")
        
        # Test model
        print("\nTesting model...")
        model = YOLO(downloaded_path)
        print(f"✓ Model loaded successfully!")
        print(f"✓ Model type: {model.model.__class__.__name__}")
        print(f"✓ Number of classes: {len(model.names)}")
        print(f"✓ Classes: {model.names}")
        
        return downloaded_path
        
    except Exception as e:
        print(f"✗ Error downloading model: {str(e)}")
        print("\nTrying alternative method...")
        
        try:
            # Cách 2: Sử dụng YOLO để tự động download
            print("Using YOLO auto-download...")
            model = YOLO('mosesb/best-comic-panel-detection')
            print(f"✓ Model auto-downloaded and loaded successfully!")
            return 'mosesb/best-comic-panel-detection'
            
        except Exception as e2:
            print(f"✗ Alternative method also failed: {str(e2)}")
            return None

def main():
    print("\n")
    model_path = download_model()
    
    if model_path:
        print("\n" + "=" * 60)
        print("SUCCESS! Model is ready to use.")
        print("=" * 60)
        print(f"\nModel path: {model_path}")
        print("\nUsage in your code:")
        print("```python")
        print("from ultralytics import YOLO")
        print(f"model = YOLO('{model_path}')")
        print("results = model.predict('your_comic_image.jpg')")
        print("```")
        print("\n")
    else:
        print("\n" + "=" * 60)
        print("FAILED to download model.")
        print("=" * 60)
        print("\nPlease check your internet connection and try again.")
        sys.exit(1)

if __name__ == '__main__':
    main()

