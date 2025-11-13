const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const textToSpeechService = require('../services/textToSpeechService');

// Ensure temp directory exists
const TEMP_DIR = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Path to Python scripts (Đảm bảo cả 2 đều được định nghĩa)
const PY_SCRIPT_DETECT = path.join(__dirname, '..', 'scripts', 'panel_detector_yolo.py');
const PY_SCRIPT_CROP = path.join(__dirname, '..', 'scripts', 'panel_cropper.py');

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