const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Dùng Gemini 2.0 Flash (Bản mới nhất, đọc ảnh + chữ cực nhanh)
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp", 
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
      Analyze this comic panel for video generation.
      
      Combine both VISUAL CUES (speed lines, poses) and TEXT CONTEXT (Speech bubbles, Sound Effects/SFX) to determine the motion intensity.

      RULES FOR ANALYSIS:
      1. **Read the Text/SFX**: 
         - If text contains loud Sound Effects (e.g., "BOOM", "BANG", "CRASH", "SWOOSH") or Shouting ("!!!") -> Lean towards HIGH MOTION.
         - If text is normal dialogue or monologues -> Lean towards LOW MOTION (Static/Talking).
      2. **Observe Visuals**:
         - Action poses, fighting, explosions -> HIGH MOTION.
         - Standing still, close-up faces -> LOW MOTION.

      DECISION LOGIC:
      - High Motion (Score 150-200): Fights, Explosions, Running, Screaming, Loud SFX.
      - Medium Motion (Score 80-120): Walking, Windy hair, Emotional shock, Zoom in.
      - Low Motion (Score 30-60): Talking, Thinking, Scenery, Standing.

      Output strictly in this JSON format:
      {
        "description": "Brief description including what text implies (e.g., 'Character shouting loudly with speed lines')",
        "category": "ACTION" or "TALK" or "SCENERY",
        "motion_score": Integer between 1 and 255,
        "recommended_fps": Integer between 6 and 10
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