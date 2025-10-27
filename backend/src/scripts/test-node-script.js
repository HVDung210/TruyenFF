#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

async function testNodeScript() {
    const scriptPath = path.join(__dirname, 'vision_text_detector.js');
    const testImagePath = 'test.jpg'; // Thay bằng path ảnh thật
    const credentialsPath = path.join(__dirname, '..', '..', 'truyenff-466701-6d617a31f7b4.json');
    
    console.log('Testing Node.js script...');
    console.log('Script:', scriptPath);
    console.log('Image:', testImagePath);
    console.log('Credentials:', credentialsPath);
    
    const command = `node "${scriptPath}" "${testImagePath}" "${credentialsPath}"`;
    console.log('Command:', command);
    
    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
        console.log('\n=== STDOUT ===');
        console.log(stdout);
        console.log('\n=== STDERR ===');
        console.log(stderr);
        console.log('\n=== ERROR ===');
        console.log(error);
        
        if (stdout) {
            try {
                const result = JSON.parse(stdout);
                console.log('\n=== PARSED JSON ===');
                console.log(JSON.stringify(result, null, 2));
            } catch (e) {
                console.log('\n=== JSON PARSE ERROR ===');
                console.log(e.message);
            }
        }
    });
}

testNodeScript();
