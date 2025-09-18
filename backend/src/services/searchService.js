const { PrismaClient } = require('../generated/prisma');
const { getGeminiModel } = require('../config/gemini');

const prisma = new PrismaClient();

async function llmSearch(query) {
  const stories = await prisma.story.findMany({
    include: {
      storyGenres: {
        include: {
          genre: true
        }
      }
    },
    orderBy: {
      story_id: 'asc'
    }
  });

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
        `id: ${story.story_id}
      Tên: ${story.title}
      Mô tả: ${story.description}
      Thể loại: ${story.storyGenres.map(sg => sg.genre.genre_name).join(', ')}`
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

  const matchedStories = stories.filter(story => ids.includes(story.story_id));
  console.log('\n=== KẾT QUẢ TÌM KIẾM ===');
  console.log('Query:', query);
  console.log('IDs được chọn:', ids);
  console.log('Lý do lựa chọn:');
  (reasoning || []).forEach((reason, index) => {
    console.log(`${index + 1}. ${reason}`);
  });
  console.log('========================\n');
  
  // Transform to match original format
  const transformedStories = matchedStories.map(story => ({
    id: story.story_id,
    title: story.title,
    author: story.author,
    status: story.status,
    genres: story.storyGenres.map(sg => sg.genre.genre_name),
    description: story.description,
    chapter_count: story.chapter_count,
    cover: story.cover,
    time: story.time,
    hot: story.hot
  }));
  
  return { stories: transformedStories, reasoning: reasoning || [], query };
}

module.exports = { llmSearch };


