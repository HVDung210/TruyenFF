const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GOOGLE_API_KEY } = require('./env');

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

function getGeminiModel(modelName = 'gemini-2.0-flash') {
  return genAI.getGenerativeModel({ model: modelName });
}

module.exports = {
  genAI,
  getGeminiModel,
};


