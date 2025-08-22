const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const prisma = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Storage } = require('@google-cloud/storage');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp'); // npm install sharp
const { createCanvas, loadImage, registerFont } = require('canvas'); // npm install canvas
const upload = multer({ storage: multer.memoryStorage() });

dotenv.config();

// Khởi tạo Google AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
// app.use(express.json());
app.use(express.json({ 
  limit: '500mb',           // Increase to 500MB
  parameterLimit: 100000,
  extended: true
}));

app.use(express.urlencoded({ 
  limit: '500mb',           // Increase to 500MB
  extended: true,
  parameterLimit: 100000
}));

// Also set raw body parser for streaming
app.use(express.raw({ 
  limit: '500mb',
  type: ['image/png', 'image/jpeg', 'application/octet-stream']
}));

// Increase server timeout significantly
app.use((req, res, next) => {
  if (req.path.includes('upload')) {
    req.setTimeout(1800000);  // 30 minutes
    res.setTimeout(1800000);  // 30 minutes
    req.connection.setTimeout(1800000);
  }
  next();
});

app.get('/', (req, res) => {
  res.send('Hello from Express backend!');
});

app.get('/api/stories', (req, res) => {
  const dataPath = path.join(__dirname, 'stories.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Không đọc được dữ liệu truyện' });
    res.json(JSON.parse(data));
  });
});

// API lọc truyện theo thể loại
app.get('/api/stories/genre/:genreName', (req, res) => {
  const { genreName } = req.params;
  const decodedGenre = decodeURIComponent(genreName);
  
  const dataPath = path.join(__dirname, 'stories.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Không đọc được dữ liệu truyện' });
    
    const stories = JSON.parse(data);
    
    // Lọc truyện theo thể loại - SỬA ĐỔI: từ 'genre' thành 'genres'
    const filteredStories = stories.filter(story => {
      if (!story.genres) return false;
      
      // Kiểm tra nếu genres là array hay string
      if (Array.isArray(story.genres)) {
        return story.genres.some(g => g.toLowerCase().includes(decodedGenre.toLowerCase()));
      } else {
        return story.genres.toLowerCase().includes(decodedGenre.toLowerCase());
      }
    });
    
    res.json({
      genre: decodedGenre,
      total: filteredStories.length,
      stories: filteredStories
    });
  });
});

const chapterFileMap = {
  1: 'cothanky_chapter.json',
  2: 'otis_chapter.json',
  3: 'phongthan_chapter.json',
  4: 'quyam_chapter.json',
  5: 'tro_lai_la_sinh_vien_chapter.json',
  6: 'dong_nghiep_toi_la_mot_quai_vat_ta_di_chapter.json',
  7: 'idolatry_chapter.json',
  8: 'vet_seo_khong_phai_chapter.json',
  9: 'cam_heo_chem_bay_van_gioi_chapter.json',
  10: 'ke_xam_nhap_diu_dang_chapter.json',
  11: 'ngoai_ton_thien_tai_cua_nam_cung_the_gia_chapter.json',
  12: 'dai_quan_gia_la_ma_hoang_chapter.json',
  13: 'van_co_chi_ton_chapter.json',
  14: 'dai_phung_da_canh_nhan_chapter.json',
  15: 'luoi_va_luoi_hon_nua_chapter.json',
  16: 'tinh_yeu_muon_mang_chapter.json',
  17: 'chien_dich_than_cupid_chapter.json',
  18: 'gia_vo_lam_gioi_thuong_luu_chapter.json',
  19: 'phu_than_vo_dich_chi_dich_chapter.json',
  20: 'than_tham_sieu_linh_chapter.json',
  21: 'bat_hanh_theo_duoi_co_gai_xui_xeo_chapter.json',
  22: 'nguoi_cha_xac_song_chapter.json',
  23: 'pha_huyet_gia_chapter.json',
  24: 'song_con_chapter.json',
  25: 'tinh_yeu_ben_le_chapter.json'
};

app.get('/api/stories/:id', (req, res) => {
  const { id } = req.params;
  const dataPath = path.join(__dirname, 'stories.json');
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Không đọc được dữ liệu truyện' });
    const stories = JSON.parse(data);
    const story = stories.find((s) => s.id === Number(id));
    if (!story) return res.status(404).json({ error: 'Không tìm thấy truyện' });
    res.json(story);
  });
});

app.get('/api/stories/:id/chapters', (req, res) => {
  const { id } = req.params;
  const fileName = chapterFileMap[id];
  if (!fileName) return res.status(404).json({ error: 'Không tìm thấy truyện' });
  const dataPath = path.join(__dirname, '../../crawler/story_chapter/', fileName);
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Không đọc được dữ liệu chương' });
    res.json(JSON.parse(data));
  });
});

app.get('/api/stories/:id/chapters/:chapterNumber', (req, res) => {
  const { id, chapterNumber } = req.params;
  const fileName = chapterFileMap[id];
  if (!fileName) return res.status(404).json({ error: 'Không tìm thấy truyện' });
  const dataPath = path.join(__dirname, '../../crawler/story_chapter/', fileName);
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ error: 'Không đọc được dữ liệu chương' });
    const chapters = JSON.parse(data);
    const chapter = chapters.find(
      (c) => c.chapter.replace('Chương ', '').replace('Chapter ', '') == chapterNumber
    );
    if (!chapter) return res.status(404).json({ error: 'Không tìm thấy chương' });
    res.json(chapter);
  });
});

app.post('/api/llm-search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung tìm kiếm' });
    }

    const dataPath = path.join(__dirname, 'stories.json');
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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    let ids, reasoning;
    try {
      const responseText = response.text();
      console.log('Raw response:', responseText); 
      
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
          // Fallback cuối: extract numbers từ response
          const numbers = responseText.match(/\d+/g);
          ids = numbers ? numbers.slice(0, 3).map(Number) : [];
          reasoning = ["Không thể phân tích lý do từ AI response"];
        }
      }
      
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error("Không tìm thấy id truyện phù hợp");
      }
      
      // Log lý do lựa chọn
      console.log('\n=== KẾT QUẢ TÌM KIẾM ===');
      console.log('Query:', query);
      console.log('IDs được chọn:', ids);
      console.log('Lý do lựa chọn:');
      reasoning.forEach((reason, index) => {
        console.log(`${index + 1}. ${reason}`);
      });
      console.log('========================\n');
      
    } catch (err) {
      console.error('Parse error:', err, response.text());
      return res.status(500).json({ error: 'Lỗi xử lý kết quả tìm kiếm' });
    }

    // Lọc truyện theo id và thêm reasoning vào response
    const matchedStories = stories.filter(story => ids.includes(story.id));
    
    // Thêm reasoning vào response
    const response_data = {
      stories: matchedStories,
      reasoning: reasoning || [],
      query: query
    };
    
    res.json(response_data);
  } catch (error) {
    console.error('Search error:', error);
    
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText
    });
    
    res.status(500).json({ 
      error: 'Lỗi khi tìm kiếm truyện', 
      details: error.message 
    });
  }
});

// Retry function cho Gemini API với dialogue support
async function retryGeminiRequest(prompt, maxRetries = 3, delay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error(`Gemini attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Progressive delay: 5s, 10s, 15s
      const waitTime = delay * attempt;
      console.log(`Waiting ${waitTime/1000}s before retry ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}


// API endpoint để phân tích nội dung truyện chữ và tách thành panels
app.post('/api/novel-to-comic/analyze', async (req, res) => {
  try {
    const { storyId, chapterNumber, novelContent } = req.body;
    
    if (!novelContent) {
      return res.status(400).json({ error: 'Vui lòng cung cấp nội dung truyện chữ' });
    }

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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(analysisPrompt);
    const response = await result.response;
    
    let analysisData;
    try {
      const responseText = response.text();
      console.log('Analysis response:', responseText);
      
      // Try to parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
      analysisData = JSON.parse(jsonMatch[0]);
      
      // Validation số lượng panels
      if (!analysisData.panels || analysisData.panels.length < 15) {
        console.warn(`Chỉ tạo được ${analysisData.panels?.length || 0} panels, yêu cầu tối thiểu 15. Thử lại...`);
        
        // Retry với prompt mạnh hơn nếu cần
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
          if (retryData.panels && retryData.panels.length >= 15) {
            analysisData = retryData;
            console.log(`✓ Retry thành công: ${analysisData.panels.length} panels`);
          }
        }
      }
    } else {
      throw new Error("Không thể parse JSON response");
    }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      return res.status(500).json({ error: 'Lỗi phân tích nội dung truyện' });
    }

    // Log kết quả phân tích
    console.log('\n=== PHÂN TÍCH TRUYỆN CHỮ ===');
    console.log('Story ID:', storyId);
    console.log('Chapter:', chapterNumber);
    console.log('Số panels:', analysisData.panels?.length || 0);
    console.log('Nhân vật chính:', analysisData.main_characters);
    console.log('============================\n');

    res.json({
      success: true,
      storyId,
      chapterNumber,
      analysis: analysisData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi phân tích nội dung truyện',
      details: error.message 
    });
  }
});


app.post('/api/novel-to-comic/create-character-refs', upload.any(), async (req, res) => {
  try {
    // Xử lý cả 2 trường hợp: có ảnh (FormData) và không có ảnh (JSON)
    let characters, storyContext;
    
    if (typeof req.body.characters === 'string') {
      characters = JSON.parse(req.body.characters);
      storyContext = req.body.storyContext;
    } else {
      characters = req.body.characters;
      storyContext = req.body.storyContext;
    }

    console.log('Characters received:', characters);

    const uploadedFiles = req.files || [];
    
    // Xử lý ảnh upload
    const characterImages = {};
    uploadedFiles.forEach(file => {
      const charName = decodeURIComponent(file.fieldname.replace('character_image_', ''));
      characterImages[charName] = {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalName: file.originalname
      };
    });

    console.log('Character images:', Object.keys(characterImages));

    let characterRefs = {};

    // BƯỚC 1: Tạo base refs cho TẤT CẢ nhân vật trước
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

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const baseResult = await model.generateContent(basePrompt);
    const baseResponse = await baseResult.response;
    const baseText = baseResponse.text();

    console.log('Base response:', baseText);

    const baseJsonMatch = baseText.match(/\{[\s\S]*\}/);
    if (baseJsonMatch) {
      try {
        const parsedData = JSON.parse(baseJsonMatch[0]);
        if (parsedData.character_references) {
          characterRefs = parsedData.character_references;
          console.log('Base character refs created successfully:', Object.keys(characterRefs));
        }
      } catch (parseError) {
        console.error('Parse base JSON error:', parseError);
      }
    }

    // BƯỚC 2: Nếu có ảnh, enhance refs bằng Vision API
    if (Object.keys(characterImages).length > 0) {
      console.log('Enhancing refs with vision API...');
      const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      for (const [charName, imageData] of Object.entries(characterImages)) {
        if (characterRefs[charName]) { // Chỉ enhance nếu đã có base ref
          try {
            console.log(`Processing vision enhancement for: ${charName}`);
            
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
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: imageData.mimetype
                }
              }
            ]);

            const visionResponse = await visionResult.response;
            const visionText = visionResponse.text();
            
            console.log(`Vision response for ${charName}:`, visionText);
            
            const visionJsonMatch = visionText.match(/\{[\s\S]*\}/);
            if (visionJsonMatch) {
              try {
                const enhancedData = JSON.parse(visionJsonMatch[0]);
                
                // THAY THẾ HOÀN TOÀN các thuộc tính visual từ ảnh
                // Chỉ giữ lại personality_traits từ base nếu vision không có
                characterRefs[charName] = {
                  physical_description: enhancedData.physical_description || characterRefs[charName].physical_description,
                  hair: enhancedData.hair || characterRefs[charName].hair,
                  eyes: enhancedData.eyes || characterRefs[charName].eyes,
                  clothing: enhancedData.clothing || characterRefs[charName].clothing,
                  distinctive_features: enhancedData.distinctive_features || characterRefs[charName].distinctive_features,
                  personality_traits: enhancedData.personality_traits || characterRefs[charName].personality_traits
                };
                
                console.log(`✓ Successfully replaced visual features for ${charName} with vision data`);
                console.log(`✓ Updated features:`, {
                  physical_description: !!enhancedData.physical_description,
                  hair: !!enhancedData.hair,
                  eyes: !!enhancedData.eyes,
                  clothing: !!enhancedData.clothing,
                  distinctive_features: !!enhancedData.distinctive_features
                });
              } catch (visionParseError) {
                console.error(`Vision JSON parse error for ${charName}:`, visionParseError);
                // Giữ nguyên base ref nếu vision parse lỗi
              }
            } else {
              console.warn(`No JSON found in vision response for ${charName}`);
            }

          } catch (visionError) {
            console.error(`Vision API error for ${charName}:`, visionError);
            // Giữ nguyên base ref nếu vision API lỗi
          }
        } else {
          console.warn(`No base ref found for ${charName}, skipping vision enhancement`);
        }
      }
    }

    console.log('Final character refs:', characterRefs);

    // Validate kết quả
    const finalCharCount = Object.keys(characterRefs).length;
    if (finalCharCount === 0) {
      throw new Error('Không tạo được character reference nào');
    }

    res.json({
      success: true,
      character_references: characterRefs,
      images_processed: Object.keys(characterImages).length,
      total_characters: characters.length,
      characters_created: finalCharCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Character reference creation error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi tạo character references',
      details: error.message 
    });
  }
});



// 2. Cập nhật endpoint generate-images với character consistency
app.post('/api/novel-to-comic/generate-images-consistent', async (req, res) => {
  try {
    const { panels, storyContext, styleReference, characterReferences } = req.body;
    
    if (!panels || panels.length === 0) {
      return res.status(400).json({ error: 'Vui lòng cung cấp danh sách panels' });
    }

    if (!characterReferences) {
      return res.status(400).json({ error: 'Vui lòng cung cấp character references' });
    }

    const HF_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN;
    const HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";
    const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

    if (!HF_API_TOKEN) {
      return res.status(500).json({ error: 'Thiếu Hugging Face API token' });
    }

    const generatedPanels = [];
    let successfulGenerations = 0;

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      console.log(`Processing panel ${panel.panel_id} (${i + 1}/${panels.length})`);
      
      try {
        // Tạo character descriptions cho panel này
        let characterDescriptions = [];
        if (panel.characters && panel.characters.length > 0) {
          for (const charName of panel.characters) {
            const charRef = characterReferences.character_references?.[charName];
            if (charRef) {
              const charDesc = `${charName}: ${charRef.physical_description}, ${charRef.hair}, ${charRef.eyes}, ${charRef.clothing}, ${charRef.distinctive_features}`;
              characterDescriptions.push(charDesc);
            }
          }
        }

        // Tạo consistent prompt
        const consistentPrompt = `
Panel ${panel.panel_id} - ${panel.scene_type}:

NHÂN VẬT (QUAN TRỌNG - giữ nguyên ngoại hình):
${characterDescriptions.join('\n')}

CẢNH:
- Bối cảnh: ${panel.setting}
- Hành động: ${panel.action}
- Góc quay: ${panel.camera_angle}
- Cảm xúc: ${panel.dialogue?.emotion || 'neutral'}
- Mô tả hình ảnh: ${panel.visual_description}

STYLE: ${styleReference || 'Manga/manhwa style, full color, vibrant colors, detailed art'}
CONTEXT: ${storyContext || 'Ancient Chinese setting, martial arts theme'}

Yêu cầu tạo prompt để sinh hình ảnh nhất quán:
{
  "image_prompt": "detailed prompt với character consistency",
  "negative_prompt": "things to avoid",
  "character_consistency_tags": ["tag cho từng nhân vật"],
  "composition": "mô tả composition"
}
`;

        let responseText;
        let imageData = {};

        try {
          responseText = await retryGeminiRequest(consistentPrompt);
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            imageData = JSON.parse(jsonMatch[0]);
          }
        } catch (geminiError) {
          console.log(`Gemini failed for panel ${panel.panel_id}, using fallback`);
          
          // Fallback với character descriptions
          const charTags = characterDescriptions.length > 0 ? 
            characterDescriptions.join(', ') : 
            `characters: ${panel.characters.join(', ')}`;
            
          imageData = {
            image_prompt: `${panel.visual_description}, ${panel.setting}, ${charTags}, ${panel.action}, ${panel.camera_angle} angle, manga style, full color, detailed line art, consistent character design`,
            negative_prompt: "blurry, low quality, distorted, text, watermark, realistic photo, inconsistent character design, different face, different hair",
            character_consistency_tags: panel.characters.map(char => {
              const ref = characterReferences.character_references?.[char];
              return ref ? ref.consistent_tags : char;
            }).filter(Boolean),
            composition: panel.camera_angle
          };
        }

        // Enhanced negative prompt cho consistency
        const enhancedNegativePrompt = `${imageData.negative_prompt || "blurry, low quality, distorted"}, inconsistent character design, different facial features, different hair color, different eye color, character inconsistency, multiple versions of same character`;

        // Tạo final prompt với character consistency
        let finalPrompt = imageData.image_prompt || panel.visual_description;
        
        // Thêm character consistency tags vào prompt
        if (imageData.character_consistency_tags && imageData.character_consistency_tags.length > 0) {
          finalPrompt += `, CONSISTENT CHARACTERS: ${imageData.character_consistency_tags.join(', ')}`;
        }

        // Generate image với enhanced consistency
        let imageGenerated = false;
        let hfAttempts = 0;
        const maxHfAttempts = 3;

        while (!imageGenerated && hfAttempts < maxHfAttempts) {
          hfAttempts++;
          
          try {
            const hfResponse = await fetch(HF_API_URL, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${HF_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: finalPrompt,
                parameters: {
                  negative_prompt: enhancedNegativePrompt,
                  num_inference_steps: 25, // Tăng để có chất lượng tốt hơn
                  guidance_scale: 8.0, // Tăng để follow prompt chặt chẽ hơn
                  width: 512,
                  height: 768,
                  seed: Math.floor(Math.random() * 1000000) // Random seed mỗi panel
                }
              })
            });

            if (hfResponse.ok) {
              const imageBlob = await hfResponse.blob();
              const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
              const base64Image = imageBuffer.toString('base64');
              const imageDataUrl = `data:image/png;base64,${base64Image}`;

              generatedPanels.push({
                ...panel,
                image_generation: {
                  prompt: finalPrompt,
                  negative_prompt: enhancedNegativePrompt,
                  character_consistency_tags: imageData.character_consistency_tags || [],
                  composition: imageData.composition || panel.camera_angle,
                  status: "generated",
                  image_data: imageDataUrl,
                  api_used: "huggingface_consistent",
                  attempts: hfAttempts,
                  gemini_used: responseText ? true : false,
                  character_descriptions: characterDescriptions
                }
              });

              successfulGenerations++;
              imageGenerated = true;
              console.log(`✓ Panel ${panel.panel_id} generated with character consistency (attempt ${hfAttempts})`);
              
            } else if (hfResponse.status === 503) {
              console.log(`HuggingFace model loading for panel ${panel.panel_id}, attempt ${hfAttempts}/${maxHfAttempts}`);
              if (hfAttempts < maxHfAttempts) {
                await new Promise(resolve => setTimeout(resolve, 20000));
              }
            } else {
              throw new Error(`HuggingFace API error: ${hfResponse.status} ${await hfResponse.text()}`);
            }
            
          } catch (hfError) {
            console.error(`HuggingFace attempt ${hfAttempts} failed for panel ${panel.panel_id}:`, hfError.message);
            if (hfAttempts >= maxHfAttempts) {
              break;
            }
          }
        }

        if (!imageGenerated) {
          generatedPanels.push({
            ...panel,
            image_generation: {
              prompt: finalPrompt,
              negative_prompt: enhancedNegativePrompt,
              character_consistency_tags: imageData.character_consistency_tags || [],
              composition: imageData.composition || panel.camera_angle,
              status: "failed",
              error: "Failed after multiple attempts",
              api_used: "huggingface_consistent",
              attempts: hfAttempts,
              gemini_used: responseText ? true : false
            }
          });
        }

      } catch (error) {
        console.error(`Critical error for panel ${panel.panel_id}:`, error);
        generatedPanels.push({
          ...panel,
          image_generation: {
            status: "failed",
            error: error.message,
            api_used: "none"
          }
        });
      }

      // Delay giữa các panels
      if (i < panels.length - 1) {
        console.log('Waiting 3s before next panel...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log('\n=== SINH HÌNH ẢNH VỚI CHARACTER CONSISTENCY ===');
    console.log('Số panels xử lý:', generatedPanels.length);
    console.log('Panels thành công:', successfulGenerations);
    console.log('Tỷ lệ thành công:', `${Math.round((successfulGenerations / generatedPanels.length) * 100)}%`);
    console.log('================================================\n');

    res.json({
      success: true,
      panels: generatedPanels,
      total_panels: generatedPanels.length,
      successful_generations: successfulGenerations,
      success_rate: Math.round((successfulGenerations / generatedPanels.length) * 100),
      character_consistency_applied: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Character consistent image generation error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi sinh hình ảnh với character consistency',
      details: error.message 
    });
  }
});

try {
  registerFont('./fonts/NotoSans-Regular.ttf', { family: 'NotoSans' });
  registerFont('./fonts/NotoSans-Bold.ttf', { family: 'NotoSans', weight: 'bold' });
  registerFont('./fonts/PatrickHand-Regular.ttf', { family: 'PatrickHand'});
} catch (err) {
  console.log('Font loading error:', err);
}

// Endpoint mới để thêm lời thoại
app.post('/api/novel-to-comic/add-dialogue', async (req, res) => {
  try {
    const { panels } = req.body;
    
    if (!panels || panels.length === 0) {
      return res.status(400).json({ error: 'Vui lòng cung cấp danh sách panels có ảnh' });
    }

    const processedPanels = [];

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      console.log(`Adding dialogue to panel ${panel.panel_id} (${i + 1}/${panels.length})`);
      
      try {
        // Kiểm tra panel có ảnh và lời thoại không
        if (!panel.image_generation?.image_data || !panel.dialogue?.text) {
          processedPanels.push({
            ...panel,
            dialogue_added: false,
            reason: !panel.image_generation?.image_data ? 'No image' : 'No dialogue'
          });
          continue;
        }

        // Decode base64 image
        const base64Data = panel.image_generation.image_data.replace(/^data:image\/[a-z]+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Load image với sharp để lấy kích thước
        const imageInfo = await sharp(imageBuffer).metadata();
        const { width, height } = imageInfo;

        // Tạo canvas với kích thước ảnh gốc
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // Load và vẽ ảnh gốc
        const image = await loadImage(imageBuffer);
        ctx.drawImage(image, 0, 0, width, height);

        // Thêm lời thoại
        await addDialogueToCanvas(ctx, panel, width, height);

        // Convert canvas về base64
        const finalImageBuffer = canvas.toBuffer('image/png');
        const finalBase64 = finalImageBuffer.toString('base64');
        const finalDataUrl = `data:image/png;base64,${finalBase64}`;

        processedPanels.push({
          ...panel,
          image_generation: {
            ...panel.image_generation,
            image_data: finalDataUrl,
            dialogue_added: true,
            dialogue_text: panel.dialogue.text,
            dialogue_speaker: panel.dialogue.speaker
          },
          dialogue_added: true
        });

        console.log(`✓ Added dialogue to panel ${panel.panel_id}: "${panel.dialogue.text}"`);

      } catch (panelError) {
        console.error(`Error processing panel ${panel.panel_id}:`, panelError);
        processedPanels.push({
          ...panel,
          dialogue_added: false,
          error: panelError.message
        });
      }
    }

    const successCount = processedPanels.filter(p => p.dialogue_added).length;

    res.json({
      success: true,
      panels: processedPanels,
      total_panels: panels.length,
      dialogue_added_count: successCount,
      success_rate: Math.round((successCount / panels.length) * 100),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Add dialogue error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi thêm lời thoại vào ảnh',
      details: error.message 
    });
  }
});

// Hàm helper để thêm lời thoại vào canvas
async function addDialogueToCanvas(ctx, panel, width, height) {
  const dialogue = panel.dialogue;
  if (!dialogue || !dialogue.text) return;

  // Cấu hình speech bubble
  const bubbleConfig = getSpeechBubbleConfig(panel.scene_type, panel.camera_angle, dialogue.emotion);
  
  // Tính toán vị trí bubble dựa trên loại cảnh
  const bubblePosition = calculateBubblePosition(width, height, bubbleConfig, panel);
  
  // Vẽ speech bubble
  drawSpeechBubble(ctx, dialogue.text, bubblePosition, bubbleConfig, dialogue.speaker);
}

function getSpeechBubbleConfig(sceneType, cameraAngle, emotion) {
  // Cấu hình bubble theo loại cảnh và cảm xúc
  const baseConfig = {
    maxWidth: 200,
    padding: 15,
    fontSize: 16,
    fontFamily: 'PatrickHand',
    textColor: '#000000',
    bubbleColor: '#FFFFFF',
    borderColor: '#000000',
    borderWidth: 2
  };

  // Điều chỉnh theo cảm xúc
  switch (emotion) {
    case 'angry':
      return {
        ...baseConfig,
        bubbleColor: '#FFE6E6',
        borderColor: '#FF0000',
        borderWidth: 3,
        spiky: true // Tạo bubble răng cưa
      };
    case 'sad':
      return {
        ...baseConfig,
        bubbleColor: '#E6F3FF',
        borderColor: '#0066CC',
        curved: true
      };
    case 'thinking':
      return {
        ...baseConfig,
        bubbleColor: '#F0F0F0',
        borderStyle: 'dashed',
        cloudStyle: true // Thought bubble
      };
    case 'surprised':
      return {
        ...baseConfig,
        bubbleColor: '#FFFF99',
        borderColor: '#FF6600',
        jagged: true
      };
    default:
      return baseConfig;
  }
}

function calculateBubblePosition(width, height, config, panel) {
  // Tính toán vị trí bubble dựa trên camera angle và loại cảnh
  let x, y;
  
  switch (panel.camera_angle) {
    case 'close_up':
      // Close up - bubble ở góc trên
      x = width * 0.7;
      y = height * 0.1;
      break;
    case 'medium_shot':
      // Medium shot - bubble ở trên giữa
      x = width * 0.5;
      y = height * 0.1;
      break;
    case 'wide_shot':
      // Wide shot - bubble linh hoạt hơn
      x = width * 0.3;
      y = height * 0.1;
      break;
    default:
      x = width * 0.5;
      y = height * 0.1;
  }

  // Điều chỉnh để không bị cắt
  const bubbleWidth = config.maxWidth + (config.padding * 2);
  const bubbleHeight = 100; // Ước tính
  
  x = Math.max(bubbleWidth/2, Math.min(width - bubbleWidth/2, x));
  y = Math.max(bubbleHeight/2, Math.min(height - bubbleHeight/2, y));

  return { x, y };
}

function drawSpeechBubble(ctx, text, position, config, speaker) {
  const { x, y } = position;
  
  // Chuẩn bị text
  const lines = wrapText(ctx, text, config.maxWidth - (config.padding * 2), config);
  const lineHeight = config.fontSize * 1.2;
  const textHeight = lines.length * lineHeight;
  const bubbleWidth = config.maxWidth;
  const bubbleHeight = textHeight + (config.padding * 2);

  // Vẽ bubble background
  ctx.save();
  
  if (config.cloudStyle) {
    drawThoughtBubble(ctx, x, y, bubbleWidth, bubbleHeight, config);
  } else if (config.spiky) {
    drawSpikyBubble(ctx, x, y, bubbleWidth, bubbleHeight, config);
  } else {
    drawRegularBubble(ctx, x, y, bubbleWidth, bubbleHeight, config);
  }

  // Vẽ text
  ctx.fillStyle = config.textColor;
  ctx.font = `${config.fontSize}px ${config.fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const startY = y - (textHeight / 2) + (lineHeight / 2);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, startY + (index * lineHeight));
  });

  // Vẽ tên người nói (nếu có)
  if (speaker && config.showSpeaker !== false) {
    ctx.font = `bold ${config.fontSize - 2}px ${config.fontFamily}`;
    ctx.fillStyle = '#666666';
    ctx.fillText(`${speaker}:`, x, y - bubbleHeight/2 - 15);
  }

  ctx.restore();
}

function drawRegularBubble(ctx, x, y, width, height, config) {
  const radius = 15;
  
  // Vẽ bubble chính
  ctx.beginPath();
  ctx.roundRect(x - width/2, y - height/2, width, height, radius);
  ctx.fillStyle = config.bubbleColor;
  ctx.fill();
  
  if (config.borderStyle === 'dashed') {
    ctx.setLineDash([5, 5]);
  }
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = config.borderWidth;
  ctx.stroke();
  ctx.setLineDash([]);

  // Vẽ tail (đuôi bubble)
  drawBubbleTail(ctx, x, y + height/2, config);
}

function drawSpikyBubble(ctx, x, y, width, height, config) {
  // Bubble răng cưa cho cảm xúc tức giận
  ctx.beginPath();
  
  const spikes = 8;
  const spikeHeight = 10;
  
  // Tạo đường viền răng cưa
  const left = x - width/2;
  const top = y - height/2;
  const right = x + width/2;
  const bottom = y + height/2;
  
  ctx.moveTo(left, top + 10);
  
  // Top edge with spikes
  for (let i = 0; i < spikes; i++) {
    const spikeX = left + (width / spikes) * i;
    const nextSpikeX = left + (width / spikes) * (i + 1);
    ctx.lineTo(spikeX + (width / spikes) / 2, top - spikeHeight);
    ctx.lineTo(nextSpikeX, top);
  }
  
  ctx.lineTo(right, top + 10);
  ctx.lineTo(right, bottom - 10);
  ctx.lineTo(right - 10, bottom);
  ctx.lineTo(left + 10, bottom);
  ctx.lineTo(left, bottom - 10);
  ctx.closePath();
  
  ctx.fillStyle = config.bubbleColor;
  ctx.fill();
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = config.borderWidth;
  ctx.stroke();
}

function drawThoughtBubble(ctx, x, y, width, height, config) {
  // Thought bubble với các hình tròn nhỏ
  drawRegularBubble(ctx, x, y, width, height, config);
  
  // Thêm các bubble nhỏ
  const smallBubbles = [
    { x: x - 30, y: y + height/2 + 20, radius: 8 },
    { x: x - 50, y: y + height/2 + 35, radius: 5 },
    { x: x - 65, y: y + height/2 + 45, radius: 3 }
  ];
  
  smallBubbles.forEach(bubble => {
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.radius, 0, 2 * Math.PI);
    ctx.fillStyle = config.bubbleColor;
    ctx.fill();
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = config.borderWidth;
    ctx.stroke();
  });
}

function drawBubbleTail(ctx, x, y, config) {
  // Vẽ đuôi bubble đơn giản
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x, y + 20);
  ctx.lineTo(x + 10, y);
  ctx.fillStyle = config.bubbleColor;
  ctx.fill();
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = config.borderWidth;
  ctx.stroke();
}

function wrapText(ctx, text, maxWidth, config) {
  ctx.font = `${config.fontSize}px ${config.fontFamily}`;
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && i > 0) {
      lines.push(currentLine.trim());
      currentLine = words[i] + ' ';
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }
  
  return lines;
}

// API endpoint generate-images
app.post('/api/novel-to-comic/generate-images', async (req, res) => {
  try {
    const { panels, storyContext, styleReference } = req.body;
    
    if (!panels || panels.length === 0) {
      return res.status(400).json({ error: 'Vui lòng cung cấp danh sách panels' });
    }

    // Hugging Face API configuration
    const HF_API_TOKEN = process.env.HUGGING_FACE_API_TOKEN;
    const HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";
    const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

    if (!HF_API_TOKEN) {
      return res.status(500).json({ error: 'Thiếu Hugging Face API token' });
    }

    const generatedPanels = [];
    let successfulGenerations = 0;

    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      console.log(`Processing panel ${panel.panel_id} (${i + 1}/${panels.length})`);
      
      try {
        // Tạo prompt để sinh hình ảnh cho panel
        const imagePrompt = `
Tạo mô tả chi tiết để sinh hình ảnh panel truyện tranh:

Panel ${panel.panel_id}:
- Bối cảnh: ${panel.setting}
- Nhân vật: ${panel.characters.join(', ')}
- Hành động: ${panel.action}
- Góc quay: ${panel.camera_angle}
- Cảm xúc: ${panel.dialogue?.emotion || 'neutral'}
- Mô tả hình ảnh: ${panel.visual_description}

Style reference: ${styleReference || 'Manga/manhwa style, full color, vibrant colors, detailed art'}
Story context: ${storyContext || 'Ancient Chinese setting, martial arts theme'}

Tạo prompt để sinh hình ảnh theo format:
{
  "image_prompt": "detailed prompt for AI image generation",
  "negative_prompt": "things to avoid in the image",
  "style_tags": ["tag1", "tag2", "tag3"],
  "composition": "description of panel composition"
}
`;

        let responseText;
        let imageData = {};

        try {
          // Thử gọi Gemini với retry logic
          responseText = await retryGeminiRequest(imagePrompt);
          
          // Parse image generation data
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            imageData = JSON.parse(jsonMatch[0]);
          }
        } catch (geminiError) {
          console.log(`Gemini failed for panel ${panel.panel_id}, using fallback prompt`);
          // Fallback: tạo prompt đơn giản không cần Gemini
          imageData = {
            image_prompt: `${panel.visual_description}, ${panel.setting}, characters: ${panel.characters.join(', ')}, ${panel.action}, ${panel.camera_angle} angle, manga style, full color, detailed line art`,
            negative_prompt: "blurry, low quality, distorted, text, watermark, realistic photo",
            style_tags: ["manga", "full color", "detailed", "vibrant colors", "comic_style"],
            composition: panel.camera_angle
          };
        }

        // Tạo prompt cuối cùng cho việc sinh hình ảnh
        const finalPrompt = imageData.image_prompt || panel.visual_description;
        const negativePrompt = imageData.negative_prompt || "blurry, low quality, distorted, text, watermark";

        // Gọi Hugging Face API để sinh hình ảnh với retry logic
        let imageGenerated = false;
        let hfAttempts = 0;
        const maxHfAttempts = 3;

        while (!imageGenerated && hfAttempts < maxHfAttempts) {
          hfAttempts++;
          
          try {
            const hfResponse = await fetch(HF_API_URL, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${HF_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: finalPrompt,
                parameters: {
                  negative_prompt: negativePrompt,
                  num_inference_steps: 20,
                  guidance_scale: 7.5,
                  width: 512,
                  height: 768,
                  seed: panel.panel_id || Math.floor(Math.random() * 1000000)
                }
              })
            });

            if (hfResponse.ok) {
              const imageBlob = await hfResponse.blob();
              const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
              const base64Image = imageBuffer.toString('base64');
              const imageDataUrl = `data:image/png;base64,${base64Image}`;

              generatedPanels.push({
                ...panel,
                image_generation: {
                  prompt: finalPrompt,
                  negative_prompt: negativePrompt,
                  style_tags: imageData.style_tags || ["manga", "full color", "detailed"],
                  composition: imageData.composition || panel.camera_angle,
                  status: "generated",
                  image_data: imageDataUrl,
                  api_used: "huggingface",
                  attempts: hfAttempts,
                  gemini_used: responseText ? true : false
                }
              });

              successfulGenerations++;
              imageGenerated = true;
              console.log(`✓ Panel ${panel.panel_id} generated successfully (attempt ${hfAttempts})`);
              
            } else if (hfResponse.status === 503) {
              console.log(`HuggingFace model loading for panel ${panel.panel_id}, attempt ${hfAttempts}/${maxHfAttempts}`);
              if (hfAttempts < maxHfAttempts) {
                await new Promise(resolve => setTimeout(resolve, 20000)); // Chờ 20s
              }
            } else {
              throw new Error(`HuggingFace API error: ${hfResponse.status} ${await hfResponse.text()}`);
            }
            
          } catch (hfError) {
            console.error(`HuggingFace attempt ${hfAttempts} failed for panel ${panel.panel_id}:`, hfError.message);
            if (hfAttempts >= maxHfAttempts) {
              break;
            }
          }
        }

        // Nếu tất cả attempts đều fail
        if (!imageGenerated) {
          generatedPanels.push({
            ...panel,
            image_generation: {
              prompt: finalPrompt,
              negative_prompt: negativePrompt,
              style_tags: imageData.style_tags || ["manga"],
              composition: imageData.composition || panel.camera_angle,
              status: "failed",
              error: "Failed after multiple attempts",
              api_used: "huggingface",
              attempts: hfAttempts,
              gemini_used: responseText ? true : false
            }
          });
        }

      } catch (error) {
        console.error(`Critical error for panel ${panel.panel_id}:`, error);
        
        generatedPanels.push({
          ...panel,
          image_generation: {
            prompt: panel.visual_description,
            negative_prompt: "blurry, low quality",
            style_tags: ["manga"],
            composition: panel.camera_angle,
            status: "failed",
            error: error.message,
            api_used: "none"
          }
        });
      }

      // Delay giữa các panels để tránh rate limit
      if (i < panels.length - 1) {
        console.log('Waiting 3s before next panel...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    console.log('\n=== SINH HÌNH ẢNH PANELS - SUMMARY ===');
    console.log('Số panels xử lý:', generatedPanels.length);
    console.log('Panels thành công:', successfulGenerations);
    console.log('Panels thất bại:', generatedPanels.length - successfulGenerations);
    console.log('Tỷ lệ thành công:', `${Math.round((successfulGenerations / generatedPanels.length) * 100)}%`);
    console.log('=====================================\n');

    res.json({
      success: true,
      panels: generatedPanels,
      total_panels: generatedPanels.length,
      successful_generations: successfulGenerations,
      success_rate: Math.round((successfulGenerations / generatedPanels.length) * 100),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi sinh hình ảnh panels',
      details: error.message 
    });
  }
});


// Alternative: Function để thử nhiều models khác nhau
async function generateImageWithFallback(prompt, negativePrompt, panelId) {
  const models = [
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
    "CompVis/stable-diffusion-v1-4"
  ];

  for (const model of models) {
    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGING_FACE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            negative_prompt: negativePrompt,
            num_inference_steps: 20,
            guidance_scale: 7.5,
            width: 512,
            height: 768,
            seed: panelId
          }
        })
      });

      if (response.ok) {
        const imageBlob = await response.blob();
        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
        const base64Image = imageBuffer.toString('base64');
        return {
          success: true,
          imageData: `data:image/png;base64,${base64Image}`,
          modelUsed: model
        };
      }
    } catch (error) {
      console.error(`Failed with model ${model}:`, error);
      continue;
    }
  }

  return { success: false, error: "All models failed" };
}

// API endpoint để tạo comic layout với hình ảnh hiển thị dọc
app.post('/api/novel-to-comic/create-vertical-comic', async (req, res) => {
  try {
    const { panels, title = 'Comic Chapter', chapterNumber = 1 } = req.body;
    
    if (!panels || panels.length === 0) {
      return res.status(400).json({ error: 'Vui lòng cung cấp danh sách panels' });
    }

    // Kiểm tra panels có image_url không
    const panelsWithImages = panels.filter(panel => panel.image_generation?.image_url);
    
    if (panelsWithImages.length === 0) {
      return res.status(400).json({ error: 'Không có panels nào có hình ảnh được sinh ra' });
    }

    // Tạo vertical comic layout
    const verticalComic = {
      title: title,
      chapter_number: chapterNumber,
      total_panels: panelsWithImages.length,
      reading_direction: "top_to_bottom",
      layout_type: "vertical_scroll",
      panels: panelsWithImages.map((panel, index) => ({
        panel_id: panel.panel_id,
        order: index + 1,
        scene_type: panel.scene_type,
        characters: panel.characters,
        setting: panel.setting,
        action: panel.action,
        dialogue: panel.dialogue,
        image: {
          url: panel.image_generation.image_url,
          prompt: panel.image_generation.prompt,
          alt_text: `Panel ${panel.panel_id}: ${panel.visual_description}`
        },
        panel_config: {
          size: panel.panel_size,
          camera_angle: panel.camera_angle,
          margin_bottom: panel.panel_size === 'full_width' ? 20 : 15,
          border_radius: 8,
          shadow: panel.scene_type === 'action' ? 'heavy' : 'light'
        }
      })),
      style_config: {
        background_color: "#f8f9fa",
        panel_spacing: 15,
        max_width: 800,
        border_color: "#dee2e6",
        text_color: "#212529"
      }
    };

    console.log('\n=== TẠO VERTICAL COMIC ===');
    console.log('Title:', title);
    console.log('Tổng số panels:', verticalComic.total_panels);
    console.log('Layout type:', verticalComic.layout_type);
    console.log('===========================\n');

    res.json({
      success: true,
      comic: verticalComic,
      metadata: {
        generation_time: new Date().toISOString(),
        total_panels: verticalComic.total_panels,
        layout_type: 'vertical_scroll'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Vertical comic creation error:', error);
    res.status(500).json({ 
      error: 'Lỗi khi tạo vertical comic',
      details: error.message 
    });
  }
});

app.get('/api/novel-content/:filename', (req, res) => {
  const { filename } = req.params;
  const dataPath = path.join(__dirname, '../../crawler/novel_chapters/', filename);
  
  console.log('Requested filename:', filename);
  console.log('Full path:', dataPath);
  console.log('File exists:', fs.existsSync(dataPath));
  
  fs.readFile(dataPath, 'utf8', (err, data) => {
    if (err) {
      console.error('File read error:', err);
      return res.status(500).json({ 
        error: 'Không đọc được file truyện chữ',
        details: err.message,
        path: dataPath 
      });
    }
    
    try {
      const novelData = JSON.parse(data);
      console.log('Successfully parsed JSON');
      res.json({
        success: true,
        content: novelData[0]?.content || novelData.content || data,
        filename: filename
      });
    } catch (parseError) {
      console.log('JSON parse failed, returning raw text');
      res.json({
        success: true,
        content: data,
        filename: filename
      });
    }
  });
});

// API endpoint để tạo image proxy (optional - để tránh CORS issues)
app.get('/api/proxy-image', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(500).json({ error: 'Failed to fetch image' });
    }

    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      'Access-Control-Allow-Origin': '*'
    });
    
    res.send(buffer);
    
  } catch (error) {
    console.error('Proxy image error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// Cấu hình Google Cloud Storage
const GCS_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || './path/to/your/credentials.json';
const GCS_BUCKET = process.env.GCS_BUCKET || 'your-bucket-name';
const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || process.env.GCS_BUCKET || 'truyenff-images';


// Khởi tạo storage client
let storage;
try {
  if (fs.existsSync(GCS_CREDENTIALS)) {
    storage = new Storage({
      keyFilename: GCS_CREDENTIALS,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
    });
  } else {
    // Sử dụng default credentials nếu chạy trên GCP
    storage = new Storage();
  }
} catch (error) {
  console.error('Failed to initialize Google Cloud Storage:', error);
}

// API endpoint để upload generated images lên GCS
app.post('/api/novel-to-comic/upload-single-panel-to-gcs', async (req, res) => {
  try {
    const { panel, storyName, chapterNumber, panelIndex, totalPanels, retryAttempt = 0 } = req.body;
    
    if (!panel || !panel.image_generation?.image_data) {
      return res.status(400).json({ error: 'Panel không có dữ liệu hình ảnh' });
    }

    if (!storage) {
      return res.status(500).json({ error: 'Google Cloud Storage chưa được cấu hình' });
    }

    // Log detailed payload info
    const payloadSize = JSON.stringify(req.body).length;
    const imageSizeEstimate = panel.image_generation.image_data.length;
    
    console.log(`Processing panel ${panel.panel_id} (${panelIndex + 1}/${totalPanels})`);
    console.log(`- Total payload: ${(payloadSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`- Image data: ${(imageSizeEstimate / 1024 / 1024).toFixed(2)}MB`);
    console.log(`- Retry attempt: ${retryAttempt}`);
    console.log(`- Compressed: ${panel.image_generation.compressed || false}`);

    // Additional payload size check
    if (payloadSize > 95 * 1024 * 1024) { // 95MB safety limit
      return res.status(413).json({ 
        error: 'Payload quá lớn',
        details: `Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)}MB > 95MB limit`,
        suggested_action: 'Hãy compress image thêm'
      });
    }

    // Tạo tên thư mục
    const storyNameFormatted = (storyName || 'unknown-story')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    
    const chapterFormatted = `Chapter_${chapterNumber || 1}`;
    
    try {
      // Validate base64 data
      const imageData = panel.image_generation.image_data;
      if (!imageData || typeof imageData !== 'string') {
        throw new Error('Invalid base64 image data');
      }

      // Clean base64 data
      const cleanBase64 = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Validate base64 format
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
        throw new Error('Invalid base64 format');
      }

      // Calculate actual image size
      const imageSizeBytes = (cleanBase64.length * 3) / 4;
      console.log(`Panel ${panel.panel_id} actual image size: ${(imageSizeBytes / 1024 / 1024).toFixed(2)}MB`);

      // Check if image is too large for GCS (100MB limit)
      if (imageSizeBytes > 95 * 1024 * 1024) {
        return res.status(413).json({
          error: 'Image quá lớn cho GCS',
          details: `Image size: ${(imageSizeBytes / 1024 / 1024).toFixed(2)}MB > 95MB`,
          suggested_action: 'Cần compress image nhiều hơn'
        });
      }

      // Tạo đường dẫn GCS
      const timestamp = Date.now();
      const compressed = panel.image_generation.compressed ? '-compressed' : '';
      const panelFileName = `panel-${panel.panel_id}-${timestamp}${compressed}.png`;
      const gcsPath = `${storyNameFormatted}/${chapterFormatted}/${panelFileName}`;
      
      // Upload lên GCS với enhanced retry logic
      const gcsUrl = await uploadBase64ToGCSWithRetry(cleanBase64, gcsPath, 3);
      
      const uploadedPanel = {
        ...panel,
        gcs_upload: {
          success: true,
          public_url: gcsUrl,
          gcs_path: gcsPath,
          filename: panelFileName,
          upload_time: new Date().toISOString(),
          image_size_mb: (imageSizeBytes / 1024 / 1024).toFixed(2),
          payload_size_mb: (payloadSize / 1024 / 1024).toFixed(2),
          compressed: panel.image_generation.compressed || false,
          retry_count: retryAttempt
        }
      };

      console.log(`✓ Panel ${panel.panel_id} uploaded successfully to GCS`);
      
      res.json({
        success: true,
        panel: uploadedPanel,
        story_name: storyNameFormatted,
        chapter_number: chapterNumber,
        progress: {
          current: panelIndex + 1,
          total: totalPanels
        }
      });

    } catch (uploadError) {
      console.error(`✗ Failed to upload panel ${panel.panel_id}:`, uploadError);
      
      const failedPanel = {
        ...panel,
        gcs_upload: {
          success: false,
          error: uploadError.message,
          upload_time: new Date().toISOString(),
          retry_count: retryAttempt,
          payload_size_mb: (payloadSize / 1024 / 1024).toFixed(2)
        }
      };
      
      // Return success=false but don't throw HTTP error to allow client-side retry
      res.json({
        success: false,
        panel: failedPanel,
        error: uploadError.message
      });
    }

  } catch (error) {
    console.error('Single panel GCS upload error:', error);
    
    // Check if it's a payload size error
    if (error.message.includes('PayloadTooLargeError') || error.status === 413) {
      return res.status(413).json({ 
        error: 'Payload quá lớn - vượt quá giới hạn server',
        details: error.message,
        suggested_actions: [
          'Compress image với quality thấp hơn',
          'Giảm resolution của image',
          'Sử dụng streaming upload thay vì JSON payload'
        ]
      });
    }
    
    res.status(500).json({ 
      error: 'Lỗi khi upload panel lên Google Cloud Storage',
      details: error.message 
    });
  }
});

// Enhanced GCS upload function with better error handling
const uploadBase64ToGCSWithRetry = async (base64Data, gcsPath, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`GCS upload attempt ${attempt}/${maxRetries} for ${gcsPath}`);
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      const bufferSizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      console.log(`Buffer size: ${bufferSizeMB}MB`);
      
      // Check buffer size limit
      if (buffer.length > 100 * 1024 * 1024) { // 100MB limit
        throw new Error(`Buffer too large: ${bufferSizeMB}MB > 100MB limit`);
      }
      
      // Create GCS file reference
      const file = storage.bucket(GCS_BUCKET_NAME).file(gcsPath);
      
      // Upload options with longer timeout
      const uploadOptions = {
        metadata: {
          contentType: 'image/png',
          cacheControl: 'public, max-age=31536000',
        },
        timeout: 900000, // 15 minutes
        retry: {
          retryDelayMultiplier: 2,
          totalTimeoutMillis: 1200000, // 20 minutes
          maxRetryDelay: 30000, // 30 seconds
          maxRetries: 3,
          autoRetry: true,
        },
        // Handle uniform bucket access
        // predefinedAcl: process.env.GCS_UNIFORM_BUCKET === 'true' ? undefined : 'publicRead'
      };
      
      // Upload to GCS
      console.log(`Starting GCS upload for ${gcsPath}...`);
      await file.save(buffer, uploadOptions);
      
      // Return public URL
      const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsPath}`;
      console.log(`✓ GCS upload successful: ${publicUrl}`);
      
      return publicUrl;
      
    } catch (error) {
      lastError = error;
      console.error(`✗ GCS upload attempt ${attempt} failed:`, error.message);
      
      // Special handling for different error types
      if (error.message.includes('uniform bucket-level access') || error.code === 403) {
        console.log('Trying alternative upload method for uniform bucket...');
        try {
          const buffer = Buffer.from(base64Data, 'base64');
          const file = storage.bucket(GCS_BUCKET_NAME).file(gcsPath);
          
          await file.save(buffer, {
            metadata: {
              contentType: 'image/png',
              cacheControl: 'public, max-age=31536000',
            },
            timeout: 900000,
            retry: {
              retryDelayMultiplier: 2,
              totalTimeoutMillis: 1200000,
              maxRetryDelay: 30000,
              maxRetries: 2,
              autoRetry: true,
            }
            // NO predefinedAcl for uniform buckets
          });
          
          const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsPath}`;
          console.log(`✓ GCS upload successful (uniform bucket): ${publicUrl}`);
          return publicUrl;
          
        } catch (uniformError) {
          console.error('Uniform bucket upload also failed:', uniformError.message);
          lastError = uniformError;
        }
      }
      
      // Handle timeout and network errors differently
      if (error.message.includes('timeout') || error.code === 'ETIMEDOUT') {
        console.log('Upload timeout - extending retry delay');
      }
      
      if (attempt < maxRetries) {
        const delay = Math.min(Math.pow(2, attempt) * 3000, 30000); // Max 30s delay
        console.log(`Retrying GCS upload in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`GCS upload failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
};

app.post('/api/novel-to-comic/upload-panel-stream', async (req, res) => {
  try {
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) { // 100MB limit
      return res.status(413).json({ 
        error: `File too large: ${(contentLength/1024/1024).toFixed(2)}MB > 100MB limit`,
        suggested_action: 'Compress image more aggressively'
      });
    }
    const { panelId, storyName, chapterNumber, panelIndex, totalPanels, compressed, originalSize } = req.query;
    
    console.log(`Streaming upload: Panel ${panelId}, Size: ${originalSize}MB, Compressed: ${compressed}`);
    
    if (!storage) {
      return res.status(500).json({ error: 'Google Cloud Storage chưa được cấu hình' });
    }

    // Create GCS path
    const storyNameFormatted = (storyName || 'unknown-story')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    
    const timestamp = Date.now();
    const compressedSuffix = compressed === 'true' ? '-compressed' : '';
    const panelFileName = `${panelId}.png`;
    const gcsPath = `${storyNameFormatted}/Chapter_${chapterNumber}/${panelFileName}`;
    
    // Create GCS upload stream with maximum settings
    const file = storage.bucket(GCS_BUCKET_NAME).file(gcsPath);
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=31536000',
        customMetadata: {
          panelId: panelId,
          compressed: compressed || 'false',
          uploadMethod: 'streaming',
          originalSize: originalSize || 'unknown'
        }
      },
      timeout: 1800000,    // 30 minutes
      resumable: true,     // Enable resumable uploads for large files
      // Handle uniform bucket access
      // predefinedAcl: process.env.GCS_UNIFORM_BUCKET === 'true' ? undefined : 'publicRead',
      retry: {
        retryDelayMultiplier: 2,
        totalTimeoutMillis: 2400000, // 40 minutes total
        maxRetryDelay: 60000,        // 1 minute max delay
        maxRetries: 5,
        autoRetry: true,
      }
    });

    let uploadStartTime = Date.now();
    let bytesUploaded = 0;

    // Handle stream events
    stream.on('error', (error) => {
      console.error(`Stream upload error for panel ${panelId}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: `Streaming upload failed: ${error.message}`,
          panelId: panelId,
          bytesUploaded: bytesUploaded
        });
      }
    });

    stream.on('progress', (progress) => {
      bytesUploaded = progress.bytesWritten;
      console.log(`Upload progress for panel ${panelId}: ${(bytesUploaded / 1024 / 1024).toFixed(2)}MB`);
    });

    stream.on('finish', () => {
      const uploadTime = ((Date.now() - uploadStartTime) / 1000).toFixed(2);
      const publicUrl = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${gcsPath}`;
      
      console.log(`✓ Stream upload successful for panel ${panelId}: ${publicUrl} (${uploadTime}s)`);
      
      if (!res.headersSent) {
        res.json({
          success: true,
          public_url: publicUrl,
          gcs_path: gcsPath,
          filename: panelFileName,
          upload_time_seconds: uploadTime,
          bytes_uploaded: bytesUploaded,
          method: 'streaming'
        });
      }
    });

    // Track upload progress
    req.on('data', (chunk) => {
      // Optional: track real-time progress
    });

    req.on('end', () => {
      console.log(`Finished receiving data for panel ${panelId}`);
    });

    // Pipe request to GCS with error handling
    req.pipe(stream);

  } catch (error) {
    console.error(`Stream upload setup error for panel ${req.query.panelId}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: `Stream setup failed: ${error.message}`,
        panelId: req.query.panelId
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});