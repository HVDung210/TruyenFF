// File: src/services/videoService.js

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

// TEMP_DIR này phải trỏ đến 'src/tmp'
const TEMP_DIR = path.join(__dirname, '..', 'tmp');

class VideoService {

    /**
     * HÀM ĐÃ SỬA LỖI (Bao gồm cả lỗi cú pháp 'x' và lỗi 'ReferenceError')
     */
    async createScene(imageB64, duration, outputFileName) {
        const videoPath = path.join(TEMP_DIR, outputFileName);
        const videoUrl = `http://localhost:5000/static/${outputFileName}?v=${Date.now()}`;
        
        const imageBuffer = Buffer.from(imageB64, 'base64');
        const tempImagePath = path.join(TEMP_DIR, `temp_img_${Date.now()}.jpg`);
        fs.writeFileSync(tempImagePath, imageBuffer);

        // 2. Chuẩn bị lệnh FFmpeg
        
        // SỬA LỖI CÚ PHÁP: Định nghĩa width và height riêng biệt
        const resolution_w = "1280";
        const resolution_h = "720";

        const fadeDuration = 0.5;
        const safeDuration = Math.max(duration, 1.0);
        
        // ===================================
        // === DÒNG BẠN BỊ THIẾU NẰM Ở ĐÂY ===
        
        // QUAN TRỌNG: Tính toán thời lượng zoompan (fps mặc định là 25)
        const zoompanDurationFrames = safeDuration * 25;

        // QUAN TRỌNG: Tính toán thời điểm bắt đầu fade-out
        const fadeOutStartTime = safeDuration - fadeDuration;
        // ===================================


        const command = [
            'ffmpeg',
            '-loop 1',
            `-i "${tempImagePath}"`,
            '-vf',
            
            // SỬA LỖI CÚ PHÁP: Thêm "w=", "h=", "x=", "y="
            `"zoompan=z='min(zoom+0.001,1.1)':d=${zoompanDurationFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',` +
            `scale=w=${resolution_w}:h=${resolution_h}:force_original_aspect_ratio=decrease,` +
            `pad=w=${resolution_w}:h=${resolution_h}:x=(ow-iw)/2:y=(oh-ih)/2,` +
            
            `fade=t=in:st=0:d=${fadeDuration},` +
            `fade=t=out:st=${fadeOutStartTime}:d=${fadeDuration}"`,
            
            '-c:v libx264',
            '-pix_fmt yuv420p',
            '-t', safeDuration,
            '-y',
            `"${videoPath}"`
        ].join(' ');

        try {
            console.log(`[VideoService] Đang tạo scene: ${outputFileName} (${safeDuration}s)`);
            
            await exec(command);
            
            fs.unlinkSync(tempImagePath);
            
            console.log(`[VideoService] Đã tạo xong: ${outputFileName}`);
            return { videoPath, videoUrl };

        } catch (error) {
            console.error(`[VideoService] Lỗi FFmpeg:`, error);
            if (fs.existsSync(tempImagePath)) {
                fs.unlinkSync(tempImagePath);
            }
            throw new Error(`FFmpeg failed: ${error.message}`);
        }
    }
}

module.exports = new VideoService();