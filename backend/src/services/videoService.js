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
    async createScene(sourceB64, duration, outputFileName, isVideo = false) {
        const videoPath = path.join(TEMP_DIR, outputFileName);
        const videoUrl = `http://localhost:5000/static/${outputFileName}?v=${Date.now()}`;
        
        const inputExt = isVideo ? '.mp4' : '.jpg';
        const tempInputPath = path.join(TEMP_DIR, `temp_input_${Date.now()}${inputExt}`);
        const inputBuffer = Buffer.from(sourceB64, 'base64');
        fs.writeFileSync(tempInputPath, inputBuffer);

        const resolution_w = "1280";
        const resolution_h = "720";
        const fadeDuration = 0.5;
        const safeDuration = Math.max(duration, 2.0);

        let command = "";

        if (isVideo) {
            // === LOGIC BOOMERANG (LẶP TIẾN-LÙI) ===
            // 1. Resize video input
            // 2. Tách làm 2 luồng: xuôi (f) và ngược (r)
            // 3. Nối f + r lại với nhau (Boomerang)
            // 4. Lặp vô tận đoạn đó (loop=-1)
            // 5. Cắt đúng bằng thời lượng audio (trim)
            // 6. Fade in/out
            
            command = [
                'ffmpeg',
                `-i "${tempInputPath}"`,
                '-vf',
                `"scale=${resolution_w}:${resolution_h}:force_original_aspect_ratio=decrease,pad=${resolution_w}:${resolution_h}:(ow-iw)/2:(oh-ih)/2,` +
                `split[f][r];[r]reverse[rev];[f][rev]concat=n=2:v=1[bm];[bm]loop=-1:size=32767:start=0,` +
                `trim=duration=${safeDuration},setpts=PTS-STARTPTS,` +
                `fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${safeDuration - fadeDuration}:d=${fadeDuration}"`,
                '-c:v libx264', '-pix_fmt yuv420p', '-y',
                `"${videoPath}"`
            ].join(' ');

        } else {
            // === LOGIC ẢNH TĨNH (KEN BURNS) ===
            // ... (Giữ nguyên logic cũ của bạn) ...
             const zoompanDurationFrames = safeDuration * 25;
             const fadeOutStartTime = safeDuration - fadeDuration;
             command = [
                'ffmpeg',
                '-loop 1',
                `-i "${tempInputPath}"`,
                '-vf',
                `"zoompan=z='min(zoom+0.001,1.1)':d=${zoompanDurationFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',` +
                `scale=w=${resolution_w}:h=${resolution_h}:force_original_aspect_ratio=decrease,` +
                `pad=w=${resolution_w}:h=${resolution_h}:x=(ow-iw)/2:y=(oh-ih)/2,` +
                `fade=t=in:st=0:d=${fadeDuration},` +
                `fade=t=out:st=${fadeOutStartTime}:d=${fadeDuration}"`,
                '-c:v libx264', '-pix_fmt yuv420p', '-t', safeDuration, '-y',
                `"${videoPath}"`
            ].join(' ');
        }

        try {
            await exec(command);
            if(fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
            return { videoPath, videoUrl };
        } catch (error) {
            if(fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
            throw new Error(`FFmpeg failed: ${error.message}`);
        }
    }
}

module.exports = new VideoService();