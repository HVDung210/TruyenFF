const { getGeminiModel } = require('../config/gemini');

const MAX_PANELS = parseInt(process.env.MAX_PANELS || '8');

async function analyzeNovelToPanels(novelContent, meta = {}) {
  const analysisPrompt = `
    Bạn là chuyên gia chuyển đổi truyện chữ thành truyện tranh. Hãy phân tích đoạn truyện sau và chia thành CHÍNH XÁC ${MAX_PANELS} panels truyện tranh quan trọng nhất.

    Nội dung truyện chữ:
    """
    ${novelContent}
    """

    YÊU CẦU CHI TIẾT:
    - Tạo CHÍNH XÁC ${MAX_PANELS} panels (không nhiều hơn, không ít hơn)
    - Chọn ${MAX_PANELS} KHOẢNH KHẮC QUAN TRỌNG NHẤT của câu chuyện
    - Ưu tiên các cảnh có tính kịch tính cao, điểm nhấn cảm xúc
    - Bỏ qua các chi tiết nhỏ, tập trung vào cốt truyện chính
    - Mỗi panel phải đại diện cho 1 turning point hoặc moment quan trọng

    NGUYÊN TẮC CHỌN PANEL (${MAX_PANELS} panels):
    1. Opening shot - Thiết lập bối cảnh/nhân vật chính
    2. Inciting incident - Sự kiện khởi đầu xung đột
    3. Rising action - Cao trào xung đột
    4. Climax moment - Điểm cao nhất
    5. Resolution - Kết thúc/hệ quả
    (Thêm 3 panels nếu cần: reaction shots, key dialogue, transition)

    Hãy trả về kết quả theo định dạng JSON sau với CHÍNH XÁC ${MAX_PANELS} panels:
    {
      "panels": [
        {
          "panel_id": 1,
          "scene_type": "establishing|dialogue|action|climax|resolution",
          "characters": ["character1", "character2"],
          "setting": "mô tả bối cảnh ngắn gọn",
          "dialogue": {
            "speaker": "tên nhân vật hoặc null",
            "text": "nội dung thoại quan trọng hoặc null",
            "emotion": "happy|sad|angry|surprised|neutral|thinking|determined|worried"
          },
          "action": "mô tả hành động chính diễn ra",
          "visual_description": "mô tả chi tiết hình ảnh (phải rõ ràng để AI vẽ được)",
          "panel_size": "medium|large|full_width",
          "camera_angle": "close_up|medium_shot|wide_shot|bird_eye|worm_eye|over_shoulder",
          "importance": "high|critical"
        }
      ],
      "total_panels": ${MAX_PANELS},
      "chapter_summary": "tóm tắt nội dung chương",
      "main_characters": ["danh sách nhân vật chính"],
      "key_scenes": ["${MAX_PANELS} cảnh quan trọng đã chọn"],
      "mood": "overall mood của chương",
      "pacing_notes": "ghi chú về cách cô đọng câu chuyện thành ${MAX_PANELS} panels"
    }

    Lưu ý:
    - PHẢI TẠO CHÍNH XÁC ${MAX_PANELS} PANELS
    - Chỉ chọn các moment QUAN TRỌNG NHẤT
    - Mỗi panel = 1 beat quan trọng của câu chuyện
    - Mô tả visual_description phải chi tiết, rõ ràng
    - Panel size ưu tiên medium/large (tránh small)
    - Tập trung vào cốt truyện chính, bỏ qua filler
    `;

  const model = getGeminiModel('gemini-2.0-flash');
  const result = await model.generateContent(analysisPrompt);
  const response = await result.response;
  const responseText = response.text();
  
  console.log('Analysis response length:', responseText.length);
  
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Không thể parse JSON response');
  
  let analysisData = JSON.parse(jsonMatch[0]);
  
  // Kiểm tra và điều chỉnh số panels
  if (!analysisData.panels || analysisData.panels.length !== MAX_PANELS) {
    console.warn(`⚠️  Gemini trả về ${analysisData.panels?.length || 0} panels, yêu cầu ${MAX_PANELS}`);
    
    if (analysisData.panels && analysisData.panels.length > MAX_PANELS) {
      // Nếu quá nhiều, cắt bớt (giữ panels quan trọng nhất)
      analysisData.panels = analysisData.panels.slice(0, MAX_PANELS);
      console.log(`✂️  Đã cắt xuống còn ${MAX_PANELS} panels`);
    } else if (analysisData.panels && analysisData.panels.length < MAX_PANELS) {
      // Nếu quá ít, yêu cầu Gemini tạo thêm
      const retryPrompt = `
QUAN TRỌNG: Kết quả trước chỉ có ${analysisData.panels?.length || 0} panels. 
HÃY TẠO CHÍNH XÁC ${MAX_PANELS} PANELS.

Nội dung truyện:
"""
${novelContent}
"""

Hãy chọn ${MAX_PANELS} KHOẢNH KHẮC QUAN TRỌNG NHẤT và tạo JSON như yêu cầu ban đầu.
PHẢI CÓ CHÍNH XÁC ${MAX_PANELS} panels trong mảng "panels".`;

      const retryResult = await model.generateContent(retryPrompt);
      const retryResponse = await retryResult.response;
      const retryText = retryResponse.text();
      const retryMatch = retryText.match(/\{[\s\S]*\}/);
      
      if (retryMatch) {
        const retryData = JSON.parse(retryMatch[0]);
        if (retryData.panels && retryData.panels.length === MAX_PANELS) {
          analysisData = retryData;
          console.log(`✅ Retry thành công: ${MAX_PANELS} panels`);
        } else if (retryData.panels) {
          // Nếu vẫn sai, điều chỉnh thủ công
          if (retryData.panels.length > MAX_PANELS) {
            analysisData.panels = retryData.panels.slice(0, MAX_PANELS);
          } else {
            analysisData = retryData;
          }
        }
      }
    }
  }
  
  // Đảm bảo total_panels đúng
  analysisData.total_panels = analysisData.panels.length;
  
  console.log('\n=== PHÂN TÍCH TRUYỆN CHỮ ===');
  console.log('Số panels:', analysisData.panels?.length || 0);
  console.log('Giới hạn:', MAX_PANELS);
  console.log('Nhân vật chính:', analysisData.main_characters);
  console.log('============================\n');
  
  return analysisData;
}

module.exports = { analyzeNovelToPanels };