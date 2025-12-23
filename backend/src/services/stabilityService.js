async function generateImageStability(prompt, options = {}) {
  const {
    width = 512,
    height = 768,
    negative_prompt = 'ugly, deformed, blurry, low quality, distorted',
    seed
  } = options;

  const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
  
  if (!STABILITY_API_KEY) {
    throw new Error('STABILITY_API_KEY not configured');
  }

  try {
    console.log('[Stability] Generating image...');
    console.log('[Stability] Prompt length:', prompt.length);
    
    const formData = new FormData();
    formData.append('prompt', prompt);
    if (negative_prompt) {
      formData.append('negative_prompt', negative_prompt);
    }
    formData.append('output_format', 'png');
    formData.append('width', width.toString());
    formData.append('height', height.toString());
    if (seed) {
      formData.append('seed', seed.toString());
    }
    
    const response = await fetch(
      'https://api.stability.ai/v2beta/stable-image/generate/core',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': 'image/*'
        },
        body: formData
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Stability] Error:', response.status, errorText);
      throw new Error(`Stability AI error: ${response.status} ${errorText}`);
    }

    const imageBlob = await response.blob();
    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    console.log('[Stability] Image generated, size:', (base64.length / 1024).toFixed(2), 'KB');
    console.log('[Stability] Seed:', response.headers.get('seed'));
    
    return `data:image/png;base64,${base64}`;
    
  } catch (error) {
    console.error('[Stability] Generation failed:', error.message);
    throw error;
  }
}

module.exports = { generateImageStability };