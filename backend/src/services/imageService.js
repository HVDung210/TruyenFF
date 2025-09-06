const { HF_API_TOKEN, HF_MODEL } = require('../config/env');
const { retryGeminiRequest } = require('../utils/retryGemini');

async function callHuggingFace(inputs, parameters) {
  const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
  if (!HF_API_TOKEN) throw new Error('Thiếu Hugging Face API token');
  console.log('[HF] Requesting model:', HF_MODEL);
  console.log('[HF] Inputs length:', inputs?.length || 0);
  console.log('[HF] Parameters:', parameters);
  const hfResponse = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs, parameters })
  });
  if (!hfResponse.ok) {
    if (hfResponse.status === 503) return { modelLoading: true };
    const errText = await hfResponse.text();
    console.error('[HF] Error:', hfResponse.status, errText?.slice(0, 500));
    throw new Error(`HuggingFace API error: ${hfResponse.status} ${errText}`);
  }
  console.log('[HF] Response OK');
  const imageBlob = await hfResponse.blob();
  const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
  const base64Image = imageBuffer.toString('base64');
  const imageDataUrl = `data:image/png;base64,${base64Image}`;
  return { imageDataUrl };
}

async function generateImages(panels, storyContext, styleReference) {
  const generatedPanels = [];
  let successfulGenerations = 0;

  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    console.log(`Processing panel ${panel.panel_id} (${i + 1}/${panels.length})`);
    let responseText;
    let imageData = {};
    try {
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
}`;
      responseText = await retryGeminiRequest(imagePrompt);
      console.log('[Gemini] prompt length:', imagePrompt.length);
      console.log('[Gemini] response length:', responseText?.length || 0);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) imageData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn('[Gemini] Failed, using fallback prompt:', e.message);
      imageData = {
        image_prompt: `${panel.visual_description}, ${panel.setting}, characters: ${panel.characters.join(', ')}, ${panel.action}, ${panel.camera_angle} angle, manga style, full color, detailed line art`,
        negative_prompt: 'blurry, low quality, distorted, text, watermark, realistic photo',
        style_tags: ['manga', 'full color', 'detailed', 'vibrant colors', 'comic_style'],
        composition: panel.camera_angle,
      };
    }

    const finalPrompt = imageData.image_prompt || panel.visual_description;
    const negativePrompt = imageData.negative_prompt || 'blurry, low quality, distorted, text, watermark';
    console.log(`[GEN] Panel ${panel.panel_id} prompt len=${finalPrompt.length}, neg len=${negativePrompt.length}`);

    let imageGenerated = false;
    let hfAttempts = 0;
    const maxHfAttempts = 3;
    while (!imageGenerated && hfAttempts < maxHfAttempts) {
      hfAttempts++;
      try {
        const result = await callHuggingFace(finalPrompt, {
          negative_prompt: negativePrompt,
          num_inference_steps: 20,
          guidance_scale: 7.5,
          width: 512,
          height: 768,
          seed: panel.panel_id || Math.floor(Math.random() * 1000000),
        });
        if (result.modelLoading) {
          console.log(`[HF] Model loading (503) for panel ${panel.panel_id}, attempt ${hfAttempts}/${maxHfAttempts}`);
          if (hfAttempts < maxHfAttempts) await new Promise(r => setTimeout(r, 20000));
        } else {
          generatedPanels.push({
            ...panel,
            image_generation: {
              prompt: finalPrompt,
              negative_prompt: negativePrompt,
              style_tags: imageData.style_tags || ['manga', 'full color', 'detailed'],
              composition: imageData.composition || panel.camera_angle,
              status: 'generated',
              image_data: result.imageDataUrl,
              api_used: 'huggingface',
              attempts: hfAttempts,
              gemini_used: !!responseText,
            },
          });
          successfulGenerations++;
          imageGenerated = true;
          console.log(`✓ Panel ${panel.panel_id} generated successfully (attempt ${hfAttempts})`);
        }
      } catch (hfError) {
        console.error(`[HF] Attempt ${hfAttempts} failed for panel ${panel.panel_id}:`, hfError.message);
        if (hfAttempts >= maxHfAttempts) break;
      }
    }
    if (!imageGenerated) {
      generatedPanels.push({
        ...panel,
        image_generation: {
          prompt: finalPrompt,
          negative_prompt: negativePrompt,
          style_tags: imageData.style_tags || ['manga'],
          composition: imageData.composition || panel.camera_angle,
          status: 'failed',
          error: 'Failed after multiple attempts',
          api_used: 'huggingface',
          attempts: hfAttempts,
          gemini_used: !!responseText,
        }
      });
    }
    if (i < panels.length - 1) {
      console.log('Waiting 3s before next panel...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.log('\n=== SINH HÌNH ẢNH PANELS - SUMMARY ===');
  console.log('Số panels xử lý:', generatedPanels.length);
  console.log('Panels thành công:', successfulGenerations);
  console.log('Panels thất bại:', generatedPanels.length - successfulGenerations);
  console.log('Tỷ lệ thành công:', `${Math.round((successfulGenerations / generatedPanels.length) * 100)}%`);
  console.log('=====================================\n');
  return {
    generatedPanels,
    successfulGenerations,
  };
}

async function generateImagesConsistent(panels, storyContext, styleReference, characterReferences) {
  const generatedPanels = [];
  let successfulGenerations = 0;
  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    console.log(`Processing panel ${panel.panel_id} (${i + 1}/${panels.length})`);
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
}`;
    let responseText;
    let imageData = {};
    try {
      responseText = await retryGeminiRequest(consistentPrompt);
      console.log('[Gemini][consistent] prompt length:', consistentPrompt.length);
      console.log('[Gemini][consistent] response length:', responseText?.length || 0);
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) imageData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.warn('[Gemini][consistent] Failed, using fallback prompt:', e.message);
      const charTags = characterDescriptions.length > 0 ? characterDescriptions.join(', ') : `characters: ${panel.characters.join(', ')}`;
      imageData = {
        image_prompt: `${panel.visual_description}, ${panel.setting}, ${charTags}, ${panel.action}, ${panel.camera_angle} angle, manga style, full color, detailed line art, consistent character design`,
        negative_prompt: 'blurry, low quality, distorted, text, watermark, realistic photo, inconsistent character design, different face, different hair',
        character_consistency_tags: panel.characters.map(char => {
          const ref = characterReferences.character_references?.[char];
          return ref ? ref.consistent_tags : char;
        }).filter(Boolean),
        composition: panel.camera_angle,
      };
    }
    const enhancedNegativePrompt = `${imageData.negative_prompt || 'blurry, low quality, distorted'}, inconsistent character design, different facial features, different hair color, different eye color, character inconsistency, multiple versions of same character`;
    let finalPrompt = imageData.image_prompt || panel.visual_description;
    if (imageData.character_consistency_tags && imageData.character_consistency_tags.length > 0) {
      finalPrompt += `, CONSISTENT CHARACTERS: ${imageData.character_consistency_tags.join(', ')}`;
    }
    let imageGenerated = false;
    let hfAttempts = 0;
    const maxHfAttempts = 3;
    while (!imageGenerated && hfAttempts < maxHfAttempts) {
      hfAttempts++;
      try {
        const result = await callHuggingFace(finalPrompt, {
          negative_prompt: enhancedNegativePrompt,
          num_inference_steps: 25,
          guidance_scale: 8.0,
          width: 512,
          height: 768,
          seed: Math.floor(Math.random() * 1000000),
        });
        if (result.modelLoading) {
          console.log(`[HF] Model loading (503) for panel ${panel.panel_id}, attempt ${hfAttempts}/${maxHfAttempts}`);
          if (hfAttempts < maxHfAttempts) await new Promise(r => setTimeout(r, 20000));
        } else {
          generatedPanels.push({
            ...panel,
            image_generation: {
              prompt: finalPrompt,
              negative_prompt: enhancedNegativePrompt,
              character_consistency_tags: imageData.character_consistency_tags || [],
              composition: imageData.composition || panel.camera_angle,
              status: 'generated',
              image_data: result.imageDataUrl,
              api_used: 'huggingface_consistent',
              attempts: hfAttempts,
              gemini_used: !!responseText,
              character_descriptions: characterDescriptions,
            }
          });
          successfulGenerations++;
          imageGenerated = true;
          console.log(`✓ Panel ${panel.panel_id} generated with character consistency (attempt ${hfAttempts})`);
        }
      } catch (hfError) {
        console.error(`[HF] Attempt ${hfAttempts} failed for panel ${panel.panel_id}:`, hfError.message);
        if (hfAttempts >= maxHfAttempts) break;
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
          status: 'failed',
          error: 'Failed after multiple attempts',
          api_used: 'huggingface_consistent',
          attempts: hfAttempts,
          gemini_used: !!responseText,
        }
      });
    }
    if (i < panels.length - 1) {
      console.log('Waiting 3s before next panel...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  console.log('\n=== SINH HÌNH ẢNH VỚI CHARACTER CONSISTENCY ===');
  console.log('Số panels xử lý:', generatedPanels.length);
  console.log('Panels thành công:', successfulGenerations);
  console.log('Tỷ lệ thành công:', `${Math.round((successfulGenerations / generatedPanels.length) * 100)}%`);
  console.log('================================================\n');
  return { generatedPanels, successfulGenerations };
}

module.exports = { generateImages, generateImagesConsistent };


