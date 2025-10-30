const textDetectionService = require('../services/textDetectionService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'tmp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'comic-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép upload file ảnh (JPEG, PNG, GIF, WebP)'));
        }
    }
});

const uploadMultiple = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép upload file ảnh (JPEG, PNG, GIF, WebP)'));
        }
    }
});

class TextDetectionController {
    
    /**
     * POST /api/text-detection/detect
     * Detect text trong comic image được upload
     */
    async detectTextInComic(req, res) {
        try {
            console.log('[TextDetectionController] Text detection request received');
            
            const uploadSingle = upload.single('comicImage');
            
            uploadSingle(req, res, async (err) => {
                if (err) {
                    console.error('[TextDetectionController] Upload error:', err);
                    return res.status(400).json({
                        success: false,
                        error: err.message
                    });
                }
                
                if (!req.file) {
                    return res.status(400).json({
                        success: false,
                        error: 'Không có file ảnh được upload'
                    });
                }
                
                try {
                    console.log(`[TextDetectionController] Processing uploaded file: ${req.file.filename}`);
                    
                    const result = await textDetectionService.detectTextInComic(req.file.path);
                    
                    // Cleanup uploaded file
                    try {
                        fs.unlinkSync(req.file.path);
                    } catch (cleanupError) {
                        console.warn(`[TextDetectionController] Failed to cleanup file: ${cleanupError.message}`);
                    }
                    
                    if (result.success) {
                        res.json({
                            success: true,
                            data: result.data,
                            message: 'Text detection completed successfully'
                        });
                    } else {
                        res.status(500).json({
                            success: false,
                            error: result.error,
                            message: 'Text detection failed'
                        });
                    }
                    
                } catch (error) {
                    console.error('[TextDetectionController] Processing error:', error);
                    
                    // Cleanup uploaded file
                    try {
                        fs.unlinkSync(req.file.path);
                    } catch (cleanupError) {
                        console.warn(`[TextDetectionController] Failed to cleanup file: ${cleanupError.message}`);
                    }
                    
                    res.status(500).json({
                        success: false,
                        error: error.message,
                        message: 'Internal server error during text detection'
                    });
                }
            });
            
        } catch (error) {
            console.error('[TextDetectionController] Controller error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Internal server error'
            });
        }
    }

    /**
     * HÀM MỚI
     * POST /api/text-detection/detect-multiple
     * Detect text trong nhiều comic images được upload
     */
    async detectTextInComicMultiple(req, res) {
        try {
            console.log('[TextDetectionController] Multiple text detection request received');
            
            const uploadArray = uploadMultiple.array('comicImages', 10); // field name là 'comicImages'
            
            uploadArray(req, res, async (err) => {
                if (err) {
                    console.error('[TextDetectionController] Upload multiple error:', err);
                    return res.status(400).json({ success: false, error: err.message });
                }
                
                if (!req.files || req.files.length === 0) {
                    return res.status(400).json({ success: false, error: 'Không có file ảnh nào được upload' });
                }

                const results = [];
                const errors = [];

                // Xử lý tuần tự từng file
                for (let i = 0; i < req.files.length; i++) {
                    const file = req.files[i];
                    try {
                        console.log(`[TextDetectionController] Processing file ${i+1}: ${file.filename}`);
                        const result = await textDetectionService.detectTextInComic(file.path);
                        
                        if (result.success) {
                             results.push({ success: true, data: { ...result.data, fileName: file.originalname } });
                        } else {
                            errors.push({ success: false, error: result.error, fileName: file.originalname });
                        }
                        
                        // Cleanup
                        try { fs.unlinkSync(file.path); } catch (e) { console.warn('Failed to cleanup file'); }

                    } catch (error) {
                        errors.push({ success: false, error: error.message, fileName: file.originalname });
                        // Cleanup
                        try { fs.unlinkSync(file.path); } catch (e) { console.warn('Failed to cleanup file'); }
                    }
                }
                
                return res.json({
                    totalFiles: req.files.length,
                    successful: results.length,
                    failed: errors.length,
                    results: [...results, ...errors]
                });

            });
            
        } catch (error) {
            console.error('[TextDetectionController] Controller multiple error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * HÀM MỚI
     * POST /api/text-detection/detect-from-data
     * Detect text trong nhiều ảnh dùng panel data có sẵn
     */
    async detectTextFromData(req, res) {
        try {
            console.log('[TextDetectionController] Detect text from data request received');
            
            const uploadArray = uploadMultiple.array('comicImages', 10);
            
            uploadArray(req, res, async (err) => {
                if (err) return res.status(400).json({ success: false, error: err.message });
                if (!req.files || req.files.length === 0) {
                    return res.status(400).json({ success: false, error: 'Không có file ảnh nào được upload' });
                }

                // Lấy panelData từ body
                const { panelData } = req.body;
                let parsedData = [];
                if (panelData) {
                    try { parsedData = JSON.parse(panelData); }
                    catch (e) { console.warn('panelData không hợp lệ, sẽ tự động detect'); }
                }

                const results = [];
                const errors = [];

                for (let i = 0; i < req.files.length; i++) {
                    const file = req.files[i];
                    try {
                        // Tìm data panel tương ứng
                        const filePanelData = parsedData.find(d => d.fileName === file.originalname);
                        let panelJson = null;
                        if (filePanelData && filePanelData.panels) {
                            panelJson = JSON.stringify(filePanelData.panels);
                        } else {
                          console.warn(`[detectTextFromData] Không tìm thấy panelData cho: ${file.originalname}. Sẽ tự động detect.`);
                        }

                        // Gọi service MỚI
                        const result = await textDetectionService.detectTextInComicFromData(file.path, panelJson);
                        
                        if (result.success) {
                             results.push({ success: true, data: { ...result.data, fileName: file.originalname } });
                        } else {
                            errors.push({ success: false, error: result.error, fileName: file.originalname });
                        }
                        
                        fs.unlinkSync(file.path);
                    } catch (error) {
                        errors.push({ success: false, error: error.message, fileName: file.originalname });
                        try { fs.unlinkSync(file.path); } catch (e) {}
                    }
                }
                
                return res.json({
                    totalFiles: req.files.length,
                    successful: results.length,
                    failed: errors.length,
                    results: [...results, ...errors]
                });
            });
            
        } catch (error) {
            console.error('[TextDetectionController] Controller from data error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
    
    /**
     * POST /api/text-detection/detect-url
     * Detect text trong comic image từ URL
     */
    async detectTextFromUrl(req, res) {
        try {
            const { imageUrl } = req.body;
            
            if (!imageUrl) {
                return res.status(400).json({
                    success: false,
                    error: 'Thiếu imageUrl trong request body'
                });
            }
            
            console.log(`[TextDetectionController] Text detection from URL: ${imageUrl}`);
            
            // Download image từ URL (cần implement download function)
            const imagePath = await this.downloadImageFromUrl(imageUrl);
            
            try {
                const result = await textDetectionService.detectTextInComic(imagePath);
                
                // Cleanup downloaded file
                try {
                    fs.unlinkSync(imagePath);
                } catch (cleanupError) {
                    console.warn(`[TextDetectionController] Failed to cleanup downloaded file: ${cleanupError.message}`);
                }
                
                if (result.success) {
                    res.json({
                        success: true,
                        data: result.data,
                        message: 'Text detection completed successfully'
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: result.error,
                        message: 'Text detection failed'
                    });
                }
                
            } catch (error) {
                // Cleanup downloaded file
                try {
                    fs.unlinkSync(imagePath);
                } catch (cleanupError) {
                    console.warn(`[TextDetectionController] Failed to cleanup downloaded file: ${cleanupError.message}`);
                }
                
                throw error;
            }
            
        } catch (error) {
            console.error('[TextDetectionController] URL detection error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to process image from URL'
            });
        }
    }
    
    /**
     * POST /api/text-detection/detect-panel
     * Detect text trong một panel cụ thể
     */
    async detectTextInPanel(req, res) {
        try {
            const { imageUrl, panel } = req.body;
            
            if (!imageUrl || !panel) {
                return res.status(400).json({
                    success: false,
                    error: 'Thiếu imageUrl hoặc panel info trong request body'
                });
            }
            
            console.log(`[TextDetectionController] Panel text detection:`, panel);
            
            const imagePath = await this.downloadImageFromUrl(imageUrl);
            
            try {
                const result = await textDetectionService.detectTextInPanel(imagePath, panel);
                
                // Cleanup downloaded file
                try {
                    fs.unlinkSync(imagePath);
                } catch (cleanupError) {
                    console.warn(`[TextDetectionController] Failed to cleanup downloaded file: ${cleanupError.message}`);
                }
                
                if (result.success) {
                    res.json({
                        success: true,
                        data: result.data,
                        message: 'Panel text detection completed successfully'
                    });
                } else {
                    res.status(500).json({
                        success: false,
                        error: result.error,
                        message: 'Panel text detection failed'
                    });
                }
                
            } catch (error) {
                // Cleanup downloaded file
                try {
                    fs.unlinkSync(imagePath);
                } catch (cleanupError) {
                    console.warn(`[TextDetectionController] Failed to cleanup downloaded file: ${cleanupError.message}`);
                }
                
                throw error;
            }
            
        } catch (error) {
            console.error('[TextDetectionController] Panel detection error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to process panel text detection'
            });
        }
    }
    
    /**
     * POST /api/text-detection/batch-detect
     * Batch detect text trong nhiều images
     */
    async batchDetectText(req, res) {
        try {
            const { imageUrls } = req.body;
            
            if (!imageUrls || !Array.isArray(imageUrls)) {
                return res.status(400).json({
                    success: false,
                    error: 'Thiếu imageUrls array trong request body'
                });
            }
            
            if (imageUrls.length > 10) {
                return res.status(400).json({
                    success: false,
                    error: 'Tối đa 10 images mỗi lần batch processing'
                });
            }
            
            console.log(`[TextDetectionController] Batch text detection for ${imageUrls.length} images`);
            
            const results = [];
            
            for (const imageUrl of imageUrls) {
                try {
                    const imagePath = await this.downloadImageFromUrl(imageUrl);
                    const result = await textDetectionService.detectTextInComic(imagePath);
                    
                    // Cleanup downloaded file
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (cleanupError) {
                        console.warn(`[TextDetectionController] Failed to cleanup downloaded file: ${cleanupError.message}`);
                    }
                    
                    results.push({
                        imageUrl,
                        ...result
                    });
                    
                } catch (error) {
                    results.push({
                        imageUrl,
                        success: false,
                        error: error.message,
                        data: null
                    });
                }
            }
            
            res.json({
                success: true,
                data: results,
                message: `Batch text detection completed for ${imageUrls.length} images`
            });
            
        } catch (error) {
            console.error('[TextDetectionController] Batch detection error:', error);
            res.status(500).json({
                success: false,
                error: error.message,
                message: 'Failed to process batch text detection'
            });
        }
    }
    
    /**
     * Download image từ URL về local
     */
    async downloadImageFromUrl(imageUrl) {
        const https = require('https');
        const http = require('http');
        const path = require('path');
        
        return new Promise((resolve, reject) => {
            const client = imageUrl.startsWith('https') ? https : http;
            const filename = `temp-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
            const filepath = path.join(__dirname, '..', 'tmp', filename);
            
            const file = fs.createWriteStream(filepath);
            
            client.get(imageUrl, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download image: ${response.statusCode}`));
                    return;
                }
                
                response.pipe(file);
                
                file.on('finish', () => {
                    file.close();
                    resolve(filepath);
                });
                
                file.on('error', (err) => {
                    fs.unlink(filepath, () => {}); // Delete the file on error
                    reject(err);
                });
                
            }).on('error', (err) => {
                reject(err);
            });
        });
    }
}

module.exports = new TextDetectionController();
