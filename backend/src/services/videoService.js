// File: src/services/videoService.js

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const fs = require('fs');
const path = require('path');

// TEMP_DIR này phải trỏ đến 'src/tmp'
const TEMP_DIR = path.join(__dirname, '..', 'tmp');

class VideoService {

    /**
     * [PHIÊN BẢN TẠM THỜI ĐỂ TEST]
     * Luôn tạo video từ ảnh tĩnh (Ken Burns) để bỏ qua bước SVD lâu lắc.
     */
    // async createScene(sourceB64, duration, outputFileName, isVideo = false) {
    //     const videoPath = path.join(TEMP_DIR, outputFileName);
    //     const videoUrl = `http://localhost:5000/static/${outputFileName}?v=${Date.now()}`;
        
    //     // --- [THAY ĐỔI 1]: LUÔN COI LÀ ẢNH (.jpg) ---
    //     // Dù frontend có gửi cờ isVideo hay không, ta vẫn lưu là ảnh để test nhanh
    //     const tempInputPath = path.join(TEMP_DIR, `temp_input_${Date.now()}.jpg`);
    //     const inputBuffer = Buffer.from(sourceB64, 'base64');
    //     fs.writeFileSync(tempInputPath, inputBuffer);

    //     const resolution_w = "1280";
    //     const resolution_h = "720";
    //     const fadeDuration = 0.5;
    //     const safeDuration = Math.max(duration, 2.0); // Tối thiểu 2s

    //     // --- [THAY ĐỔI 2]: CHỈ DÙNG LỆNH KEN BURNS (ZOOM/PAN) ---
    //     // Không dùng lệnh Boomerang nữa vì ta không có video đầu vào
        
    //     const zoompanDurationFrames = Math.ceil(safeDuration * 25);
    //     const fadeOutStartTime = safeDuration - fadeDuration;

    //     // Lệnh FFmpeg tạo chuyển động từ ảnh tĩnh
    //     const command = [
    //         'ffmpeg',
    //         '-loop 1',
    //         `-i "${tempInputPath}"`,
    //         '-vf',
    //         // Hiệu ứng Zoom nhẹ (Zoom vào giữa) + Scale HD + Fade In/Out
    //         `"zoompan=z='min(zoom+0.001,1.15)':d=${zoompanDurationFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)',` +
    //         `scale=w=${resolution_w}:h=${resolution_h}:force_original_aspect_ratio=decrease:flags=lanczos,` +
    //         `pad=w=${resolution_w}:h=${resolution_h}:x=(ow-iw)/2:y=(oh-ih)/2,` +
    //         `fade=t=in:st=0:d=${fadeDuration},` +
    //         `fade=t=out:st=${fadeOutStartTime}:d=${fadeDuration}"`,
            
    //         '-c:v libx264',
    //         '-preset ultrafast', // [QUAN TRỌNG] Dùng ultrafast để test cho nhanh (Giảm chất lượng nén chút xíu nhưng render vèo cái xong)
    //         '-pix_fmt yuv420p',
    //         '-t', safeDuration,
    //         '-y',
    //         `"${videoPath}"`
    //     ].join(' ');

    //     try {
    //         console.log(`[VideoService] [TEST MODE] Đang tạo scene giả lập từ ảnh: ${outputFileName} (${safeDuration}s)`);
    //         await exec(command);
            
    //         if(fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
    //         return { videoPath, videoUrl };

    //     } catch (error) {
    //         console.error(`[VideoService] Lỗi FFmpeg:`, error);
    //         if(fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
    //         throw new Error(`FFmpeg failed: ${error.message}`);
    //     }
    // }

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
     * BƯỚC 7.4: GHÉP AUDIO VÀ NỐI VIDEO
     */
    async createFinalMovie(sceneList, audioList, outputFileName) {
        const finalVideoPath = path.join(TEMP_DIR, outputFileName);
        const finalVideoUrl = `http://localhost:5000/static/${outputFileName}?v=${Date.now()}`;
        const concatListPath = path.join(TEMP_DIR, `concat_list_${Date.now()}.txt`);
        
        let chunkFiles = [];

        try {
            console.log(`[VideoService] Bắt đầu ghép Audio vào ${sceneList.length} panels...`);
            
            for (let i = 0; i < sceneList.length; i++) {
                // 1. Lấy đường dẫn file Video (Scene)
                // sceneList[i].videoUrl dạng: http://.../static/filename.mp4
                const videoFileName = path.basename(sceneList[i].videoUrl.split('?')[0]);
                const videoFilePath = path.join(TEMP_DIR, videoFileName);

                // 2. Lấy đường dẫn file Audio (MP3)
                let audioFilePath = null;
                if (audioList[i] && audioList[i].audioUrl) {
                    const audioFileName = path.basename(audioList[i].audioUrl.split('?')[0]);
                    audioFilePath = path.join(TEMP_DIR, audioFileName);
                }

                const chunkOutputPath = path.join(TEMP_DIR, `chunk_${i}_${Date.now()}.mp4`);
                let command = '';

                // 3. Xây dựng lệnh FFmpeg
                if (audioFilePath && fs.existsSync(audioFilePath)) {
                    // TRƯỜNG HỢP CÓ AUDIO: Mux Video + Audio
                    // -c:v copy: Giữ nguyên chất lượng video (không render lại)
                    // -c:a aac: Mã hóa audio sang chuẩn AAC cho MP4
                    // -shortest: Cắt theo luồng ngắn nhất (thường là bằng nhau do bước 6.3 đã chỉnh duration)
                    command = `ffmpeg -i "${videoFilePath}" -i "${audioFilePath}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest -y "${chunkOutputPath}"`;
                } else {
                    // TRƯỜNG HỢP KHÔNG CÓ AUDIO (Panel câm):
                    // Tạo track âm thanh rỗng (anullsrc) để tránh lỗi khi nối file
                    // Bắt buộc phải có audio stream thì file final mới đồng bộ
                    command = `ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -i "${videoFilePath}" -c:v copy -c:a aac -shortest -y "${chunkOutputPath}"`;
                }
                
                await exec(command);
                
                // Kiểm tra xem file chunk có được tạo ra không
                if (fs.existsSync(chunkOutputPath)) {
                    chunkFiles.push(chunkOutputPath);
                } else {
                    console.error(`[VideoService] Lỗi: Không tạo được chunk ${chunkOutputPath}`);
                }
            }

            // 4. TẠO FILE LIST ĐỂ NỐI
            if (chunkFiles.length === 0) throw new Error("Không có video chunk nào được tạo.");

            const fileContent = chunkFiles.map(f => {
                const safePath = f.replace(/\\/g, '/');
                return `file '${safePath}'`;
            }).join('\n');
            
            fs.writeFileSync(concatListPath, fileContent);

            // 5. NỐI (CONCAT)
            console.log(`[VideoService] Đang nối ${chunkFiles.length} đoạn...`);
            const concatCommand = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${finalVideoPath}"`;
            
            await exec(concatCommand);

            // 6. DỌN DẸP
            chunkFiles.forEach(f => { if(fs.existsSync(f)) fs.unlinkSync(f); });
            if(fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);

            console.log(`[VideoService] Xong Final Video: ${outputFileName}`);
            return { finalVideoPath, finalVideoUrl };

        } catch (error) {
            console.error(`[VideoService] Final Render Error:`, error);
            throw error;
        }
    }

    /**
     * BƯỚC 7.5: GHÉP TẤT CẢ VIDEO CON THÀNH 1 VIDEO LỚN (MEGA MERGE)
     */
    async mergeAllVideos(videoUrlList, outputFileName) {
        const megaVideoPath = path.join(TEMP_DIR, outputFileName);
        const megaVideoUrl = `http://localhost:5000/static/${outputFileName}?v=${Date.now()}`;
        const concatListPath = path.join(TEMP_DIR, `mega_concat_list_${Date.now()}.txt`);

        try {
            console.log(`[VideoService] Bắt đầu ghép ${videoUrlList.length} video thành 1 file lớn...`);

            // 1. Tạo file list
            const fileContent = videoUrlList.map(url => {
                // Chuyển URL thành đường dẫn nội bộ (Local Path)
                // Giả định URL dạng: http://localhost:5000/static/abc.mp4
                const fileName = path.basename(url.split('?')[0]);
                const localPath = path.join(TEMP_DIR, fileName).replace(/\\/g, '/');
                return `file '${localPath}'`;
            }).join('\n');

            fs.writeFileSync(concatListPath, fileContent);

            // 2. Nối (Concatenation) - Không cần encode lại (-c copy) nên siêu nhanh
            const command = `ffmpeg -f concat -safe 0 -i "${concatListPath}" -c copy -y "${megaVideoPath}"`;
            
            await exec(command);

            // 3. Dọn dẹp
            if(fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);

            console.log(`[VideoService] Xong Mega Video: ${outputFileName}`);
            return { megaVideoPath, megaVideoUrl };

        } catch (error) {
            console.error(`[VideoService] Mega Merge Error:`, error);
            if(fs.existsSync(concatListPath)) fs.unlinkSync(concatListPath);
            throw error;
        }
    }
}

module.exports = new VideoService();