const { getGeminiModel } = require('../config/gemini');

async function retryGeminiRequest(prompt, maxRetries = 3, delay = 5000, modelName = 'gemini-2.0-flash') {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = getGeminiModel(modelName);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Gemini attempt ${attempt} failed:`, error.message);
      if (attempt === maxRetries) throw error;
      const waitTime = delay * attempt;
      console.log(`Waiting ${waitTime/1000}s before retry ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

module.exports = { retryGeminiRequest };


