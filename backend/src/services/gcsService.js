const { storage, GCS_BUCKET_NAME } = require('../config/gcs');

async function uploadBase64ToGCSWithRetry(base64Data, gcsPath, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 100 * 1024 * 1024) {
        throw new Error(`Buffer too large: ${(buffer.length/1024/1024).toFixed(2)}MB > 100MB limit`);
      }
      const file = storage.bucket(GCS_BUCKET_NAME).file(gcsPath);
      await file.save(buffer, {
        metadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000' },
        timeout: 900000,
        retry: { retryDelayMultiplier: 2, totalTimeoutMillis: 1200000, maxRetryDelay: 30000, maxRetries: 3, autoRetry: true },
      });
      const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsPath}`;
      return publicUrl;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = Math.min(Math.pow(2, attempt) * 3000, 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw new Error(`GCS upload failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
}

module.exports = { uploadBase64ToGCSWithRetry };


