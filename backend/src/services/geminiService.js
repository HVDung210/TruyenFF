const { GoogleGenerativeAI } = require("@google/generative-ai");

// Đảm bảo bạn đã đặt biến môi trường GEMINI_API_KEY trong file .env
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// --- SỬA TÊN MODEL TẠI ĐÂY ---
// Chuyển sang Gemini 2.0 Flash Experimental
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash", 
    generationConfig: { responseMimeType: "application/json" },
    // Tắt bộ lọc an toàn để tránh chặn nhầm ảnh truyện tranh hành động
    safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ]
});

exports.analyzePanelMotion = async (imageBase64) => {
  try {
    // Prompt chi tiết để Gemini 2.0 hiểu ngữ cảnh
    const prompt = `
      Analyze this comic panel for video generation.
      Determine the motion intensity based on visual cues (speed lines, explosions, character expressions).
      
      Output strictly in this JSON format:
      {
        "description": "Brief description of the scene",
        "category": "ACTION" (for fights, explosions, running) or "TALK" (for dialogue, standing still) or "SCENERY",
        "motion_score": Integer between 1 and 255. 
                        (Rules: 
                         - Talk/Static: 30-60 
                         - Walking/Wind: 80-120 
                         - Fight/Run/Explosion: 150-200),
        "recommended_fps": Integer between 6 and 10. (6 for static, 8-10 for action)
      }
    `;
    
    // Gửi ảnh và prompt
    const result = await model.generateContent([
        prompt, 
        { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
    ]);
    
    const responseText = result.response.text();
    return JSON.parse(responseText);

  } catch (error) {
    console.error("Gemini 2.0 Error:", error.message);
    // Trả về giá trị mặc định an toàn nếu AI lỗi
    return { 
        motion_score: 127, 
        recommended_fps: 7, 
        category: "ERROR",
        description: "Fallback due to error"
    };
  }
};