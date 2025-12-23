const Replicate = require('replicate');

async function generateImageReplicate(prompt, options = {}) {
  const {
    width = 512,
    height = 768,
    negative_prompt = 'ugly, deformed, blurry, low quality',
    seed
  } = options;

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  try {
    console.log('[Replicate] Generating image...');
    console.log('[Replicate] Prompt length:', prompt.length);
    
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt,
          negative_prompt,
          width,
          height,
          num_inference_steps: 25,
          guidance_scale: 8,
          ...(seed && { seed })
        }
      }
    );
    
    // Output là URL của ảnh
    const imageUrl = Array.isArray(output) ? output[0] : output;
    console.log('[Replicate] Image URL:', imageUrl);
    
    // Download và convert sang base64
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    
    console.log('[Replicate] Image generated, size:', (base64.length / 1024).toFixed(2), 'KB');
    return `data:image/png;base64,${base64}`;
    
  } catch (error) {
    console.error('[Replicate] Error:', error.message);
    throw error;
  }
}

module.exports = { generateImageReplicate };