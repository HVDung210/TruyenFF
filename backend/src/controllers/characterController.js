const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const { createCharacterRefs } = require('../services/characterService');

// Middleware to parse multipart with optional images
const createCharacterRefsHandler = [
  upload.any(),
  async (req, res) => {
    try {
      let characters, storyContext;
      if (typeof req.body.characters === 'string') {
        characters = JSON.parse(req.body.characters);
        storyContext = req.body.storyContext;
      } else {
        characters = req.body.characters;
        storyContext = req.body.storyContext;
      }
      const uploadedFiles = req.files || [];
      const characterImages = {};
      uploadedFiles.forEach(file => {
        const charName = decodeURIComponent(file.fieldname.replace('character_image_', ''));
        characterImages[charName] = { buffer: file.buffer, mimetype: file.mimetype, originalName: file.originalname };
      });
      const characterRefs = await createCharacterRefs(characters, storyContext, characterImages);
      const finalCharCount = Object.keys(characterRefs).length;
      if (finalCharCount === 0) throw new Error('Không tạo được character reference nào');
      res.json({ success: true, character_references: characterRefs, images_processed: Object.keys(characterImages).length, total_characters: characters.length, characters_created: finalCharCount, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: 'Lỗi khi tạo character references', details: error.message });
    }
  }
];

module.exports = { createCharacterRefsHandler };


