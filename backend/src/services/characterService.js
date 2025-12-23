const { getGeminiModel } = require('../config/gemini');

async function createCharacterRefs(characters, storyContext, images = {}) {
  const basePrompt = `
Bạn là chuyên gia phân tích nhân vật truyện chữ. Hãy tạo character references chi tiết cho các nhân vật dựa trên nội dung truyện.

NHÂN VẬT CẦN TẠO: ${JSON.stringify(characters)}

NỘI DUNG TRUYỆN ĐỂ THAM KHẢO:
"""
${storyContext || 'Không có bối cảnh'}
"""

HÃY ĐỌC KỸ NỘI DUNG TRUYỆN VÀ TẠO MÔ TẢ CHI TIẾT cho từng nhân vật. Nếu nội dung truyện không mô tả rõ, hãy sáng tạo dựa trên tên và bối cảnh.

VÍ DỤ: Nếu có nhân vật tên "Minh", bạn có thể tạo: "nam, 20 tuổi, cao 1m75, vóc dáng thon gọn"

QUAN TRỌNG: PHẢI điền đầy đủ tất cả các trường, không được để trống hoặc "không đề cập".

Trả về JSON format chính xác:
{
  "character_references": {
    "Tên nhân vật": {
      "physical_description": "VÍ DỤ: nam, 25 tuổi, cao 1m70, vóc dáng khỏe mạnh, da ngăm, gương mặt vuông vức",
      "hair": "VÍ DỤ: tóc đen, cắt ngắn gọn, để mái xéo bên phải",
      "eyes": "VÍ DỤ: mắt nâu đen, to tròn, ánh mắt quyết đoán",
      "clothing": "VÍ DỤ: áo sơ mi trắng, quần âu đen, giày da nâu",
      "distinctive_features": "VÍ DỤ: có scar nhỏ ở cằm, đeo đồng hồ bạc ở tay trái",
      "personality_traits": "VÍ DỤ: tính cách mạnh mẽ, quyết đoán, có trách nhiệm"
    }
  }
}

LƯU Ý: 
- KHÔNG được để trống bất kỳ trường nào
- KHÔNG được viết "không đề cập" hay "không có thông tin"  
- HÃY sáng tạo chi tiết phù hợp nếu truyện không mô tả rõ
- Chỉ trả về JSON, không giải thích gì thêm
`;

  const model = getGeminiModel('gemini-2.0-flash');
  const baseResult = await model.generateContent(basePrompt);
  const baseResponse = await baseResult.response;
  const baseText = baseResponse.text();
  const baseJsonMatch = baseText.match(/\{[\s\S]*\}/);
  let characterRefs = {};
  if (baseJsonMatch) {
    const parsedData = JSON.parse(baseJsonMatch[0]);
    if (parsedData.character_references) characterRefs = parsedData.character_references;
  }

  if (Object.keys(images).length === 0) return characterRefs;

  const visionModel = getGeminiModel('gemini-2.0-flash');
  for (const [charName, imageData] of Object.entries(images)) {
    if (!characterRefs[charName]) continue;
    const visionPrompt = `
QUAN TRỌNG: Bạn PHẢI mô tả chi tiết tất cả những gì nhìn thấy trong ảnh. KHÔNG được để trống hay viết "không có thông tin".

Phân tích chi tiết ảnh này của nhân vật "${charName}". Hãy mô tả CHÍNH XÁC những gì bạn nhìn thấy trong ảnh..

Base reference để tham khảo personality: ${characterRefs[charName].personality_traits || 'Không có thông tin'}

Tập trung vào 4 thuộc tính visual chính và mô tả chi tiết:

1. **Physical Description**: Mô tả tổng quan về ngoại hình, vóc dáng, độ tuổi, giới tính
2. **Hair**: Màu sắc chính xác, kiểu dáng, độ dài, texture của tóc
3. **Eyes**: Màu mắt chính xác, hình dáng, size, biểu cảm
4. **Clothing**: Mô tả chi tiết trang phục, màu sắc, style, phụ kiện

Trả về JSON format chính xác:
{
  "physical_description": "mô tả chi tiết ngoại hình nhìn thấy trong ảnh (vóc dáng, độ tuổi, giới tính, làn da)",
  "hair": "mô tả chi tiết tóc từ ảnh (màu sắc CHÍNH XÁC, kiểu dáng, độ dài)",
  "eyes": "mô tả chi tiết mắt từ ảnh (màu sắc CHÍNH XÁC, hình dáng, kích thước)", 
  "clothing": "mô tả chi tiết trang phục trong ảnh (màu sắc, style, chi tiết, phụ kiện)",
  "distinctive_features": "các đặc điểm đặc biệt nhìn thấy trong ảnh (scar, tattoo, jewelry, v.v.)",
  "personality_traits": "${characterRefs[charName].personality_traits || 'Tính cách dựa trên biểu cảm trong ảnh'}"
}

QUAN TRỌNG: 
- Chỉ trả về JSON object, không thêm text giải thích
- Mô tả CHÍNH XÁC những gì nhìn thấy, không suy đoán
- Đặc biệt chú ý màu sắc tóc và mắt phải chính xác 100%
- Physical description phải bao gồm: giới tính, độ tuổi ước tính, vóc dáng, làn da
`;
    const imageBase64 = imageData.buffer.toString('base64');
    const visionResult = await visionModel.generateContent([
      visionPrompt,
      { inlineData: { data: imageBase64, mimeType: imageData.mimetype } }
    ]);
    const visionResponse = await visionResult.response;
    const visionText = visionResponse.text();
    const visionJsonMatch = visionText.match(/\{[\s\S]*\}/);
    if (visionJsonMatch) {
      const enhancedData = JSON.parse(visionJsonMatch[0]);
      characterRefs[charName] = {
        physical_description: enhancedData.physical_description || characterRefs[charName].physical_description,
        hair: enhancedData.hair || characterRefs[charName].hair,
        eyes: enhancedData.eyes || characterRefs[charName].eyes,
        clothing: enhancedData.clothing || characterRefs[charName].clothing,
        distinctive_features: enhancedData.distinctive_features || characterRefs[charName].distinctive_features,
        personality_traits: enhancedData.personality_traits || characterRefs[charName].personality_traits,
      };
    }
  }
  return characterRefs;
}

module.exports = { createCharacterRefs };


