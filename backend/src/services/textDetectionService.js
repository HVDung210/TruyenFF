const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const execAsync = promisify(exec);

class TextDetectionService {
    constructor() {
        this.scriptsDir = path.join(__dirname, '..', 'scripts');
        this.scriptPath = path.join(this.scriptsDir, 'text_detector.py');
        this.nodeScriptPath = path.join(this.scriptsDir, 'vision_text_detector.js'); //
        this.credentialsPath = path.join(__dirname, '..', '..', 'truyenff-466701-6d617a31f7b4.json');
    }

    /**
     * HÀM MỚI: Detect text dùng tọa độ panel có sẵn
     * @param {string} imagePath - Đường dẫn đến file ảnh
     * @param {string | null} panelJson - (MỚI) JSON string của tọa độ
     * @returns {Promise<Object>} Kết quả text detection
     */
    async detectTextInComicFromData(imagePath, panelJson = null) {
        try {
            const logPrefix = panelJson ? '[TextDetectionService][FromData]' : '[TextDetectionService]';
            console.log(`${logPrefix} Starting text detection for: ${imagePath}`);
            
            // Kiểm tra file tồn tại
            if (!fs.existsSync(imagePath)) {
                throw new Error(`Image file not found: ${imagePath}`);
            }

            // Kiểm tra credentials
            if (!fs.existsSync(this.credentialsPath)) {
                throw new Error(`Credentials file not found: ${this.credentialsPath}`);
            }

            // Xây dựng command
            // Tham số script: <image_path> <credentials_path> [model_path] [panel_json_string]
            const commandItems = [
                'python', // Giữ nguyên 'python' như file gốc
                `"${this.scriptPath}"`,
                `"${imagePath}"`,
                `"${this.credentialsPath}"`,
                'null' // Tham số [model_path] (để trống)
            ];

            if (panelJson) {
                // panelJson là một string, ví dụ: '[{"id":1,...}]'
                // Chúng ta cần escape nó để truyền qua shell an toàn
                // JSON.stringify sẽ bọc nó trong "" và escape các dấu " bên trong
                const escapedJson = JSON.stringify(panelJson);
                commandItems.push(escapedJson);
            }

            const command = commandItems.join(' ');
            console.log(`${logPrefix} Executing command: ${command.slice(0, 250)}...`);

            const { stdout, stderr } = await execAsync(command, {
                timeout: 120000, // 2 minutes timeout
                maxBuffer: 50 * 1024 * 1024, // 50MB buffer
                encoding: 'utf8'
            });

            if (stderr) {
                // Log stderr, nhưng vẫn tiếp tục vì stderr có thể chứa warnings
                console.log(`${logPrefix} Python stderr: ${stderr}`);
            }

            if (!stdout) {
                 throw new Error(`Command executed but returned empty stdout. Stderr: ${stderr}`);
            }

            // Parse JSON response
            const result = JSON.parse(stdout);
            
            console.log(`${logPrefix} Text detection completed successfully`);
            console.log(`${logPrefix} Found ${result.panelCount} panels (method: ${result.detectionMethod}), ${result.totalTextDetected} with text`);
            
            return {
                success: true,
                data: result
            };

        } catch (error) {
            console.error(`[TextDetectionService] Error:`, error);
            
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * HÀM CŨ (ĐÃ CẬP NHẬT)
     * Detect text trong comic image (tự động detect panel)
     * @param {string} imagePath - Đường dẫn đến file ảnh
     * @returns {Promise<Object>} Kết quả text detection
     */
    async detectTextInComic(imagePath) {
        // Hàm này giờ là một wrapper, gọi hàm mới với panelJson = null
        return this.detectTextInComicFromData(imagePath, null);
    }

    /**
     * Detect text trong một panel cụ thể
     * (Hàm này giữ nguyên - phục vụ route /detect-panel)
     * @param {string} imagePath - Đường dẫn đến file ảnh
     * @param {Object} panel - Panel info {x, y, w, h}
     * @returns {Promise<Object>} Kết quả text detection cho panel
     */
    async detectTextInPanel(imagePath, panel) {
        try {
            console.log(`[TextDetectionService] Detecting text in single panel:`, panel);
            
            // Tạo script tạm để crop panel và detect text
            const tempScript = this.createPanelDetectionScript(imagePath, panel);
            const tempScriptPath = path.join(this.scriptsDir, 'temp_panel_detector.py');
            
            fs.writeFileSync(tempScriptPath, tempScript);
            
            const command = `python "${tempScriptPath}" "${imagePath}" "${this.credentialsPath}"`;
            const { stdout, stderr } = await execAsync(command, {
                timeout: 60000,
                maxBuffer: 10 * 1024 * 1024
            });

            // Cleanup temp script
            try {
                fs.unlinkSync(tempScriptPath);
            } catch (e) {
                console.warn(`[TextDetectionService] Failed to cleanup temp script: ${e.message}`);
            }

            const result = JSON.parse(stdout);
            
            return {
                success: true,
                data: result
            };

        } catch (error) {
            console.error(`[TextDetectionService] Panel detection error:`, error);
            
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Tạo script tạm để detect text trong một panel
     * (Hàm này giữ nguyên)
     */
    createPanelDetectionScript(imagePath, panel) {
        const nodeScriptAbsPath = this.nodeScriptPath.replace(/\\/g, '\\\\');
        return `
import sys
import json
import base64
import cv2
import numpy as np
import os
import tempfile
import subprocess

def read_image_bgr(path):
    image = cv2.imread(path)
    if image is None:
        raise ValueError(f"Cannot read image: {path}")
    return image

def encode_image_to_base64(image_bgr):
    ok, buffer = cv2.imencode('.jpg', image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok:
        raise ValueError("Failed to encode image")
    return base64.b64encode(buffer.tobytes()).decode('utf-8')

def crop_panel(image_bgr, x, y, w, h):
    return image_bgr[y:y+h, x:x+w]

def call_vision_api(image_base64, credentials_path):
    try:
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp_file:
            image_data = base64.b64decode(image_base64)
            temp_file.write(image_data)
            temp_file_path = temp_file.name
        
        node_script_path = r'${nodeScriptAbsPath}'
        cmd = ['node', node_script_path, temp_file_path, credentials_path]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30, encoding='utf-8', errors='replace')
        
        try:
            os.unlink(temp_file_path)
        except:
            pass
        
        if result.returncode != 0:
            raise RuntimeError(f"Vision API call failed: {result.stderr}")
        
        return json.loads(result.stdout)
        
    except Exception as e:
        raise RuntimeError(f"Vision API error: {str(e)}")

def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)

    image_path = sys.argv[1]
    credentials_path = sys.argv[2]
    
    try:
        image = read_image_bgr(image_path)
        panel_image = crop_panel(image, ${panel.x}, ${panel.y}, ${panel.w}, ${panel.h})
        panel_base64 = encode_image_to_base64(panel_image)
        
        vision_result = call_vision_api(panel_base64, credentials_path)
        
        result = {
            "panel": {
                "x": ${panel.x},
                "y": ${panel.y}, 
                "w": ${panel.w},
                "h": ${panel.h}
            },
            "textDetected": vision_result.get('hasText', False),
            "textAnnotations": vision_result.get('textAnnotations', []),
            "fullTextAnnotation": vision_result.get('fullTextAnnotation', {}),
            "textContent": vision_result.get('fullTextAnnotation', {}).get('text', ''),
            "textCount": vision_result.get('textCount', 0)
        }
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
`;
    }

    /**
     * Batch detect text trong nhiều images
     * (Hàm này giữ nguyên - phục vụ route /batch-detect)
     * @param {Array<string>} imagePaths - Danh sách đường dẫn ảnh
     * @returns {Promise<Array<Object>>} Kết quả cho từng ảnh
     */
    async batchDetectText(imagePaths) {
        const results = [];
        
        for (const imagePath of imagePaths) {
            try {
                // Gọi hàm detectTextInComic (hàm cũ) để tự động detect panel
                const result = await this.detectTextInComic(imagePath);
                results.push({
                    imagePath,
                    ...result
                });
            } catch (error) {
                results.push({
                    imagePath,
                    success: false,
                    error: error.message,
                    data: null
                });
            }
        }
        
        return results;
    }
}

module.exports = new TextDetectionService();