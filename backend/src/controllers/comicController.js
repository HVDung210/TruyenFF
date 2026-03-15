const path = require('path');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const { spawn } = require('child_process');
const textToSpeechService = require('../services/textToSpeechService');
const videoService = require('../services/videoService');
const geminiService = require('../services/geminiService');
const ffmpeg = require('fluent-ffmpeg');

// Ensure temp directory exists
const TEMP_DIR = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}


// Path to Python scripts (Đảm bảo cả 2 đều được định nghĩa)
const PY_SCRIPT_DETECT = path.join(__dirname, '..', 'scripts', 'panel_detector_yolo.py');
const PY_SCRIPT_CROP = path.join(__dirname, '..', 'scripts', 'panel_cropper.py');
const PY_SCRIPT_INPAINT = path.join(__dirname, '..', 'scripts', 'panel_inpainter.py');
const PY_SCRIPT_ANIMATE = path.join(__dirname, '..', 'scripts', 'panel_animator.py');
const PY_SCRIPT_BUBBLE_DETECT = path.join(__dirname, '..', 'scripts', 'bubble_detector.py');
/**
 * Hàm chung để gọi script Python
 * @param {Object} file - Đối tượng file từ multer
 * @param {Number} startTime - Thời gian bắt đầu (Date.now())
 * @param {string} scriptPath - Đường dẫn đến script Python
 * @param {string | null} panelJson - (MỚI) JSON string của tọa độ panel
 * @returns {Promise<Object>}
 */
// SỬA LỖI: Thêm `panelJson = null` vào đây
const processSingleFile = (file, startTime, scriptPath, panelJson = null) => {
  return new Promise((resolve, reject) => {
    const uploadedPath = file.path;
    
    if (!uploadedPath || !fs.existsSync(uploadedPath)) {
      return reject({
        error: 'File không tồn tại',
        details: `File path: ${uploadedPath}`,
        fileName: file.originalname
      });
    }
    
    console.log('[processSingleFile] Start processing:', {
      file: { originalName: file.originalname },
      script: scriptPath,
      hasJson: !!panelJson,
    });

    // Call Python script
    const pythonCmd = process.env.PYTHON_CMD || 'python';
    
    // Xây dựng tham số
    const args = [scriptPath, uploadedPath];

    // CẬP NHẬT: Thêm logic để truyền `panelJson`
    if (scriptPath === PY_SCRIPT_DETECT) {
        // (panel_detector_yolo.py) <image_path> [model_path]
        args.push(null); // model_path (để trống)
    } else if (scriptPath === PY_SCRIPT_CROP) {
        // (panel_cropper.py) <image_path> [model_path] [panel_json_string]
        args.push(null); // model_path (để trống)
        if (panelJson) {
            args.push(panelJson); // [panel_json_string]
        }
    }
    
    console.log('[processSingleFile] Spawning python:', pythonCmd, args.slice(0, 3).join(' '), '...');
    const py = spawn(pythonCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      const stderrData = data.toString();
      stderr += stderrData;
      console.log('[PYTHON STDERR]', stderrData.trim());
    });

    py.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      console.log('[processSingleFile] Python exited:', { code, durationMs });

      if (code !== 0) {
        console.error('[processSingleFile] Python error:', stderr.trim());
        fs.unlink(uploadedPath, (err) => {
          if (err) console.error('[processSingleFile] Error deleting file:', err);
        });
        return reject({
          error: 'Xử lý ảnh thất bại',
          details: stderr.trim(),
          meta: { code, durationMs },
          fileName: file.originalname
        });
      }

      try {
        const result = JSON.parse(stdout);
        console.log('[processSingleFile] Success:', {
          panelCount: result?.panelCount,
          durationMs,
          fileName: file.originalname
        });
        
        fs.unlink(uploadedPath, (err) => {
          if (err) console.error('[processSingleFile] Error deleting file:', err);
        });
        
        resolve({ ...result, fileName: file.originalname, processingTime: durationMs });
      } catch (e) {
        console.error('[processSingleFile] JSON parse error:', e.message);
        fs.unlink(uploadedPath, (err) => {
          if (err) console.error('[processSingleFile] Error deleting file:', err);
        });
        reject({
          error: 'Không thể phân tích kết quả từ Python',
          details: e.message,
          raw: (stdout || '').slice(0, 5000),
          fileName: file.originalname
        });
      }
    });
  });
};

// Hàm này gọi processSingleFile (panelJson là null)
exports.detectPanels = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Thiếu file ảnh (field name: file)' });
    }
    const result = await processSingleFile(req.file, Date.now(), PY_SCRIPT_DETECT);
    return res.json(result);
  } catch (err) {
    console.error('[detectPanels] Fatal controller error:', err);
    return res.status(500).json({ error: err.error || err.message, details: err.details });
  }
};

// Hàm này gọi processSingleFile (panelJson là null)
exports.detectPanelsMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Thiếu file ảnh (field name: files)' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const result = await processSingleFile(file, Date.now(), PY_SCRIPT_DETECT); // panelJson = null
        results.push({ success: true, data: result });
      } catch (error) {
        errors.push({ success: false, error: error.error || error.message, fileName: file.originalname });
      }
    }

    return res.json({
      totalFiles: req.files.length,
      successful: results.length,
      failed: errors.length,
      results: [...results, ...errors]
    });
  } catch (err) {
    console.error('[detectPanelsMultiple] Fatal controller error:', err);
    return res.status(500).json({ error: err.message });
  }
};

// Hàm này gọi processSingleFile (panelJson là null)
exports.cropPanelsMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Thiếu file ảnh (field name: files)' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const result = await processSingleFile(file, Date.now(), PY_SCRIPT_CROP); // panelJson = null
        results.push({ success: true, data: result });
      } catch (error) {
        errors.push({ success: false, error: error.error || error.message, fileName: file.originalname });
      }
    }

    return res.json({
      totalFiles: req.files.length,
      successful: results.length,
      failed: errors.length,
      results: [...results, ...errors]
    });
  } catch (err) {
    console.error('[cropPanelsMultiple] Fatal controller error:', err);
    return res.status(500).json({ error: err.message });
  }
};


/**
 * HÀM MỚI: Cắt panel từ dữ liệu đã detect
 */
exports.cropFromData = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Thiếu file ảnh (field name: files)' });
    }
    const { panelData } = req.body;
    if (!panelData) {
      return res.status(400).json({ error: 'Thiếu panelData trong body' });
    }

    let parsedData = [];
    try {
      parsedData = JSON.parse(panelData);
    } catch (e) {
      return res.status(400).json({ error: 'panelData không phải là JSON hợp lệ' });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const filePanelData = parsedData.find(d => d.fileName === file.originalname);
        let panelJson = null; // Định nghĩa panelJson ở đây

        if (filePanelData && filePanelData.panels) {
          panelJson = JSON.stringify(filePanelData.panels);
        } else {
          console.warn(`[cropFromData] Không tìm thấy panelData cho file: ${file.originalname}. Sẽ tự động detect.`);
        }

        // Hàm này gọi processSingleFile (panelJson có thể là string hoặc null)
        const result = await processSingleFile(file, Date.now(), PY_SCRIPT_CROP, panelJson);
        results.push({ success: true, data: result });
      } catch (error) {
        errors.push({ success: false, error: error.error || error.message, fileName: file.originalname });
      }
    }

    return res.json({
      totalFiles: req.files.length,
      successful: results.length,
      failed: errors.length,
      results: [...results, ...errors]
    });

  } catch (err) {
    console.error('[cropFromData] Fatal controller error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.generateAudio = async (req, res) => {
  try {
    // Dữ liệu này được gửi từ VideoGeneratorTester.jsx
    const { textDataResults } = req.body;

    if (!textDataResults || !Array.isArray(textDataResults) || textDataResults.length === 0) {
      return res.status(400).json({ success: false, error: 'Thiếu textDataResults' });
    }

    console.log(`[ComicController] Nhận yêu cầu tạo audio cho ${textDataResults.length} file...`);

    // Gọi service TTS
    const audioData = await textToSpeechService.generateAudioForProject(textDataResults);

    res.json({
      success: true,
      data: audioData,
      message: 'Tạo audio thành công'
    });

  } catch (error) {
    console.error('[ComicController] Lỗi tạo audio:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


/**
 * DETECT BUBBLES TRÊN PANEL CROP (JSON INPUT)
 */
exports.detectBubblesMultiple = async (req, res) => {
  try {
    const { cropData } = req.body; // Nhận dữ liệu crop từ frontend

    if (!cropData || !Array.isArray(cropData)) {
      return res.status(400).json({ error: 'Thiếu dữ liệu cropData' });
    }

    // Chuẩn bị payload cho Python (giống cấu trúc Inpaint)
    // Lọc lấy các panel có ảnh croppedImageBase64
    const filesData = cropData.map(file => ({
        fileName: file.fileName,
        panels: file.panels.filter(p => p.croppedImageBase64).map(p => ({
            panelId: p.id,
            croppedImageBase64: p.croppedImageBase64
        }))
    }));

    // Gọi Python
    const pythonCmd = process.env.PYTHON_CMD || 'python';
    const py = spawn(pythonCmd, [PY_SCRIPT_BUBBLE_DETECT]);

    let stdout = '';
    let stderr = '';

    py.stdin.write(JSON.stringify({ filesData }));
    py.stdin.end();

    py.stdout.on('data', (data) => stdout += data.toString());
    py.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log('[PYTHON DETECT]', data.toString().trim());
    });

    py.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: 'Python detect failed', details: stderr });
        }
        try {
            const result = JSON.parse(stdout);
            res.json({ success: true, data: result.data });
        } catch (e) {
            res.status(500).json({ error: 'JSON parse error', details: stdout });
        }
    });

  } catch (err) {
    console.error('[detectBubblesMultiple] Fatal error:', err);
    return res.status(500).json({ error: err.message });
  }
};

/**
 * [MỚI] HÀM: Xóa bong bóng thoại (Inpainting)
 * Nhận JSON input từ frontend, gọi Python qua STDIN, trả về JSON output.
 */
exports.removeBubbles = async (req, res) => {
  try {
    const { filesData } = req.body; 

    if (!filesData || !Array.isArray(filesData)) {
      return res.status(400).json({ error: 'Thiếu dữ liệu filesData hoặc sai định dạng' });
    }

    console.log(`[ComicController] Nhận yêu cầu xóa bong bóng cho ${filesData.length} file...`);

    // Python command (dùng python trong môi trường ảo nếu cần, hoặc 'python' mặc định)
    const pythonCmd = process.env.PYTHON_CMD || 'python';
    
    // Spawn process
    const py = spawn(pythonCmd, [PY_SCRIPT_INPAINT]);

    let stdout = '';
    let stderr = '';

    // 1. Gửi dữ liệu vào Python qua STDIN (Vì Base64 quá dài không thể truyền qua arguments)
    const inputJson = JSON.stringify({ filesData });
    py.stdin.write(inputJson);
    py.stdin.end(); // Kết thúc luồng input để Python bắt đầu xử lý

    // 2. Lắng nghe dữ liệu trả về
    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      // Log tiến trình từ Python (được in qua sys.stderr)
      const msg = data.toString().trim();
      if (msg) console.log('[PYTHON INPAINT]', msg);
      stderr += msg;
    });

    // 3. Xử lý khi Python chạy xong
    py.on('close', (code) => {
      if (code !== 0) {
        console.error('[removeBubbles] Python process failed with code', code);
        return res.status(500).json({ 
            error: 'Lỗi xử lý Python Inpainting', 
            details: stderr 
        });
      }

      try {
        // Parse kết quả JSON từ Python
        const result = JSON.parse(stdout);
        
        if (result.error) {
            return res.status(500).json({ error: result.error, details: result.details });
        }

        console.log('[ComicController] Inpainting hoàn tất.');
        return res.json({
          success: true,
          data: result.data,
          message: 'Đã xóa bong bóng thành công'
        });

      } catch (e) {
        console.error('[removeBubbles] JSON Parse Error:', e.message);
        console.error('Raw Stdout:', stdout.slice(0, 200) + '...'); // Debug log
        return res.status(500).json({ 
            error: 'Không thể đọc kết quả từ Python', 
            details: e.message 
        });
      }
    });

  } catch (err) {
    console.error('[removeBubbles] Controller Fatal Error:', err);
    return res.status(500).json({ error: err.message });
  }
};


const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000, // Gửi keep-alive packet mỗi 30s
    maxSockets: 5,
    maxFreeSockets: 2,
    timeout: 600000 // 10 phút
});


// Thêm hàm helper để polling (hỏi liên tục)
const pollJobStatus = async (jobId) => {
    const pollInterval = 10000; // Hỏi mỗi 10 giây
    const maxAttempts = 360;    // Thử tối đa 60 phút (360 * 10s)

    for (let i = 0; i < maxAttempts; i++) {
        try {
            console.log(`      ⏳ [Job ${jobId}] Checking status (Attempt ${i + 1})...`);
            
            // Gọi API /status/<job_id>
            const response = await axios.get(`${process.env.KAGGLE_API_URL}/status/${jobId}`, {
                httpsAgent: httpsAgent,
                timeout: 10000 // Timeout ngắn cho lệnh check status
            });

            const { status, data, error } = response.data;

            if (status === 'done') {
                return data; // Trả về kết quả video
            } else if (status === 'failed') {
                throw new Error(`Kaggle Job Failed: ${error}`);
            }
            
            // Nếu vẫn 'processing', đợi 10s rồi hỏi lại
            await new Promise(resolve => setTimeout(resolve, pollInterval));

        } catch (err) {
            console.error(`      ⚠️ Lỗi khi check status: ${err.message}. Retrying...`);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
    }
    throw new Error("Job Timeout: Quá thời gian chờ xử lý.");
};
/**
 * BƯỚC 7.2: SINH VIDEO AI (LOGIC: ẢNH CROP -> GEMINI | ẢNH INPAINT -> KAGGLE)
 */
exports.generateVideoAI = async (req, res) => {
  try {
    const { filesData } = req.body;
    if (!filesData || !Array.isArray(filesData)) {
      return res.status(400).json({ error: 'Thiếu filesData' });
    }

    console.log(`[ComicController] Bắt đầu xử lý ${filesData.length} file...`);
    const finalResults = [];

    // --- VÒNG LẶP 1: DUYỆT TỪNG FILE TRUYỆN ---
    for (const file of filesData) {
        console.log(`\n📂 File: ${file.fileName}`);
        const processedPanels = []; // Chứa kết quả của file này

        // --- VÒNG LẶP 2: DUYỆT TỪNG PANEL (QUAN TRỌNG: TUẦN TỰ) ---
        for (const panel of file.panels) {
            console.log(`   👉 Panel ${panel.panelId}: Đang xử lý...`);
            
            // 1. CHUẨN BỊ THAM SỐ MOTION (GEMINI HOẶC DEFAULT)
            let motionParams = { motion_bucket_id: 127, fps: 7 };
            
            try {
                // Ưu tiên ảnh crop gốc để Gemini phân tích cho chuẩn
                const imageForAnalysis = panel.croppedImageBase64 || panel.imageB64;
                
                if (imageForAnalysis) {
                    // Gọi Gemini Service (Giữ nguyên logic cũ của bạn)
                    const analysis = await geminiService.analyzePanelMotion(imageForAnalysis);
                    
                    if (analysis && analysis.motion_score) {
                        motionParams.motion_bucket_id = analysis.motion_score;
                        motionParams.fps = analysis.recommended_fps || 7;
                        console.log(`      🧠 Gemini: Motion ${motionParams.motion_bucket_id}, FPS ${motionParams.fps}`);
                    }
                }
            } catch (geminiErr) {
                console.log(`      ⚠️ Gemini bỏ qua, dùng mặc định.`);
            }

            // 2. GỬI SANG KAGGLE (CHỈ GỬI 1 PANEL NÀY THÔI)
            try {
                // Ảnh để sinh video (ưu tiên ảnh đã inpaint xóa text)
                const imageForVideo = panel.inpaintedImageB64 || panel.croppedImageBase64 || panel.imageB64;

                console.log(`      🚀 Đang gửi sang Kaggle...`);
                
                const response = await axios.post(`${process.env.KAGGLE_API_URL}/generate`, { 
                        filesData: [{
                            fileName: file.fileName,
                            panels: [{
                                panelId: panel.panelId,
                                imageB64: imageForVideo,
                                motion_bucket_id: motionParams.motion_bucket_id,
                                fps: motionParams.fps
                            }]
                        }]
                    }, { httpsAgent: httpsAgent });

                    if (response.data.success && response.data.job_id) {
                        const jobId = response.data.job_id;
                        console.log(`      🎫 Job ID: ${jobId}. Đang đợi kết quả...`);
                        
                        // 2. POLLING (Đợi kết quả)
                        const jobResultData = await pollJobStatus(jobId);
                        
                        // Lấy kết quả
                        const resultData = jobResultData[0].panels[0];
                        console.log(`      ✅ Thành công!`);
                        
                        processedPanels.push({
                            panelId: panel.panelId,
                            success: true,
                            videoBase64: resultData.videoBase64,
                            aiMode: `Motion: ${motionParams.motion_bucket_id}`
                        });
                    } else {
                        throw new Error("Không nhận được Job ID từ Kaggle");
                    }

                } catch (kaggleErr) {
                    console.error(`      ❌ Lỗi Panel ${panel.panelId}: ${kaggleErr.message}`);
                    processedPanels.push({
                        panelId: panel.panelId,
                        success: false,
                        error: kaggleErr.message
                    });
                }

        } // Kết thúc vòng lặp Panels

        // Gom kết quả của File này lại
        finalResults.push({
            fileName: file.fileName,
            panels: processedPanels
        });

    } // Kết thúc vòng lặp Files

    // Trả kết quả cuối cùng về Frontend
    console.log(`✅ Hoàn tất quy trình AI!`);
    return res.json({ success: true, data: finalResults });

  } catch (err) {
    console.error('[ComicController] Fatal Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};


/**
 * BƯỚC 7.3: GHÉP SCENE (XỬ LÝ BOOMERANG / ZOOM)
 */
exports.generateScenes = async (req, res) => {
  try {
      const { videoData, cropData } = req.body;

      if (!videoData || !cropData) {
          return res.status(400).json({ success: false, error: 'Thiếu dữ liệu' });
      }

      console.log(`[ComicController] Đang ghép scene cho ${cropData.length} file...`);
      const allSceneData = [];

      for (const fileCropData of cropData) {
          const fileName = fileCropData.fileName;
          const fileAudioData = videoData.find(f => f.fileName === fileName);
          if (!fileAudioData) continue;

          const fileSceneData = { fileName: fileName, panels: [] };

          for (const panelCrop of fileCropData.panels) {
              const panelId = panelCrop.id;
              const panelAudio = fileAudioData.panels.find(p => p.panelId === panelId);
              if (!panelAudio) continue;

              const duration = panelAudio.duration;
              const outputFileName = `${path.parse(fileName).name}_panel_${panelId}.mp4`;

              // --- LOGIC QUYẾT ĐỊNH LOẠI VIDEO ---
              let sourceB64 = panelCrop.croppedImageBase64;
              let isVideo = false;

              // Nếu có video từ Bước 7.2 (SVD) thì dùng nó
              if (panelCrop.videoSourceBase64) {
                  sourceB64 = panelCrop.videoSourceBase64;
                  isVideo = true; 
                  console.log(`   Panel ${panelId}: Dùng Video AI (Sẽ làm hiệu ứng Boomerang)`);
              } else {
                  console.log(`   Panel ${panelId}: Dùng Ảnh tĩnh (Sẽ làm hiệu ứng Ken Burns)`);
              }

              try {
                  // Gọi VideoService (đã cập nhật logic Boomerang)
                  const { videoUrl } = await videoService.createScene(
                      sourceB64,
                      duration,
                      outputFileName,
                      isVideo 
                  );
                  
                  fileSceneData.panels.push({
                      panelId: panelId,
                      duration: duration,
                      videoUrl: videoUrl,
                  });

              } catch (error) {
                  console.error(`[ComicController] Lỗi tạo scene ${outputFileName}:`, error.message);
              }
          }
          allSceneData.push(fileSceneData);
      }

      res.json({
          success: true,
          data: allSceneData,
          message: 'Tạo scene video thành công'
      });

  } catch (error) {
      console.error('[ComicController] Lỗi tạo scenes:', error);
      res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * BƯỚC 7.4: TẠO VIDEO HOÀN CHỈNH (MERGE AUDIO + CONCAT)
 */
exports.generateFinalVideo = async (req, res) => {
  try {
      const { sceneData, videoData } = req.body; // sceneData chứa video url, videoData chứa audio url

      if (!sceneData || !videoData) {
          return res.status(400).json({ error: 'Thiếu dữ liệu scene hoặc audio' });
      }

      console.log('[ComicController] Bắt đầu tạo Final Video...');
      const finalResults = [];

      // Xử lý từng file truyện (ví dụ chap 1, chap 2...)
      for (const fileScene of sceneData) {
            const fileName = fileScene.fileName;
            const fileAudio = videoData.find(f => f.fileName === fileName);
            
            // Dù không có fileAudio thì vẫn phải render video (câm)
            // Nhưng code cũ: if (!fileAudio) continue; -> Có thể gây lỗi nếu mất audio data
            // Sửa lại: Nếu không có fileAudio thì tạo mảng rỗng
            const audioPanels = fileAudio ? fileAudio.panels : [];

            const orderedScenes = [];
            const orderedAudios = [];

            // Duyệt qua từng Video Panel
            for (const panelScene of fileScene.panels) {
                orderedScenes.push(panelScene);

                // Tìm Audio tương ứng với Panel này
                const audioFound = audioPanels.find(p => p.panelId === panelScene.panelId);
                
                // Nếu tìm thấy thì push vào, không thấy thì push null (để service xử lý tạo audio rỗng)
                orderedAudios.push(audioFound || null);
            }

            if (orderedScenes.length === 0) continue;

            const outputFileName = `FINAL_${path.parse(fileName).name}_${Date.now()}.mp4`;

            try {
                const result = await videoService.createFinalMovie(
                    orderedScenes,
                    orderedAudios, // Danh sách này phải khớp độ dài với orderedScenes
                    outputFileName
                );

                finalResults.push({
                    fileName: fileName,
                    finalUrl: result.finalVideoUrl
                });

            } catch (error) {
                console.error(`Lỗi render file ${fileName}:`, error);
                finalResults.push({ fileName: fileName, error: error.message });
            }
        }

      res.json({
          success: true,
          data: finalResults,
          message: 'Đã xuất bản video hoàn chỉnh!'
      });

  } catch (err) {
      console.error('[ComicController] Fatal:', err);
      res.status(500).json({ error: err.message });
  }
};

/**
 * API: Ghép danh sách các video clip (panel) thành 1 file MP4 hoàn chỉnh
 * Input: { videoPaths: ["/path/to/vid1.mp4", "/path/to/vid2.mp4"] }
 */
/**
 * API: Ghép danh sách các video clip (panel) thành 1 file MP4 hoàn chỉnh
 * Input: { videoPaths: ["/path/to/vid1.mp4", "/path/to/vid2.mp4"] }
 */
exports.mergeFinalVideo = async (req, res) => {
    try {
        const { videoPaths } = req.body;

        if (!videoPaths || !Array.isArray(videoPaths) || videoPaths.length === 0) {
            return res.status(400).json({ error: 'Danh sách video rỗng.' });
        }

        console.log(`[ComicController] Bắt đầu ghép ${videoPaths.length} clips từ TEMP_DIR...`);

        // --- 1. CẤU HÌNH ĐƯỜNG DẪN ĐÚNG ---
        
        // 🔥 SỬA Ở ĐÂY: Sử dụng TEMP_DIR đã khai báo ở đầu file (../tmp)
        // Thay vì path.join(__dirname, '/tmp') hay public/tmp
        const inputDir = TEMP_DIR; 
        
        // Thư mục chứa file thành phẩm (Output) - Để Frontend truy cập được
        const outputDir = path.join(__dirname, '../public/outputs');
        
        // Đảm bảo thư mục tồn tại
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        const outputFileName = `Merged_Full_Chapter_${Date.now()}.mp4`;
        const outputPath = path.join(outputDir, outputFileName);

        await new Promise((resolve, reject) => {
            const command = ffmpeg();
            let validFilesCount = 0;

            videoPaths.forEach(rawPath => {
                // --- XỬ LÝ URL ---
                let localPath = rawPath;

                if (rawPath.startsWith('http') || rawPath.startsWith('/')) {
                    // 1. Lấy tên file gốc (Bỏ query ?v=...)
                    const cleanUrl = rawPath.split('?')[0];
                    const fileName = path.basename(cleanUrl);

                    // 2. Ghép với đường dẫn TEMP_DIR
                    const expectedPath = path.join(inputDir, fileName);

                    // 3. Kiểm tra file có tồn tại không
                    if (fs.existsSync(expectedPath)) {
                        localPath = expectedPath;
                        console.log(`   ✅ Tìm thấy: ${fileName}`);
                    } else {
                        // Fallback: Thử tìm trong public/static nếu lỡ lưu nhầm chỗ
                        const backupPath = path.join(__dirname, '../public/static', fileName);
                        if (fs.existsSync(backupPath)) {
                            localPath = backupPath;
                            console.log(`   ⚠️ Tìm thấy ở backup: ${fileName}`);
                        } else {
                            console.warn(`   ❌ Không tìm thấy file: ${fileName} tại ${inputDir}`);
                            return; // Bỏ qua file lỗi
                        }
                    }
                } else {
                    // Trường hợp gửi full path từ server
                    if (fs.existsSync(rawPath)) {
                         localPath = rawPath;
                    }
                }

                command.input(localPath);
                validFilesCount++;
            });

            if (validFilesCount < 2) {
                return reject(new Error(`Cần ít nhất 2 file để ghép (Tìm thấy: ${validFilesCount})`));
            }

            command
                .on('error', (err) => {
                    console.error('FFmpeg Error:', err.message);
                    reject(err);
                })
                .on('end', () => {
                    console.log('✅ Ghép xong:', outputFileName);
                    resolve();
                })
                .mergeToFile(outputPath, TEMP_DIR); // Dùng TEMP_DIR làm bộ nhớ đệm xử lý
        });

        res.json({
            success: true,
            message: 'Đã ghép video thành công!',
            url: `/outputs/${outputFileName}`,
            fullPath: outputPath
        });

    } catch (err) {
        console.error('[ComicController] Merge Error:', err.message);
        res.status(500).json({ error: err.message });
    }
};