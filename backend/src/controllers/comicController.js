const path = require('path');
const fs = require('fs');
const axios = require('axios');
const https = require('https');
const { spawn } = require('child_process');
const textToSpeechService = require('../services/textToSpeechService');
const videoService = require('../services/videoService');

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

exports.generateScenes = async (req, res) => {
  try {
      // 1. Nhận 2 bộ dữ liệu từ frontend
      const { videoData, cropData } = req.body;

      if (!videoData || !cropData) {
          return res.status(400).json({ success: false, error: 'Thiếu videoData hoặc cropData' });
      }

      console.log(`[ComicController] Nhận yêu cầu tạo scene cho ${cropData.length} file...`);

      const allSceneData = [];

      // 2. Lặp qua từng file (ví dụ: page_01.jpg, page_02.jpg)
      for (const fileCropData of cropData) {
          const fileName = fileCropData.fileName;
          
          // Tìm audio data (chứa duration) tương ứng
          const fileAudioData = videoData.find(f => f.fileName === fileName);
          if (!fileAudioData) continue;

          const fileSceneData = {
              fileName: fileName,
              panels: []
          };

          // 3. Lặp qua từng panel trong file
          for (const panelCrop of fileCropData.panels) {
              const panelId = panelCrop.id;

              // Tìm duration tương ứng
              const panelAudio = fileAudioData.panels.find(p => p.panelId === panelId);
              if (!panelAudio) continue;

              const duration = panelAudio.duration;
              const imageB64 = panelCrop.croppedImageBase64;
              const outputFileName = `${path.parse(fileName).name}_panel_${panelId}.mp4`;

              try {
                  // 4. Gọi VideoService để tạo clip .mp4
                  const { videoPath, videoUrl } = await videoService.createScene(
                      imageB64,
                      duration,
                      outputFileName
                  );
                  
                  fileSceneData.panels.push({
                      panelId: panelId,
                      duration: duration,
                      videoUrl: videoUrl,
                  });

              } catch (error) {
                  console.error(`[ComicController] Lỗi tạo scene cho ${outputFileName}:`, error);
                  // Bỏ qua panel này nếu lỗi
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

/**
 * HÀM MỚI: Tạo video AI từ ảnh (SVD)
 */


// exports.generateVideoAI = async (req, res) => {
//   try {
//     const { filesData } = req.body; 
    
//     if (!filesData || !Array.isArray(filesData)) {
//       return res.status(400).json({ error: 'Thiếu filesData hoặc sai định dạng' });
//     }

//     console.log(`[ComicController] Bắt đầu tạo video AI cho ${filesData.length} file...`);

//     // 1. TẠO FILE TẠM CHỨA INPUT JSON
//     // Thay vì gửi qua pipe, ta ghi xuống đĩa để Python đọc cho ổn định
//     const uniqueId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
//     const inputFilePath = path.join(TEMP_DIR, `input_svd_${uniqueId}.json`);
    
//     // Ghi file (Sync cho đơn giản vì đây là blocking operation cần thiết)
//     fs.writeFileSync(inputFilePath, JSON.stringify({ filesData }), 'utf8');
//     console.log(`[ComicController] Đã ghi input file: ${inputFilePath}`);

//     // 2. GỌI PYTHON
//     const pythonCmd = process.env.PYTHON_CMD || path.join(__dirname, '..', '..', '.venv', 'Scripts', 'python.exe');
//     console.log('[ComicController] Using Python Path:', pythonCmd);
    
//     // Truyền đường dẫn file input vào arguments
//     const py = spawn(pythonCmd, [PY_SCRIPT_ANIMATE, inputFilePath], { stdio: ['ignore', 'pipe', 'pipe'] });

//     let stdout = '';
//     let stderr = '';

//     // Lắng nghe dữ liệu trả về
//     if (py.stdout) {
//         py.stdout.on('data', (data) => { stdout += data.toString(); });
//     }

//     // 3. Nhận log/lỗi từ Python
//     if (py.stderr) {
//       py.stderr.on('data', (data) => { 
//           const msg = data.toString();
//           stderr += msg;
//           console.log('[PYTHON SVD]', msg.trim()); 
//       });
//     }

//     py.on('close', (code) => {
//       // Dọn dẹp file input
//       try {
//           if (fs.existsSync(inputFilePath)) fs.unlinkSync(inputFilePath);
//       } catch (e) { console.warn('Không thể xóa file input tạm:', e.message); }

//       if (code !== 0) {
//         console.error('[generateVideoAI] Python process exited with code:', code);
        
//         // --- SỬA ĐỔI QUAN TRỌNG: In cả stdout để xem lỗi ---
//         console.error('STDERR (Log):', stderr);
//         console.error('STDOUT (Data/Error):', stdout); 
//         // --------------------------------------------------

//         return res.status(500).json({ 
//             error: 'Lỗi sinh video AI (Python Script Failed)', 
//             details: `Log: ${stderr}\nOutput: ${stdout}` // Trả về cả 2 để Frontend xem được
//         });
//       }

//       try {
//         const result = JSON.parse(stdout);
//         if (result.error) return res.status(500).json({ error: result.error });

//         return res.json({
//           success: true,
//           data: result.data,
//           message: 'Sinh video AI thành công'
//         });

//       } catch (e) {
//         console.error('JSON Parse Error:', e);
//         return res.status(500).json({ 
//             error: 'Lỗi đọc kết quả JSON từ Python', 
//             details: e.message,
//             rawOutput: stdout.slice(0, 1000)
//         });
//       }
//     });
    
//     py.on('error', (err) => {
//       console.error('[ComicController] Failed to spawn python:', err);
//       // Dọn dẹp file nếu spawn lỗi
//       if (fs.existsSync(inputFilePath)) fs.unlinkSync(inputFilePath);
//       res.status(500).json({ error: 'Failed to start Python script', details: err.message });
//     });

//   } catch (err) {
//     console.error('[generateVideoAI] Controller Exception:', err);
//     return res.status(500).json({ error: err.message });
//   }
// };

// --- CẤU HÌNH KẾT NỐI COLAB ---
// URL này thay đổi mỗi lần bạn chạy lại Colab, hãy cập nhật nó
const COLAB_API_URL = "https://f9f7ddb8b612.ngrok-free.app/";

const httpsAgent = new https.Agent({ keepAlive: true });

exports.generateVideoAI = async (req, res) => {
  try {
    const { filesData } = req.body;
    if (!filesData) return res.status(400).json({ error: 'Missing filesData' });

    console.log(`[ComicController] Bắt đầu gửi ${filesData.length} file lên Colab...`);
    const finalResults = [];

    // GỬI TỪNG PANEL MỘT (TRÁNH TIMEOUT)
    for (const file of filesData) {
        console.log(`\n📂 File: ${file.fileName}`);
        const processedPanels = [];

        for (const panel of file.panels) {
            console.log(`   👉 Gửi Panel ${panel.panelId} (${panel.duration}s)...`);
            
            try {
                // Gửi 1 panel duy nhất
                const response = await axios.post(`${COLAB_API_URL}/generate`, {
                    filesData: [{
                        fileName: file.fileName,
                        panels: [panel]
                    }]
                }, {
                    timeout: 600000, // 10 phút
                    httpsAgent: httpsAgent,
                    maxBodyLength: Infinity,
                    maxContentLength: Infinity
                });

                if (response.data.success) {
                    const resultPanel = response.data.data[0].panels[0];
                    processedPanels.push(resultPanel);
                    console.log(`      ✅ OK (Mode: ${resultPanel.mode || 'N/A'})`);
                } else {
                    throw new Error('Colab trả về lỗi');
                }
            } catch (err) {
                console.error(`      ❌ Lỗi:`, err.message);
                processedPanels.push({ panelId: panel.panelId, success: false, error: err.message });
            }
        }
        finalResults.push({ fileName: file.fileName, panels: processedPanels });
    }

    return res.json({ success: true, data: finalResults });

  } catch (err) {
    console.error('[ComicController] Fatal Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};