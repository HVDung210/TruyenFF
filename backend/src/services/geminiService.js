const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Dùng Gemini 2.0 Flash (Bản mới nhất, đọc ảnh + chữ cực nhanh)
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", 
    generationConfig: { responseMimeType: "application/json" },
    safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ]
});

exports.analyzePanelMotion = async (imageBase64) => {
  try {
    // Prompt nâng cấp: Kết hợp cả Hình ảnh + Nội dung Text
    const prompt = `
      Analyze this comic panel for video generation using Stable Video Diffusion (SVD).
      
      Combine VISUAL CUES (speed lines, poses, blur) and TEXT CONTEXT (SFX, dialogue) to determine motion intensity.

      RULES FOR ANALYSIS:
      1. **Text/SFX**: 
         - Loud SFX ("BOOM", "CRASH", "SWOOSH") -> HIGH MOTION.
         - Dialogue/Monologue -> LOW MOTION.
      2. **Visuals**:
         - Fight, Explosion, Running -> HIGH MOTION.
         - Walking, Wind, Shock -> MEDIUM MOTION.
         - Standing, Close-up face -> LOW MOTION.

      *** CRITICAL SVD SETTINGS (Follow strictly): ***
      
      - HIGH MOTION (Action/SFX):
        * motion_score: 110 - 127 (Do NOT exceed 127 to prevent image distortion).
        * recommended_fps: 8 - 10 (Smoother for action).
        
      - MEDIUM MOTION (Walking/Wind):
        * motion_score: 60 - 90 (Natural movement).
        * recommended_fps: 7 - 8.
        
      - LOW MOTION (Talking/Static):
        * motion_score: 20 - 40 (Keep faces stable, subtle movement only).
        * recommended_fps: 6 (Slower playback).

      Output strictly in this JSON format:
      {
        "description": "Brief description of action",
        "category": "ACTION" or "TALK" or "SCENERY",
        "motion_score": Integer,
        "recommended_fps": Integer
      }
    `;
    
    const result = await model.generateContent([
        prompt, 
        { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
    ]);
    
    const responseText = result.response.text();
    return JSON.parse(responseText);

  } catch (error) {
    console.error("Gemini Vision Error:", error.message);
    return { 
        motion_score: 127, 
        recommended_fps: 7, 
        category: "ERROR",
        description: "Fallback due to error"
    };
  }
};