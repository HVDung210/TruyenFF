const { generateImageStability } = require('./stabilityService');
const { retryGeminiRequest } = require('../utils/retryGemini');

const MAX_PANELS = parseInt(process.env.MAX_PANELS || '8');

// Helper function: Dịch text sang tiếng Anh
async function translateToEnglish(vietnameseText) {
  try {
    const translatePrompt = `Translate this Vietnamese text to English (keep it concise for image generation):
"${vietnameseText}"

Response format: Just the English translation, no explanations.`;
    
    const translation = await retryGeminiRequest(translatePrompt);
    return translation.trim().replace(/['"]/g, '');
  } catch (e) {
    console.warn('[Translate] Failed, using original:', e.message);
    return vietnameseText;
  }
}

async function callStabilityAPI(inputs, parameters) {
  console.log('\n=== STABILITY AI CALL ===');
  console.log('[Stability] Inputs length:', inputs?.length || 0);
  console.log('[Stability] Parameters:', JSON.stringify(parameters, null, 2));
  
  const imageDataUrl = await generateImageStability(inputs, parameters);
  
  console.log('=============================\n');
  return { imageDataUrl };
}

async function generateImages(panels, storyContext, styleReference) {
  const limitedPanels = panels.slice(0, MAX_PANELS);
  
  if (panels.length > MAX_PANELS) {
    console.log(`\n⚠️  LIMIT: Processing ${MAX_PANELS}/${panels.length} panels to save credits\n`);
  }
  
  const generatedPanels = [];
  let successfulGenerations = 0;

  for (let i = 0; i < limitedPanels.length; i++) {
    const panel = limitedPanels[i];
    console.log(`\nProcessing panel ${panel.panel_id} (${i + 1}/${limitedPanels.length})`);

    // Dịch tất cả text sang tiếng Anh
    const englishSetting = await translateToEnglish(panel.setting);
    const englishAction = await translateToEnglish(panel.action);
    const englishVisual = await translateToEnglish(panel.visual_description);
    const englishContext = await translateToEnglish(storyContext || 'Ancient Chinese wuxia world');
    
    console.log('[Translation] Setting:', englishSetting);
    console.log('[Translation] Action:', englishAction);

    let responseText;
    let imageData = {};

    try {
      const imagePrompt = `
Create MANHUA (Chinese webcomic) style illustration with these requirements:

Panel ${panel.panel_id}:
- Setting: ${englishSetting}
- Characters: ${panel.characters.join(', ')}
- Action: ${englishAction}
- Camera: ${panel.camera_angle}
- Emotion: ${panel.dialogue?.emotion || 'neutral'}
- Visual: ${englishVisual}

MANHUA STYLE MANDATORY:
1. Art: Chinese webcomic (Tales of Demons and Gods, Battle Through the Heavens style)
2. Characters: Semi-realistic Asian faces, elegant sharp features, long flowing hair
3. Clothing: Traditional Chinese hanfu robes with intricate patterns, jade ornaments
4. Colors: Rich vibrant - crimson red, imperial gold, jade green, deep blue
5. Lighting: Dramatic cinematic with strong contrast, glowing qi energy effects
6. Background: Ancient Chinese architecture (pagodas, temples), misty mountains
7. Effects: Martial arts energy auras, glowing weapons, motion blur, speed lines
8. Composition: Cinematic ${panel.camera_angle}, dramatic perspective

Context: ${englishContext}
Reference: ${styleReference || 'Chinese cultivation manhua - Tales of Demons and Gods'}

JSON (ENGLISH ONLY):
{
  "image_prompt": "Manhua/Chinese webcomic style: [detailed scene], professional Chinese digital art, trending on Bilibili Comics",
  "negative_prompt": "Western, Japanese anime/manga, Korean manhwa, modern clothing, photorealistic, 3D render, realistic photo, contemporary, Japanese kimono, Korean hanbok, modern city, technology",
  "style_tags": ["manhua", "chinese webcomic", "cultivation", "wuxia", "xianxia"],
  "composition": "cinematic ${panel.camera_angle}"
}

CRITICAL: Pure English, Chinese manhua style ONLY!`;

      responseText = await retryGeminiRequest(imagePrompt);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) imageData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn('[Gemini] Failed, hardcore English fallback:', e.message);
      
      const manhuaKeywords = [
        'Chinese manhua webcomic style',
        'Tales of Demons and Gods art style',
        'Battle Through the Heavens aesthetic',
        'cultivation fantasy illustration',
        englishSetting,
        `characters: ${panel.characters.join(', ')}`,
        englishAction,
        englishVisual,
        'ancient Chinese wuxia setting',
        'traditional hanfu robes intricate embroidery',
        'long flowing black hair',
        'martial arts qi energy aura glowing',
        'ancient Chinese pagoda temple architecture',
        'misty mountains bamboo forest',
        'dramatic cinematic lighting shadows',
        'rich vibrant colors crimson red gold jade green',
        'semi-realistic Asian facial features elegant',
        'dynamic martial arts action pose',
        `${panel.camera_angle} camera angle`,
        'professional Chinese digital art',
        'trending Bilibili Comics Tencent'
      ];
      
      imageData = {
        image_prompt: manhuaKeywords.join(', '),
        negative_prompt: 'Western comic, American cartoon, Japanese anime, Japanese manga, Korean manhwa, modern clothing, contemporary fashion, realistic photo, photorealistic, 3D render, modern city, technology, buildings, cars, phones, computers, Japanese kimono, Korean hanbok, chibi, cute, simple lineart, black white, monochrome, sketch, low quality, blurry, distorted, ugly, deformed, bad anatomy, poorly drawn hands, text, watermark',
        style_tags: ['manhua', 'chinese webcomic', 'cultivation', 'wuxia', 'xianxia', 'martial arts', 'traditional chinese', 'ancient china'],
        composition: `${panel.camera_angle} cinematic manhua`,
      };
    }

    let finalPrompt = imageData.image_prompt || '';
    
    // Double-check: Remove any remaining Vietnamese
    if (/[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(finalPrompt)) {
      console.warn('[WARNING] Vietnamese detected in prompt, translating...');
      finalPrompt = await translateToEnglish(finalPrompt);
    }
    
    // Enforce manhua style
    if (!finalPrompt.toLowerCase().includes('manhua') && !finalPrompt.toLowerCase().includes('chinese')) {
      finalPrompt = `Chinese manhua webcomic style, Tales of Demons and Gods art, ${finalPrompt}`;
    }
    
    if (!finalPrompt.includes('professional') && !finalPrompt.includes('digital art')) {
      finalPrompt += ', professional Chinese manhua digital art, Bilibili Comics';
    }
    
    const negativePrompt = imageData.negative_prompt || 
      'Japanese anime, manga, Korean manhwa, Western comic, modern, photorealistic, 3D render';
    
    console.log(`[Final Prompt] ${finalPrompt.substring(0, 150)}...`);

    let imageGenerated = false;
    let attempts = 0;
    const maxAttempts = 3;

    while (!imageGenerated && attempts < maxAttempts) {
      attempts++;
      console.log(`[Stability] Attempt ${attempts}/${maxAttempts}`);

      try {
        const result = await callStabilityAPI(finalPrompt, {
          negative_prompt: negativePrompt,
          width: 512,
          height: 768,
          seed: panel.panel_id * 1000 + i,
        });

        generatedPanels.push({
          ...panel,
          image_generation: {
            prompt: finalPrompt,
            negative_prompt: negativePrompt,
            style_tags: imageData.style_tags,
            composition: imageData.composition,
            status: 'generated',
            image_data: result.imageDataUrl,
            api_used: 'stability_ai_ultra_manhua',
            attempts: attempts,
            gemini_used: !!responseText,
            translated: true,
          },
        });

        successfulGenerations++;
        imageGenerated = true;
        console.log(`✅ Panel ${panel.panel_id} - MANHUA generated`);

      } catch (error) {
        console.error(`[Stability] Failed:`, error.message);
        
        if (error.message.includes('402')) {
          console.error(`\n❌ OUT OF CREDITS\n`);
          return {
            generatedPanels,
            successfulGenerations,
            stoppedEarly: true,
            reason: 'out_of_credits'
          };
        }
        
        if (attempts >= maxAttempts) {
          generatedPanels.push({
            ...panel,
            image_generation: {
              prompt: finalPrompt,
              status: 'failed',
              error: error.message,
            }
          });
        } else {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (i < limitedPanels.length - 1) {
      console.log('Waiting 3s...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n=== MANHUA GENERATION SUMMARY ===');
  console.log('Processed:', generatedPanels.length);
  console.log('Success:', successfulGenerations);
  console.log('Style: MANHUA (Chinese Webcomic)');
  console.log('=================================\n');

  return {
    generatedPanels,
    successfulGenerations,
    totalPanels: panels.length,
    limitedTo: limitedPanels.length
  };
}

async function generateImagesConsistent(panels, storyContext, styleReference, characterReferences) {
  const limitedPanels = panels.slice(0, MAX_PANELS);
  const generatedPanels = [];
  let successfulGenerations = 0;

  for (let i = 0; i < limitedPanels.length; i++) {
    const panel = limitedPanels[i];
    console.log(`\nPanel ${panel.panel_id} (${i + 1}/${limitedPanels.length})`);

    // Translate ALL Vietnamese to English
    const englishSetting = await translateToEnglish(panel.setting);
    const englishAction = await translateToEnglish(panel.action);
    const englishVisual = await translateToEnglish(panel.visual_description);

    let characterDescriptions = [];
    if (panel.characters && panel.characters.length > 0) {
      for (const charName of panel.characters) {
        const charRef = characterReferences.character_references?.[charName];
        if (charRef) {
          // Dịch TẤT CẢ character fields
          const englishPhysical = await translateToEnglish(charRef.physical_description || 'elegant features');
          const englishHair = await translateToEnglish(charRef.hair || 'long flowing black hair');
          const englishEyes = await translateToEnglish(charRef.eyes || 'sharp eyes');
          const englishClothing = await translateToEnglish(charRef.clothing || 'traditional Chinese hanfu');
          const englishFeatures = await translateToEnglish(charRef.distinctive_features || 'refined appearance');
          
          characterDescriptions.push(
            `${charName} CONSISTENT CHARACTER: ${englishPhysical}, ` +
            `hair: ${englishHair} (long flowing Chinese style), ` +
            `eyes: ${englishEyes} (elegant Asian features), ` +
            `clothing: ${englishClothing} (traditional Chinese hanfu robes), ` +
            `distinctive: ${englishFeatures}, ` +
            `manhua semi-realistic style, maintain exact same appearance`
          );
        }
      }
    }

    console.log('[Character Descriptions]:', characterDescriptions);

    const manhuaConsistentKeywords = [
      'Chinese manhua webcomic style illustration',
      'Tales of Demons and Gods character art style',
      'Battle Through the Heavens aesthetic',
      'STRICT CHARACTER CONSISTENCY',
      ...characterDescriptions,
      `setting: ${englishSetting} (ancient Chinese architecture, pagodas, temples)`,
      `action: ${englishAction} (martial arts wuxia movements, qi energy)`,
      englishVisual,
      'traditional Chinese hanfu robes with flowing fabric and intricate embroidery',
      'martial arts qi energy effects with glowing golden aura',
      'long flowing black hair with elegant movement',
      'semi-realistic Asian facial features with refined elegant look',
      `${panel.camera_angle} cinematic camera angle with dramatic perspective`,
      'rich vibrant colors: crimson red, imperial gold, jade green, deep blue',
      'dramatic atmospheric lighting with strong contrast and shadows',
      'professional Chinese digital art manhua webcomic style',
      'maintain exact character consistency across all panels',
      'semi-realistic body proportions with elegant Asian aesthetic',
      'trending on Bilibili Comics and Tencent Comics platform',
      'cultivation fantasy martial arts theme'
    ];

    let finalPrompt = manhuaConsistentKeywords.join(', ');
    
    // Final Vietnamese check
    if (/[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i.test(finalPrompt)) {
      console.error('[ERROR] Vietnamese still detected! Translating entire prompt...');
      finalPrompt = await translateToEnglish(finalPrompt);
    }
    
    console.log(`[Final Prompt Length]: ${finalPrompt.length}`);
    console.log(`[Final Prompt Preview]: ${finalPrompt.substring(0, 200)}...`);
    
    const negativePrompt = 'Japanese anime style, Japanese manga, Korean manhwa, Western comic style, modern contemporary style, different character appearance, inconsistent character features, different facial structure, different hair style, different hair color, different eye color, different clothing, photorealistic photo, 3D render, realistic render, chibi style, cute anime style, modern clothing, contemporary fashion, modern city, technology devices, low quality, blurry image, distorted, ugly, deformed, bad anatomy, poorly drawn';

    let attempts = 0;
    let imageGenerated = false;

    while (!imageGenerated && attempts < 3) {
      attempts++;
      console.log(`[Stability] Manhua consistent attempt ${attempts}/3`);
      
      try {
        const result = await callStabilityAPI(finalPrompt, {
          negative_prompt: negativePrompt,
          width: 512,
          height: 768,
          seed: Math.floor(Math.random() * 4294967295),
        });

        generatedPanels.push({
          ...panel,
          image_generation: {
            prompt: finalPrompt,
            negative_prompt: negativePrompt,
            status: 'generated',
            image_data: result.imageDataUrl,
            api_used: 'stability_ai_ultra_manhua_consistent',
            attempts: attempts,
            character_descriptions: characterDescriptions,
            style: 'manhua_consistent',
            translated: true,
          }
        });

        successfulGenerations++;
        imageGenerated = true;
        console.log(`✅ Panel ${panel.panel_id} - MANHUA consistent generated`);

      } catch (error) {
        console.error(`[Stability] Failed:`, error.message);
        
        if (error.message.includes('402')) {
          console.error('\n❌ OUT OF CREDITS\n');
          return { 
            generatedPanels, 
            successfulGenerations, 
            stoppedEarly: true,
            reason: 'out_of_credits'
          };
        }
        
        if (attempts >= 3) {
          generatedPanels.push({
            ...panel,
            image_generation: { 
              status: 'failed', 
              error: error.message,
              prompt: finalPrompt
            }
          });
        } else {
          console.log(`Waiting 3s before retry...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }

    if (i < limitedPanels.length - 1) {
      console.log('Waiting 3s before next panel...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n=== MANHUA CHARACTER CONSISTENCY SUMMARY ===');
  console.log('Processed:', generatedPanels.length);
  console.log('Success:', successfulGenerations);
  console.log('Failed:', generatedPanels.length - successfulGenerations);
  console.log('Success rate:', `${Math.round((successfulGenerations / generatedPanels.length) * 100)}%`);
  console.log('Style: MANHUA (Chinese Webcomic) with Character Consistency');
  console.log('===========================================\n');

  return { 
    generatedPanels, 
    successfulGenerations,
    totalPanels: panels.length,
    limitedTo: limitedPanels.length
  };
}

module.exports = { generateImages, generateImagesConsistent };