const fs = require('fs');
const { Storage } = require('@google-cloud/storage');
const { GCS_CREDENTIALS, GOOGLE_CLOUD_PROJECT_ID, GCS_BUCKET_NAME } = require('./env');

let storage;
try {
  if (fs.existsSync(GCS_CREDENTIALS)) {
    storage = new Storage({
      keyFilename: GCS_CREDENTIALS,
      projectId: GOOGLE_CLOUD_PROJECT_ID,
    });
  } else {
    storage = new Storage();
  }
} catch (error) {
  console.error('Failed to initialize Google Cloud Storage:', error);
}

module.exports = {
  storage,
  GCS_BUCKET_NAME,
};


