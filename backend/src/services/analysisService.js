const { getGeminiModel } = require('../config/gemini');

async function analyzeNovelToPanels(novelContent, meta = {}) {
  const analysisPrompt = `
    Bạn là chuyên gia chuyển đổi truyện chữ thành truyện tranh. Hãy phân tích đoạn truyện sau và chia thành TỐI THIỂU 15-20 panels truyện tranh chi tiết.

    Nội dung truyện chữ:
    """
    ${novelContent}
    """

    YÊU CẦU CHI TIẾT:
    - Tạo TỐI THIỂU 15-20 panels để kể đầy đủ câu chuyện
    - Chia nhỏ từng cảnh thành nhiều góc quay khác nhau
    - Mỗi cảnh hành động nên có 3-5 panels (wide shot thiết lập → medium shot tương tác → close up cảm xúc)
    - Mỗi đoạn hội thoại dài nên chia thành nhiều panels
    - Thêm các panel chuyển cảnh (transition panels) giữa các tình huống
    - Thêm các panel phản ứng (reaction shots) của các nhân vật khác
    - Chi tiết hóa các hành động phức tạp thành từng bước

    NGUYÊN TẮC CHIA PANEL:
    1. Thiết lập cảnh (wide shot)
    2. Hành động chính (medium shot) 
    3. Phản ứng/cảm xúc (close up)
    4. Chi tiết quan trọng (extreme close up nếu cần)
    5. Panel chuyển cảnh

    Ví dụ: Thay vì 1 panel "A nói chuyện với B", hãy tạo:
    - Panel 1: Wide shot thiết lập không gian A và B
    - Panel 2: Medium shot A bắt đầu nói
    - Panel 3: Close up mặt A với cảm xúc
    - Panel 4: Medium shot B lắng nghe/phản ứng
    - Panel 5: Close up mặt B với cảm xúc phản ứng

    Hãy trả về kết quả theo định dạng JSON sau với TỐI THIỂU 15-20 panels:
    {
      "panels": [
        {
          "panel_id": 1,
          "scene_type": "establishing|dialogue|action|reaction|transition|detail",
          "characters": ["character1", "character2"],
          "setting": "mô tả bối cảnh ngắn gọn",
          "dialogue": {
            "speaker": "tên nhân vật hoặc null",
            "text": "nội dung thoại hoặc null",
            "emotion": "happy|sad|angry|surprised|neutral|thinking|determined|worried"
          },
          "action": "mô tả hành động diễn ra trong panel",
          "visual_description": "mô tả chi tiết hình ảnh cần vẽ",
          "panel_size": "small|medium|large|full_width",
          "camera_angle": "close_up|medium_shot|wide_shot|bird_eye|worm_eye|over_shoulder|dutch_angle",
          "sequence_note": "vị trí trong chuỗi hành động (setup/action/reaction/detail/transition)"
        }
      ],
      "total_panels": "số lượng panels đã tạo (phải >= 15)",
      "chapter_summary": "tóm tắt nội dung chương",
      "main_characters": ["danh sách nhân vật chính"],
      "key_scenes": ["cảnh quan trọng 1", "cảnh quan trọng 2"],
      "mood": "overall mood của chương",
      "pacing_notes": "ghi chú về nhịp điệu truyện"
    }

    Lưu ý:
    - PHẢI tạo tối thiểu 15-20 panels
    - Mỗi panel nên có 1-2 câu thoại tối đa  
    - Ưu tiên các cảnh có tính chất thị giác cao
    - Tách rõ dialogue và action thành các panels riêng biệt
    - Mô tả visual_description phải chi tiết để AI có thể vẽ được
    - Panel size phù hợp với tầm quan trọng của cảnh
    - Giữ nguyên tinh thần và nội dung gốc nhưng kể chi tiết hơn
    - Thêm các panel cảm xúc và phản ứng để tăng tính kịch tính
    `;

  const model = getGeminiModel('gemini-1.5-flash');
  const result = await model.generateContent(analysisPrompt);
  const response = await result.response;
  const responseText = response.text();
  console.log('Analysis response:', responseText);
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Không thể parse JSON response');
  let analysisData = JSON.parse(jsonMatch[0]);
  if (!analysisData.panels || analysisData.panels.length < 15) {
    const retryPrompt = analysisPrompt + `

    QUAN TRỌNG: Kết quả trước chỉ có ${analysisData.panels?.length || 0} panels. 
    HÃY TẠO CHÍNH XÁC 15-20 PANELS. Chia nhỏ từng cảnh thành nhiều góc quay khác nhau.
    Nếu câu chuyện ngắn, hãy thêm:
    - Panels thiết lập không gian chi tiết hơn
    - Panels cảm xúc và suy nghĩ nội tâm của nhân vật  
    - Panels chi tiết về đối tượng, vũ khí, môi trường
    - Panels chuyển cảnh mượt mà
    - Panels phản ứng của những nhân vật phụ`;
    const retryResult = await model.generateContent(retryPrompt);
    const retryResponse = await retryResult.response;
    const retryText = retryResponse.text();
    const retryMatch = retryText.match(/\{[\s\S]*\}/);
    if (retryMatch) {
      const retryData = JSON.parse(retryMatch[0]);
      if (retryData.panels && retryData.panels.length >= 15) analysisData = retryData;
    }
  }
  console.log('\n=== PHÂN TÍCH TRUYỆN CHỮ ===');
  console.log('Số panels:', analysisData.panels?.length || 0);
  console.log('Nhân vật chính:', analysisData.main_characters);
  console.log('============================\n');
  return analysisData;
}

module.exports = { analyzeNovelToPanels };


