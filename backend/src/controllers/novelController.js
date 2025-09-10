const { analyzeNovelToPanels } = require('../services/analysisService');
const { getNovelContent, proxyImage } = require('../services/contentService');
const { generateImages, generateImagesConsistent } = require('../services/imageService');
const { uploadBase64ToGCSWithRetry } = require('../services/gcsService');
const { storage, GCS_BUCKET_NAME } = require('../config/gcs');
const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');
const { getSpeechBubbleConfig, calculateBubblePosition, drawSpeechBubble } = require('../utils/speech');

async function analyze(req, res) {
  try {
    const { storyId, chapterNumber, novelContent } = req.body;
    if (!novelContent) return res.status(400).json({ error: 'Vui lòng cung cấp nội dung truyện chữ' });
    const analysis = await analyzeNovelToPanels(novelContent, { storyId, chapterNumber });
    console.log('\n=== PHÂN TÍCH TRUYỆN CHỮ ===');
    console.log('Story ID:', storyId);
    console.log('Chapter:', chapterNumber);
    console.log('Số panels:', analysis.panels?.length || 0);
    console.log('Nhân vật chính:', analysis.main_characters);
    console.log('============================\n');
    res.json({ success: true, storyId, chapterNumber, analysis, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi phân tích nội dung truyện', details: error.message });
  }
}

async function addDialogue(req, res) {
  try {
    const { panels } = req.body;
    if (!panels || panels.length === 0) return res.status(400).json({ error: 'Vui lòng cung cấp danh sách panels có ảnh' });
    const processedPanels = [];
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      console.log(`Adding dialogue to panel ${panel.panel_id} (${i + 1}/${panels.length})`);
      try {
        if (!panel.image_generation?.image_data || !panel.dialogue?.text) {
          processedPanels.push({ ...panel, dialogue_added: false, reason: !panel.image_generation?.image_data ? 'No image' : 'No dialogue' });
          continue;
        }
        const base64Data = panel.image_generation.image_data.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imageInfo = await sharp(imageBuffer).metadata();
        const { width, height } = imageInfo;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const image = await loadImage(imageBuffer);
        ctx.drawImage(image, 0, 0, width, height);
        const bubbleConfig = getSpeechBubbleConfig(panel.scene_type, panel.camera_angle, panel.dialogue.emotion);
        const bubblePosition = calculateBubblePosition(width, height, bubbleConfig, panel);
        drawSpeechBubble(ctx, panel.dialogue.text, bubblePosition, bubbleConfig, panel.dialogue.speaker);
        const finalImageBuffer = canvas.toBuffer('image/png');
        const finalBase64 = finalImageBuffer.toString('base64');
        const finalDataUrl = `data:image/png;base64,${finalBase64}`;
        processedPanels.push({
          ...panel,
          image_generation: { ...panel.image_generation, image_data: finalDataUrl, dialogue_added: true, dialogue_text: panel.dialogue.text, dialogue_speaker: panel.dialogue.speaker },
          dialogue_added: true,
        });
      } catch (panelError) {
        console.error(`Error processing panel ${panel.panel_id}:`, panelError);
        processedPanels.push({ ...panel, dialogue_added: false, error: panelError.message });
      }
    }
    const successCount = processedPanels.filter(p => p.dialogue_added).length;
    res.json({ success: true, panels: processedPanels, total_panels: panels.length, dialogue_added_count: successCount, success_rate: Math.round((successCount / panels.length) * 100), timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi thêm lời thoại vào ảnh', details: error.message });
  }
}

async function generateImagesController(req, res) {
  try {
    const { panels, storyContext, styleReference } = req.body;
    if (!panels || panels.length === 0) return res.status(400).json({ error: 'Vui lòng cung cấp danh sách panels' });
    const { generatedPanels, successfulGenerations } = await generateImages(panels, storyContext, styleReference);
    console.log('\n=== SINH HÌNH ẢNH PANELS - SUMMARY ===');
    console.log('Số panels xử lý:', generatedPanels.length);
    console.log('Panels thành công:', successfulGenerations);
    console.log('Panels thất bại:', generatedPanels.length - successfulGenerations);
    console.log('Tỷ lệ thành công:', `${Math.round((successfulGenerations / generatedPanels.length) * 100)}%`);
    console.log('=====================================\n');
    res.json({ success: true, panels: generatedPanels, total_panels: generatedPanels.length, successful_generations: successfulGenerations, success_rate: Math.round((successfulGenerations / generatedPanels.length) * 100), timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi sinh hình ảnh panels', details: error.message });
  }
}

async function generateImagesConsistentController(req, res) {
  try {
    const { panels, storyContext, styleReference, characterReferences } = req.body;
    if (!panels || panels.length === 0) return res.status(400).json({ error: 'Vui lòng cung cấp danh sách panels' });
    if (!characterReferences) return res.status(400).json({ error: 'Vui lòng cung cấp character references' });
    const { generatedPanels, successfulGenerations } = await generateImagesConsistent(panels, storyContext, styleReference, characterReferences);
    console.log('\n=== SINH HÌNH ẢNH VỚI CHARACTER CONSISTENCY ===');
    console.log('Số panels xử lý:', generatedPanels.length);
    console.log('Panels thành công:', successfulGenerations);
    console.log('Tỷ lệ thành công:', `${Math.round((successfulGenerations / generatedPanels.length) * 100)}%`);
    console.log('================================================\n');
    res.json({ success: true, panels: generatedPanels, total_panels: generatedPanels.length, successful_generations: successfulGenerations, success_rate: Math.round((successfulGenerations / generatedPanels.length) * 100), character_consistency_applied: true, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi sinh hình ảnh với character consistency', details: error.message });
  }
}

async function uploadSinglePanelToGcs(req, res) {
  try {
    const { panel, storyName, chapterNumber, panelIndex, totalPanels, retryAttempt = 0 } = req.body;
    if (!panel || !panel.image_generation?.image_data) return res.status(400).json({ error: 'Panel không có dữ liệu hình ảnh' });
    if (!storage) return res.status(500).json({ error: 'Google Cloud Storage chưa được cấu hình' });
    const payloadSize = JSON.stringify(req.body).length;
    const imageSizeEstimate = panel.image_generation.image_data.length;
    if (payloadSize > 95 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payload quá lớn', details: `Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)}MB > 95MB limit`, suggested_action: 'Hãy compress image thêm' });
    }
    const storyNameFormatted = (storyName || 'unknown-story').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const chapterFormatted = `Chapter_${chapterNumber || 1}`;
    const imageData = panel.image_generation.image_data;
    if (!imageData || typeof imageData !== 'string') throw new Error('Invalid base64 image data');
    const cleanBase64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) throw new Error('Invalid base64 format');
    const imageSizeBytes = (cleanBase64.length * 3) / 4;
    if (imageSizeBytes > 95 * 1024 * 1024) {
      return res.status(413).json({ error: 'Image quá lớn cho GCS', details: `Image size: ${(imageSizeBytes / 1024 / 1024).toFixed(2)}MB > 95MB`, suggested_action: 'Cần compress image nhiều hơn' });
    }
    const timestamp = Date.now();
    const compressed = panel.image_generation.compressed ? '-compressed' : '';
    const panelFileName = `${panel.panel_id}.jpg`;
    const gcsPath = `${storyNameFormatted}/${chapterFormatted}/${panelFileName}`;
    const gcsUrl = await uploadBase64ToGCSWithRetry(cleanBase64, gcsPath, 3);
    const uploadedPanel = { ...panel, gcs_upload: { success: true, public_url: gcsUrl, gcs_path: gcsPath, filename: panelFileName, upload_time: new Date().toISOString(), image_size_mb: (imageSizeBytes / 1024 / 1024).toFixed(2), payload_size_mb: (payloadSize / 1024 / 1024).toFixed(2), compressed: panel.image_generation.compressed || false, retry_count: retryAttempt } };
    res.json({ success: true, panel: uploadedPanel, story_name: storyNameFormatted, chapter_number: chapterNumber, progress: { current: panelIndex + 1, total: totalPanels } });
  } catch (error) {
    if (error.message.includes('PayloadTooLargeError') || error.status === 413) {
      return res.status(413).json({ error: 'Payload quá lớn - vượt quá giới hạn server', details: error.message, suggested_actions: ['Compress image với quality thấp hơn', 'Giảm resolution của image', 'Sử dụng streaming upload thay vì JSON payload'] });
    }
    res.status(200).json({ success: false, panel: req.body.panel ? { ...req.body.panel, gcs_upload: { success: false, error: error.message, upload_time: new Date().toISOString(), retry_count: req.body.retryAttempt || 0, payload_size_mb: req.body.panel ? (JSON.stringify(req.body).length / 1024 / 1024).toFixed(2) : undefined } } : undefined, error: error.message });
  }
}

async function uploadPanelStream(req, res) {
  try {
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
      return res.status(413).json({ error: `File too large: ${(contentLength/1024/1024).toFixed(2)}MB > 100MB limit`, suggested_action: 'Compress image more aggressively' });
    }
    const { panelId, storyName, chapterNumber, panelIndex, totalPanels, compressed, originalSize } = req.query;
    if (!storage) return res.status(500).json({ error: 'Google Cloud Storage chưa được cấu hình' });
    const storyNameFormatted = (storyName || 'unknown-story').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const panelFileName = `${panelId}.png`;
    const gcsPath = `${storyNameFormatted}/Chapter_${chapterNumber}/${panelFileName}`;
    const file = storage.bucket(GCS_BUCKET_NAME).file(gcsPath);
    const stream = file.createWriteStream({
      metadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000', customMetadata: { panelId, compressed: compressed || 'false', uploadMethod: 'streaming', originalSize: originalSize || 'unknown' } },
      timeout: 1800000,
      resumable: true,
      retry: { retryDelayMultiplier: 2, totalTimeoutMillis: 2400000, maxRetryDelay: 60000, maxRetries: 5, autoRetry: true }
    });
    let uploadStartTime = Date.now();
    let bytesUploaded = 0;
    stream.on('error', (error) => {
      if (!res.headersSent) res.status(500).json({ error: `Streaming upload failed: ${error.message}`, panelId, bytesUploaded });
    });
    stream.on('finish', () => {
      const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
      const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsPath}`;
      if (!res.headersSent) res.json({ success: true, public_url: publicUrl, gcs_path: gcsPath, filename: panelFileName, upload_time_seconds: uploadTime, bytes_uploaded: bytesUploaded, method: 'streaming' });
    });
    req.pipe(stream);
  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: `Stream setup failed: ${error.message}`, panelId: req.query.panelId });
  }
}

async function getNovelContentController(req, res) {
  try {
    const { filename } = req.params;
    const result = await getNovelContent(filename);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ error: 'Không đọc được file truyện chữ', details: error.message });
  }
}

async function proxyImageController(req, res) {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    const { buffer, contentType } = await proxyImage(url);
    res.set({ 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' });
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to proxy image' });
  }
}

module.exports = {
  analyze,
  addDialogue,
  generateImagesController,
  generateImagesConsistentController,
  uploadSinglePanelToGcs,
  uploadPanelStream,
  getNovelContentController,
  proxyImageController,
};


