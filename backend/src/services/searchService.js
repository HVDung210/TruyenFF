const path = require('path');
const fs = require('fs');
const { getGeminiModel } = require('../config/gemini');

async function llmSearch(query) {
  const dataPath = path.join(__dirname, '..', 'stories.json');
  const storiesData = await fs.promises.readFile(dataPath, 'utf8');
  const stories = JSON.parse(storiesData);

  const prompt = `Bạn là chuyên gia truyện tranh. Với yêu cầu: "${query}"
      Hãy phân tích và trả về kết quả theo định dạng JSON sau:
      {
        "ids": [1, 5, 9],
        "reasoning": [
          "Lý do chọn truyện id 1: ...",
          "Lý do chọn truyện id 5: ...",
          "Lý do chọn truyện id 9: ..."
        ]
      }

      Danh sách truyện:
      ${stories.map((story) =>
        `id: ${story.id}
      Tên: ${story.title}
      Mô tả: ${story.description}
      Thể loại: ${story.genres.join(', ')}`
      ).join('\n\n')}
      `;

  const model = getGeminiModel('gemini-1.5-flash');
  const result = await model.generateContent(prompt);
  const response = await result.response;

  let ids, reasoning;
  const responseText = response.text();
  console.log('Raw response:', responseText);
  try {
    try {
      const jsonResponse = JSON.parse(responseText);
      ids = jsonResponse.ids;
      reasoning = jsonResponse.reasoning;
    } catch (parseError) {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonResponse = JSON.parse(jsonMatch[0]);
        ids = jsonResponse.ids;
        reasoning = jsonResponse.reasoning;
      } else {
        const numbers = responseText.match(/\d+/g);
        ids = numbers ? numbers.slice(0, 3).map(Number) : [];
        reasoning = ["Không thể phân tích lý do từ AI response"];
      }
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Không tìm thấy id truyện phù hợp");
    }
  } catch (err) {
    throw new Error('Lỗi xử lý kết quả tìm kiếm');
  }

  const matchedStories = stories.filter(story => ids.includes(story.id));
  console.log('\n=== KẾT QUẢ TÌM KIẾM ===');
  console.log('Query:', query);
  console.log('IDs được chọn:', ids);
  console.log('Lý do lựa chọn:');
  (reasoning || []).forEach((reason, index) => {
    console.log(`${index + 1}. ${reason}`);
  });
  console.log('========================\n');
  return { stories: matchedStories, reasoning: reasoning || [], query };
}

module.exports = { llmSearch };


