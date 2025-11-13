const fs = require('fs');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

async function detectTextInImage(imagePath, credentialsPath) {
    try {
        // Initialize Vision API client
        const client = new ImageAnnotatorClient({
            keyFilename: credentialsPath,
        });

        console.error(`[NODE] Reading image from: ${imagePath}`);
        
        // Read image file
        const imageBuffer = fs.readFileSync(imagePath);
        
        console.error(`[NODE] Image size: ${imageBuffer.length} bytes`);
        
        // Prepare request
        const request = {
            image: {
                content: imageBuffer,
            },
            features: [
                {
                    type: 'DOCUMENT_TEXT_DETECTION',
                    maxResults: 1,
                }
            ],
        };

        console.error(`[NODE] Calling Vision API...`);
        
        // Call Vision API
        const [result] = await client.annotateImage(request);
        
        console.error(`[NODE] Vision API call completed`);
        
        // Process results
        const textAnnotations = result.textAnnotations || [];
        const fullTextAnnotation = result.fullTextAnnotation || {};
        
        console.error(`[NODE] Found ${textAnnotations.length} text annotations`);
        
        // Return structured result
        const response = {
            success: true,
            textAnnotations: textAnnotations.map(annotation => ({
                description: annotation.description,
                boundingPoly: annotation.boundingPoly,
                confidence: annotation.score || 0
            })),
            fullTextAnnotation: {
                text: fullTextAnnotation.text || '',
                pages: fullTextAnnotation.pages || []
            },
            textCount: textAnnotations.length,
            hasText: textAnnotations.length > 0
        };
        
        console.error(`[NODE] Response prepared with ${response.textCount} text annotations`);
        
        return response;
        
    } catch (error) {
        console.error(`[NODE][ERROR] Vision API error:`, error);
        
        return {
            success: false,
            error: error.message,
            textAnnotations: [],
            fullTextAnnotation: { text: '', pages: [] },
            textCount: 0,
            hasText: false
        };
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        const errorResult = {
            success: false,
            error: 'Usage: node vision_text_detector.js <image_path> <credentials_path>',
            textAnnotations: [],
            fullTextAnnotation: { text: '', pages: [] },
            textCount: 0,
            hasText: false
        };
        process.stdout.write(JSON.stringify(errorResult, null, 2));
        process.exit(1);
    }
    
    const imagePath = args[0];
    const credentialsPath = args[1];
    
    // Log to stderr only
    console.error(`[NODE] Starting text detection for: ${imagePath}`);
    console.error(`[NODE] Using credentials: ${credentialsPath}`);
    
    try {
        const result = await detectTextInImage(imagePath, credentialsPath);
        
        // Output JSON result to stdout (only JSON, no other logs)
        process.stdout.write(JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.error(`[NODE] Text detection completed successfully`);
            process.exit(0);
        } else {
            console.error(`[NODE] Text detection failed: ${result.error}`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error(`[NODE][ERROR] Unexpected error:`, error);
        
        const errorResult = {
            success: false,
            error: error.message,
            textAnnotations: [],
            fullTextAnnotation: { text: '', pages: [] },
            textCount: 0,
            hasText: false
        };
        
        process.stdout.write(JSON.stringify(errorResult, null, 2));
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = { detectTextInImage };
