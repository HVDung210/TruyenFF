const fs = require('fs');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

async function detectTextInImage(imagePath, credentialsPath) {
    try {
        const client = new ImageAnnotatorClient({ keyFilename: credentialsPath });
        console.error(`[NODE] Reading image from: ${imagePath}`);
        const imageBuffer = fs.readFileSync(imagePath);
        
        const request = {
            image: { content: imageBuffer },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }], // Không giới hạn kết quả
        };

        console.error(`[NODE] Calling Vision API...`);
        const [result] = await client.annotateImage(request);
        const fullTextAnnotation = result.fullTextAnnotation || {};
        
        // --- LOGIC GOM CHỮ THÔNG MINH ---
        const textBlocks = [];
        
        if (fullTextAnnotation.pages) {
            fullTextAnnotation.pages.forEach(page => {
                page.blocks.forEach(block => {
                    let blockText = '';
                    block.paragraphs.forEach(para => {
                        para.words.forEach(word => {
                            word.symbols.forEach(symbol => {
                                blockText += symbol.text;
                                // Xử lý dấu cách và xuống dòng
                                if (symbol.property && symbol.property.detectedBreak) {
                                    const breakType = symbol.property.detectedBreak.type;
                                    if (['SPACE', 'SURE_SPACE', 'EOL_SURE_SPACE'].includes(breakType)) {
                                        blockText += ' ';
                                    } else if (breakType === 'LINE_BREAK') {
                                        blockText += '\n';
                                    }
                                }
                            });
                        });
                    });
                    
                    if (blockText.trim().length > 0) {
                        textBlocks.push({
                            text: blockText.trim(),
                            vertices: block.boundingBox.vertices // Tọa độ 4 góc của cụm chữ
                        });
                    }
                });
            });
        }

        console.error(`[NODE] Gom thành công ${textBlocks.length} cụm chữ.`);
        
        return {
            success: true,
            textBlocks: textBlocks, // Trả về danh sách cụm chữ đã gom
            hasText: textBlocks.length > 0
        };
        
    } catch (error) {
        console.error(`[NODE][ERROR] Vision API error:`, error);
        return { success: false, error: error.message, textBlocks: [], hasText: false };
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        process.stdout.write(JSON.stringify({ success: false, error: 'Usage: node ...' }));
        process.exit(1);
    }
    
    try {
        const result = await detectTextInImage(args[0], args[1]);
        process.stdout.write(JSON.stringify(result));
        process.exit(result.success ? 0 : 1);
    } catch (error) {
        process.stdout.write(JSON.stringify({ success: false, error: error.message }));
        process.exit(1);
    }
}

if (require.main === module) { main(); }
module.exports = { detectTextInImage };