const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');

const execAsync = promisify(exec);

// Thư mục tạm (giống trong comicController.js)
const TEMP_DIR = path.join(__dirname, '..', 'tmp');
// Đường dẫn credentials (giống trong textDetectionService.js)
const CREDENTIALS_PATH = path.join(__dirname, '..', '..', 'truyenff-466701-6d617a31f7b4.json');

class TextToSpeechService {
    constructor() {
        this.client = new TextToSpeechClient({
            keyFilename: CREDENTIALS_PATH,
        });
        
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
    }

    /**
     * Lấy thời lượng của file âm thanh bằng ffprobe
     * @param {string} audioPath - Đường dẫn file MP3
     * @returns {Promise<number>} Thời lượng (giây)
     */
    async getAudioDuration(audioPath) {
        try {
            // Lệnh này lấy thời lượng và in ra (ví dụ: "3.456000")
            const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
            const { stdout } = await execAsync(command);
            const duration = parseFloat(stdout);
            
            if (isNaN(duration)) {
                console.warn(`[TTS] Không thể lấy duration cho ${audioPath}, dùng mặc định 2s`);
                return 2.0;
            }
            // Làm tròn đến 2 chữ số
            return Math.round(duration * 100) / 100;

        } catch (error) {
            console.error(`[TTS] Lỗi ffprobe: ${error.message}`);
            return 2.0; // Trả về mặc định nếu lỗi
        }
    }

    /**
     * Tạo file MP3 từ text
     * @param {string} text - Nội dung text
     * @param {string} outputFileName - Tên file output (ví dụ: "page_1_panel_1.mp3")
     * @returns {Promise<{audioPath: string, audioUrl: string, duration: number}>}
     */
    async synthesizeSpeech(text, outputFileName) {
        const audioPath = path.join(TEMP_DIR, outputFileName);
        const audioUrl = `http://localhost:5000/static/${outputFileName}`; // Giả định server chạy ở port 5000

        // 1. Tạo request TTS
        const request = {
            input: { text: text },
            voice: { languageCode: 'vi-VN', ssmlGender: 'NEUTRAL' }, // Tiếng Việt
            audioConfig: { audioEncoding: 'MP3' },
        };

        // 2. Gọi API
        console.log(`[TTS] Đang tạo audio cho: "${text.substring(0, 20)}..."`);
        const [response] = await this.client.synthesizeSpeech(request);
        
        // 3. Lưu file
        fs.writeFileSync(audioPath, response.audioContent, 'binary');

        // 4. Lấy thời lượng
        const duration = await this.getAudioDuration(audioPath);
        
        console.log(`[TTS] Đã tạo: ${outputFileName} (${duration}s)`);
        
        return { audioPath, audioUrl, duration };
    }

    /**
     * Hàm chính: Xử lý toàn bộ textData
     * @param {Array<Object>} textDataResults - Mảng results từ textData (state)
     * @returns {Promise<Array<Object>>}
     */
    async generateAudioForProject(textDataResults) {
        const allAudioData = [];

        // Dùng for...of để chạy tuần tự (tránh gọi API song song quá nhiều)
        for (const fileResult of textDataResults) {
            if (!fileResult || !fileResult.panels || !fileResult.fileName) {
                console.warn('[TTS] Bỏ qua fileResult không hợp lệ (thiếu panels hoặc fileName):', fileResult);
                continue; // Bỏ qua nếu dữ liệu không hợp lệ
            }

            const { fileName, panels } = fileResult;
            const fileAudioData = {
                fileName: fileName,
                panels: []
            };

            for (const panel of panels) {
                const baseFileName = `${path.parse(fileName).name}_panel_${panel.id}.mp3`;
                let audioInfo;

                if (panel.textContent && panel.textContent.trim().length > 0) {
                    // Panel có text: Gọi TTS
                    audioInfo = await this.synthesizeSpeech(panel.textContent, baseFileName);
                } else {
                    // Panel không có text: Gán thời lượng mặc định
                    audioInfo = { 
                        audioPath: null, 
                        audioUrl: null, 
                        duration: 2.0 // Mặc định 2 giây cho panel câm
                    };
                }
                
                fileAudioData.panels.push({
                    panelId: panel.id,
                    textContent: panel.textContent || null,
                    ...audioInfo
                });
            }
            allAudioData.push(fileAudioData); // Thêm vào mảng kết quả
        }
        
        console.log(`[TTS] Hoàn thành tạo audio cho ${allAudioData.length} file.`);
        return allAudioData;
    }
}

module.exports = new TextToSpeechService();