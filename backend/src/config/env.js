const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 5000;

// Payload and timeout configs
const BODY_LIMIT = process.env.BODY_LIMIT || '500mb';
const PARAMETER_LIMIT = Number(process.env.PARAMETER_LIMIT || 100000);
const UPLOAD_TIMEOUT_MS = Number(process.env.UPLOAD_TIMEOUT_MS || 1800000); // 30 minutes

// HuggingFace
const HF_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN || '';
const HF_MODEL = process.env.HUGGING_FACE_MODEL || 'stabilityai/stable-diffusion-xl-base-1.0';

// Google / Gemini
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyBbfbq5diB83Vq7Ts4yI4MMG5waTRvhQ4s';
const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || undefined;

// Google Cloud Storage
const GCS_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || './path/to/your/credentials.json';
const GCS_BUCKET = process.env.GCS_BUCKET || 'your-bucket-name';
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || process.env.GCS_BUCKET || 'truyenff-images';

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || '040c52602904583bdf80ac4f18de14d6e3b30b39381d08d94c6bbb4c8445fcdb8041bad086440355a0c5a57efcd7dcf03a894fcf279f6167ec64a033916ca7c6';

module.exports = {
  PORT,
  BODY_LIMIT,
  PARAMETER_LIMIT,
  UPLOAD_TIMEOUT_MS,
  HF_API_TOKEN,
  HF_MODEL,
  GOOGLE_API_KEY,
  GOOGLE_CLOUD_PROJECT_ID,
  GCS_CREDENTIALS,
  GCS_BUCKET,
  GCS_BUCKET_NAME,
  JWT_SECRET,
};


