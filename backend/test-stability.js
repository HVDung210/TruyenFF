require('dotenv').config();

async function testStabilityAI() {
  console.log('=== TESTING STABILITY AI API ===\n');
  
  const STABILITY_API_KEY = process.env.STABILITY_API_KEY;
  
  console.log('1. Checking API key...');
  console.log('Key exists:', !!STABILITY_API_KEY);
  console.log('Key prefix:', STABILITY_API_KEY ? STABILITY_API_KEY.substring(0, 10) + '...' : 'NOT SET');
  
  if (!STABILITY_API_KEY) {
    console.error('\n❌ STABILITY_API_KEY not found!');
    console.log('\nSteps to get API key:');
    console.log('1. Go to: https://platform.stability.ai/account/keys');
    console.log('2. Sign up/Login (có thể dùng Google)');
    console.log('3. Create API Key (Free tier: $10 credit)');
    console.log('4. Add to .env: STABILITY_API_KEY="sk-..."');
    return;
  }

  try {
    console.log('\n2. Testing text-to-image generation...');
    
    const formData = new FormData();
    formData.append('prompt', 'a red cat, digital art, high quality');
    formData.append('output_format', 'png');
    formData.append('width', '512');
    formData.append('height', '512');
    
    console.log('Sending request to Stability AI...');
    
    const response = await fetch(
      'https://api.stability.ai/v2beta/stable-image/generate/sd3',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STABILITY_API_KEY}`,
          'Accept': 'image/*'
        },
        body: formData
      }
    );

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', errorText);
      
      if (response.status === 401) {
        console.error('\n⚠️ Unauthorized! Check your API key.');
      } else if (response.status === 402) {
        console.error('\n⚠️ Payment required! Check credit balance.');
      }
      return;
    }

    const imageBlob = await response.blob();
    const sizeKB = (imageBlob.size / 1024).toFixed(2);
    
    console.log('\n✅ Image generated successfully!');
    console.log('Image size:', sizeKB, 'KB');
    console.log('Image type:', imageBlob.type);
    
    // Convert to base64
    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    
    console.log('Base64 length:', (base64.length / 1024).toFixed(2), 'KB');
    
    console.log('\n=== TEST PASSED ===');
    console.log('✅ Stability AI API is working!');
    console.log('You can now use it in your application.');

  } catch (error) {
    console.error('\n❌ Exception:', error.message);
  }
}

testStabilityAI();