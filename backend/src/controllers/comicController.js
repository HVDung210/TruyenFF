const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Ensure temp directory exists
const TEMP_DIR = path.join(__dirname, '..', 'tmp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Path to Python script
const PY_SCRIPT = path.join(__dirname, '..', 'scripts', 'panel_detector_yolo.py');

const processSingleFile = (file, startTime) => {
  return new Promise((resolve, reject) => {
    const uploadedPath = file.path;
    
    // Validate file path exists
    if (!uploadedPath || !fs.existsSync(uploadedPath)) {
      return reject({
        error: 'File không tồn tại',
        details: `File path: ${uploadedPath}`,
        fileName: file.originalname
      });
    }
    
    console.log('[processSingleFile] Start processing:', {
      file: {
        path: uploadedPath,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      },
      script: PY_SCRIPT,
    });

    // Call Python script
    const pythonCmd = process.env.PYTHON_CMD || 'python';
    const args = [PY_SCRIPT, uploadedPath];
    console.log('[processSingleFile] Spawning python:', pythonCmd, args.join(' '));
    const py = spawn(pythonCmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      const stderrData = data.toString();
      stderr += stderrData;
      // Hiển thị log từ Python script ngay lập tức
      console.log('[PYTHON STDERR]', stderrData.trim());
    });

    py.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      console.log('[processSingleFile] Python exited:', {
        code,
        durationMs,
        stdoutBytes: Buffer.byteLength(stdout || ''),
        stderrBytes: Buffer.byteLength(stderr || ''),
      });

      if (code !== 0) {
        console.error('[processSingleFile] Python error:', stderr.trim());
        // Cleanup file after error
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
          width: result?.width,
          height: result?.height,
          durationMs,
          fileName: file.originalname
        });
        
        // Cleanup uploaded file AFTER successful processing
        fs.unlink(uploadedPath, (err) => {
          if (err) console.error('[processSingleFile] Error deleting file:', err);
        });
        
        resolve({ ...result, fileName: file.originalname, processingTime: durationMs });
      } catch (e) {
        console.error('[processSingleFile] JSON parse error:', e.message);
        // Cleanup file after error
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

exports.detectPanels = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Thiếu file ảnh (field name: file)' });
    }

    const result = await processSingleFile(req.file, Date.now());
    return res.json(result);
  } catch (err) {
    console.error('[detectPanels] Fatal controller error:', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.detectPanelsMultiple = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Thiếu file ảnh (field name: files)' });
    }

    const results = [];
    const errors = [];

    // Process files sequentially to avoid overwhelming the system
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      try {
        const result = await processSingleFile(file, Date.now());
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


