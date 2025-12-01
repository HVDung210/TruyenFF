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
            // === LOGIC BOOMERANG (VIDEO) ===
            // Cải tiến:
            // 1. flags=lanczos: Thuật toán resize sắc nét nhất (tốt khi upscaling)
            // 2. -crf 17: Chất lượng hình ảnh cực cao (gần như không nén). (Mặc định là 23, càng nhỏ càng nét)
            // 3. -preset slow: Nén chậm hơn để giữ chi tiết tốt hơn
            
            command = [
                'ffmpeg',
                `-i "${tempInputPath}"`,
                '-vf',
                // Thêm flags=lanczos vào bộ lọc scale
                `"scale=${resolution_w}:${resolution_h}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${resolution_w}:${resolution_h}:(ow-iw)/2:(oh-ih)/2,` +
                `split[f][r];[r]reverse[rev];[f][rev]concat=n=2:v=1[bm];[bm]loop=-1:size=32767:start=0,` +
                `trim=duration=${safeDuration},setpts=PTS-STARTPTS,` +
                `fade=t=in:st=0:d=${fadeDuration},fade=t=out:st=${safeDuration - fadeDuration}:d=${fadeDuration}"`,
                
                '-c:v libx264',
                '-preset slow',  // Giữ chi tiết tốt hơn
                '-crf 17',       // Mức chất lượng cao (Visually Lossless)
                '-pix_fmt yuv420p',
                '-y',
                `"${videoPath}"`
            ].join(' ');

        } else {
            // === LOGIC KEN BURNS (ẢNH TĨNH) ===
            // Cũng áp dụng Lanczos và CRF 17
            const zoompanDurationFrames = safeDuration * 25;
            const fadeOutStartTime = safeDuration - fadeDuration;

            command = [
                'ffmpeg',
                '-loop 1',
                `-i "${tempInputPath}"`,
                '-vf',
                `"zoompan=z='min(zoom+0.001,1.1)':d=${zoompanDurationFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',` +
                // Thêm flags=lanczos
                `scale=w=${resolution_w}:h=${resolution_h}:force_original_aspect_ratio=decrease:flags=lanczos,` +
                `pad=w=${resolution_w}:h=${resolution_h}:x=(ow-iw)/2:y=(oh-ih)/2,` +
                `fade=t=in:st=0:d=${fadeDuration},` +
                `fade=t=out:st=${fadeOutStartTime}:d=${fadeDuration}"`,
                
                '-c:v libx264',
                '-preset slow',
                '-crf 17', // Chất lượng cao
                '-pix_fmt yuv420p',
                '-t', safeDuration,
                '-y',
                `"${videoPath}"`
            ].join(' ');
        }

        try {
            console.log(`[VideoService] Đang tạo scene HD: ${outputFileName}`);
            await exec(command);
            if(fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
            return { videoPath, videoUrl };
        } catch (error) {
            console.error(`[VideoService] Lỗi FFmpeg:`, error);
            if(fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
            throw new Error(`FFmpeg failed: ${error.message}`);
        }
    }

    /**
     * BƯỚC 6.4: GHÉP AUDIO VÀ NỐI VIDEO
     */
    async createFinalMovie(sceneList, audioList, outputFileName) {
        const finalVideoPath = path.join(TEMP_DIR, outputFileName);
        const finalVideoUrl = `http://localhost:5000/static/${outputFileName}?v=${Date.now()}`;
        const concatListPath = path.join(TEMP_DIR, `concat_list_${Date.now()}.txt`);
        
        let chunkFiles = [];

        try {
            // 1. GHÉP AUDIO VÀO TỪNG VIDEO PANEL (MUXING)
            console.log(`[VideoService] Bắt đầu ghép Audio vào ${sceneList.length} panels...`);
            
            for (let i = 0; i < sceneList.length; i++) {
                const videoUrl = sceneList[i].videoUrl; // URL: http://localhost.../static/file.mp4
                const audioUrl = audioList[i].audioUrl;
                
                // Lấy đường dẫn file nội bộ từ URL (Giả định URL trỏ về static folder)
                const videoName = path.basename(videoUrl.split('?')[0]);
                const audioName = path.basename(audioUrl.split('?')[0]);
                
                const videoFilePath = path.join(TEMP_DIR, videoName);
                const audioFilePath = path.join(TEMP_DIR, audioName);
                const chunkOutputPath = path.join(TEMP_DIR, `chunk_${i}_${Date.now()}.mp4`);

                // Lệnh FFmpeg: Lấy Video + Lấy Audio -> Copy (không nén lại) -> Output
                // -c copy: Cực nhanh vì không cần render lại hình ảnh
                // -shortest: Kết thúc khi stream ngắn hơn kết thúc (thường là bằng nhau do bước 6.3)
                const command = `ffmpeg -i "${videoFilePath}" -i "${audioFilePath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest -y "${chunkOutputPath}"`;
                
                await exec(command);
                chunkFiles.push(chunkOutputPath);
            }

            // 2. TẠO FILE DANH SÁCH ĐỂ NỐI (CONCAT LIST)
            // Format của file text ffmpeg: file 'path/to/file.mp4'
            const fileContent = chunkFiles.map(f => {
                // FFmpeg yêu cầu đường dẫn trong file list phải dùng dấu / (ngay cả trên Windows)
                const safePath = f.replace(/\\/g, '/');
                return `file '${safePath}'`;
            }).join('\n');
            
            fs.writeFileSync(concatListPath, fileContent);

            // 3. NỐI TẤT CẢ THÀNH 1 FILE (CONCATENATION)
            console.log(`[VideoService] Đang nối ${chunkFiles.length} đoạn thành phim hoàn chỉnh...`);
            
            // -f concat: Chế độ nối
            // -safe 0: Cho phép đọc đường dẫn tuyệt đối
            const concatCommand = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${finalVideoPath}"`;
            
            await exec(concatCommand);

            // 4. DỌN DẸP FILE TẠM (CHUNKS & LIST)
            // (Tùy chọn: Bạn có thể giữ lại nếu muốn debug)
            chunkFiles.forEach(f => { if(fs.existsSync(f)) fs.unlinkSync(f); });
            if(fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);

            console.log(`[VideoService] Xong! File: ${outputFileName}`);
            return { finalVideoPath, finalVideoUrl };

        } catch (error) {
            console.error(`[VideoService] Final Render Error:`, error);
            throw error;
        }
    }
}

module.exports = new VideoService();