import React, { useState } from 'react';
import { ChevronDown, ChevronUp, BookOpen, Image, Zap, Download, Play, Loader2, Eye, Upload, Users, MessageSquare  } from 'lucide-react';

const API_BASE_URL = 'http://localhost:5000';

const NovelToComicTester = () => {
  const [activeTab, setActiveTab] = useState('load');
  const [loading, setLoading] = useState({});
  const [results, setResults] = useState({});
  const [novelContent, setNovelContent] = useState('');
  const [filename, setFilename] = useState('');
  const [expandedPanels, setExpandedPanels] = useState({});
  const [storyName, setStoryName] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);
  const [characterRefs, setCharacterRefs] = useState(null);
  const [characterImages, setCharacterImages] = useState({});
  const [uploadingImages, setUploadingImages] = useState({});
  const [dialogueProcessing, setDialogueProcessing] = useState(false);


  // Sample novel files for testing
  const sampleFiles = [
    'dai_quan_gia_la_ma_hoang_chuong_5.json',
    'dai_quan_gia_la_ma_hoang_chuong_6.json',
    'dai_quan_gia_la_ma_hoang_chuong_7.json',
    'van_co_chi_ton_chuong_10.json',
    'van_co_chi_ton_chuong_11.json',
    'van_co_chi_ton_chuong_12.json',
    'dai_phung_da_canh_nhan_chuong_20.json',
    'dai_phung_da_canh_nhan_chuong_21.json',
    'dai_phung_da_canh_nhan_chuong_22.json'
  ];

  const setLoadingState = (key, value) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  };

  const setResult = (key, value) => {
    setResults(prev => ({ ...prev, [key]: value }));
  };

  // 1. Load novel content
  const loadNovelContent = async () => {
    if (!filename) {
      alert('Vui lòng nhập tên file');
      return;
    }

    setLoadingState('load', true);
    try {
      console.log('Requesting:', `${API_BASE_URL}/api/novel-content/${filename}`);
      
      const response = await fetch(`${API_BASE_URL}/api/novel-content/${filename}`);
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers.get('content-type'));
      
      // Kiểm tra content-type để đảm bảo là JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const htmlText = await response.text();
        console.error('Server returned HTML instead of JSON:', htmlText.substring(0, 500));
        alert(`Server trả về HTML thay vì JSON. Status: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        setNovelContent(data.content);
        setResult('load', data);
        console.log('Content loaded successfully, length:', data.content?.length);
      } else {
        console.error('API Error:', data);
        alert('Lỗi: ' + (data.error || 'Unknown error') + 
              (data.details ? '\nDetails: ' + data.details : '') +
              (data.path ? '\nPath: ' + data.path : ''));
      }
    } catch (error) {
      console.error('Network Error:', error);
      alert('Lỗi kết nối: ' + error.message + 
            '\n\nKiểm tra:\n1. Server có đang chạy?\n2. File có tồn tại?\n3. Đường dẫn có đúng?');
    } finally {
      setLoadingState('load', false);
    }
  };

  // 2. Analyze novel content
  const analyzeContent = async () => {
    if (!novelContent) {
      alert('Vui lòng load nội dung truyện trước');
      return;
    }

    setLoadingState('analyze', true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/novel-to-comic/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storyId: 1,
          chapterNumber: 1,
          novelContent: novelContent
        })
      });

      const data = await response.json();
      setResult('analyze', data);
    } catch (error) {
      alert('Lỗi phân tích: ' + error.message);
    } finally {
      setLoadingState('analyze', false);
    }
  };

  const handleCharacterImageUpload = async (characterName, file) => {
  if (!file) return;
  
  setUploadingImages(prev => ({ ...prev, [characterName]: true }));
  
  try {
    // Convert file to base64 for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCharacterImages(prev => ({
        ...prev,
        [characterName]: {
          file: file,
          preview: e.target.result,
          name: file.name
        }
      }));
    };
    reader.readAsDataURL(file);
  } catch (error) {
    alert('Lỗi upload ảnh: ' + error.message);
  } finally {
    setUploadingImages(prev => ({ ...prev, [characterName]: false }));
  }
};

  // 2.5. Tạo character references (bước mới)
  const createCharacterReferences = async () => {
    if (!results.analyze?.analysis?.main_characters) {
      alert('Vui lòng phân tích nội dung trước để có danh sách nhân vật');
      return;
    }

    setLoadingState('characters', true);
    try {
      // Tạo FormData để gửi ảnh kèm theo
      const formData = new FormData();
      formData.append('characters', JSON.stringify(results.analyze.analysis.main_characters));

      
      // THÊM: gửi story context
      formData.append('storyContext', novelContent || results.analyze?.analysis?.chapter_summary || '');
      
      // Thêm ảnh nhân vật nếu có
      Object.entries(characterImages).forEach(([charName, imageData]) => {
        if (imageData.file) {
          formData.append(`character_image_${charName}`, imageData.file);
        }
      });

      const response = await fetch(`${API_BASE_URL}/api/novel-to-comic/create-character-refs`, {
        method: 'POST',
        body: formData // Không set Content-Type header khi dùng FormData
      });

      if (response.ok) {
        const data = await response.json();
        
        // Cập nhật results state
        setResult('characters', data);
        
        // Cập nhật characterRefs state
        setCharacterRefs(data.character_references ? data : { character_references: data.character_references });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
    } catch (error) {
      alert('Lỗi tạo character references: ' + error.message);
    } finally {
      setLoadingState('characters', false);
    }
  };

  // // 3. Cập nhật generateImagePrompts
  const generateImagePrompts = async () => {
    if (!results.analyze?.analysis?.panels) {
      alert('Vui lòng phân tích nội dung trước');
      return;
    }

    setLoadingState('prompts', true);
    try {
      // Tạo prompts với character consistency nếu có
      const panels = results.analyze.analysis.panels.map(panel => {
        let characterDescriptions = [];
        
        if (characterRefs && panel.characters) {
          for (const charName of panel.characters) {
            const charRef = characterRefs.character_references?.[charName] || characterRefs[charName];
            if (charRef) {
              characterDescriptions.push(`${charName}: ${charRef.physical_description}, ${charRef.hair}, ${charRef.eyes}, ${charRef.clothing}`);
            }
          }
        }

        const basePrompt = `${panel.visual_description}, ${panel.setting}, ${panel.action}, ${panel.camera_angle} angle, manga style, full color, detailed line art`;
        const consistentPrompt = characterDescriptions.length > 0 
          ? `${basePrompt}, CONSISTENT CHARACTERS: ${characterDescriptions.join(', ')}`
          : basePrompt;

        return {
          ...panel,
          image_generation: {
            prompt: consistentPrompt,
            negative_prompt: "blurry, low quality, distorted, text, watermark, realistic photo, inconsistent character design, different face, different hair",
            style_tags: ["manga", "full color", "detailed", "vibrant colors", "comic_style", "consistent_characters"],
            composition: panel.camera_angle,
            status: "ready_for_generation",
            api_used: "huggingface",
            character_descriptions: characterDescriptions
          }
        };
      });

      setResult('prompts', {
        success: true,
        panels: panels,
        total_panels: panels.length,
        ready_for_generation: panels.length,
        character_consistency_applied: characterRefs !== null
      });

      console.log(`Generated prompts for ${panels.length} panels with character consistency: ${characterRefs !== null}`);
    } catch (error) {
      alert('Lỗi tạo prompts: ' + error.message);
    } finally {
      setLoadingState('prompts', false);
    }
  };

  // 4. Cập nhật generateActualImages với consistency
  const generateActualImages = async () => {
    const panels = results.prompts?.panels || results.analyze?.analysis?.panels;
    if (!panels) {
      alert('Vui lòng có panels với prompts trước');
      return;
    }

    if (!characterRefs) {
      const confirmWithoutRefs = window.confirm(
        'Chưa có character references. Hình ảnh nhân vật có thể không nhất quán. ' +
        'Bạn có muốn tiếp tục không?\n\n' +
        'Khuyến nghị: Tạo character references trước để có kết quả tốt hơn.'
      );
      
      if (!confirmWithoutRefs) {
        return;
      }
    }

    setLoadingState('images', true);
    try {
      // Sử dụng endpoint mới với character consistency
      const endpoint = characterRefs 
        ? '/api/novel-to-comic/generate-images-consistent'
        : '/api/novel-to-comic/generate-images';

      const requestBody = {
        panels: panels,
        storyContext: 'Ancient Chinese setting, martial arts theme, fantasy elements',
        styleReference: 'Manga/manhwa style, full color, vibrant colors, detailed art, consistent character design'
      };

      // Thêm character references nếu có
      if (characterRefs) {
        requestBody.characterReferences = characterRefs;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      setResult('images', data);

      if (data.success) {
        console.log(`Generated ${data.successful_generations}/${data.total_panels} images with ${characterRefs ? 'character consistency' : 'basic prompts'}`);
      }
    } catch (error) {
      alert('Lỗi sinh hình ảnh: ' + error.message);
    } finally {
      setLoadingState('images', false);
    }
  };

  // Thêm function mới để thêm lời thoại vào ảnh đã sinh
const addDialogueToImages = async () => {
  const panels = results.images?.panels;
  if (!panels) {
    alert('Vui lòng sinh hình ảnh trước khi thêm lời thoại');
    return;
  }

  // Kiểm tra panels có lời thoại không
  const panelsWithDialogue = panels.filter(p => p.dialogue?.text);
  if (panelsWithDialogue.length === 0) {
    alert('Không có panel nào có lời thoại để thêm');
    return;
  }

  setDialogueProcessing(true);
  try {
    const response = await fetch(`${API_BASE_URL}/api/novel-to-comic/add-dialogue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        panels: panels
      })
    });

    const data = await response.json();
    
    if (data.success) {
      // Cập nhật kết quả với ảnh đã có lời thoại
      setResult('images', {
        ...results.images,
        panels: data.panels,
        dialogue_added: true,
        dialogue_success_count: data.dialogue_added_count
      });
      
      alert(`Đã thêm lời thoại thành công cho ${data.dialogue_added_count}/${data.total_panels} panels`);
    }
    
  } catch (error) {
    alert('Lỗi khi thêm lời thoại: ' + error.message);
  } finally {
    setDialogueProcessing(false);
  }
};

  // Ultra-aggressive compression with multiple fallback strategies
const compressImageUltraAggressive = async (base64String) => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Strategy 1: Progressive dimension reduction
        let { width, height } = img;
        const originalArea = width * height;
        
        // Start with reasonable size, then reduce drastically if needed
        const sizeReductions = [1.0, 0.75, 0.5, 0.35, 0.25]; // Different scaling factors
        const qualityLevels = [0.7, 0.5, 0.3, 0.15, 0.08];   // Corresponding quality levels
        
        let bestCompression = null;
        let smallestSize = base64String.length;
        
        for (let i = 0; i < sizeReductions.length; i++) {
          try {
            const scale = sizeReductions[i];
            const quality = qualityLevels[i];
            
            const newWidth = Math.round(width * scale);
            const newHeight = Math.round(height * scale);
            
            // Skip if too small
            if (newWidth < 100 || newHeight < 100) continue;
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            // Clear and redraw
            ctx.clearRect(0, 0, newWidth, newHeight);
            ctx.drawImage(img, 0, 0, newWidth, newHeight);
            
            // Try JPEG compression
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            let compressedBase64 = compressedDataUrl.replace(/^data:image\/jpeg;base64,/, '');
            
            console.log(`Compression attempt ${i + 1}: ${newWidth}x${newHeight}, quality=${quality}, size=${(compressedBase64.length / 1024 / 1024).toFixed(2)}MB`);
            
            // Check if this compression is good enough and smaller
            if (compressedBase64.length < smallestSize) {
              smallestSize = compressedBase64.length;
              bestCompression = {
                data: compressedBase64,
                width: newWidth,
                height: newHeight,
                quality: quality,
                reduction: Math.round((1 - compressedBase64.length / base64String.length) * 100)
              };
              
              // If we achieved good compression (< 10MB), stop here
              if (compressedBase64.length < 10 * 1024 * 1024) {
                break;
              }
            }
          } catch (compressionError) {
            console.warn(`Compression level ${i + 1} failed:`, compressionError);
          }
        }
        
        if (bestCompression) {
          console.log(`Best compression: ${bestCompression.width}x${bestCompression.height}, ${bestCompression.reduction}% reduction, final size: ${(smallestSize / 1024 / 1024).toFixed(2)}MB`);
          resolve(bestCompression.data);
        } else {
          console.warn('All compression attempts failed, using original');
          resolve(null);
        }
      };
      
      img.onerror = function() {
        console.warn('Failed to load image for compression');
        resolve(null);
      };
      
      const imageUrl = base64String.startsWith('data:') ? base64String : `data:image/png;base64,${base64String}`;
      img.src = imageUrl;
      
    } catch (error) {
      console.warn('Ultra compression error:', error);
      resolve(null);
    }
  });
};


// Pre-upload size check and compression
const prepareImageForUpload = async (imageData) => {
  const originalSize = imageData.length;
  const originalSizeMB = (originalSize / 1024 / 1024).toFixed(2);
  
  console.log(`Original image size: ${originalSizeMB}MB`);
  
  // If image is already small enough, return as-is
  if (originalSize < 5 * 1024 * 1024) { // < 5MB
    console.log('Image size acceptable, no compression needed');
    return {
      data: imageData,
      compressed: false,
      originalSizeMB: originalSizeMB,
      finalSizeMB: originalSizeMB
    };
  }
  
  // Apply ultra-aggressive compression
  console.log('Image too large, applying ultra-aggressive compression...');
  const compressedData = await compressImageUltraAggressive(imageData);
  
  if (compressedData) {
    const finalSizeMB = (compressedData.length / 1024 / 1024).toFixed(2);
    const reduction = Math.round((1 - compressedData.length / originalSize) * 100);
    
    console.log(`Compression successful: ${originalSizeMB}MB -> ${finalSizeMB}MB (${reduction}% reduction)`);
    
    return {
      data: compressedData,
      compressed: true,
      originalSizeMB: originalSizeMB,
      finalSizeMB: finalSizeMB,
      compressionRatio: reduction
    };
  } else {
    console.warn('Compression failed, using original image');
    return {
      data: imageData,
      compressed: false,
      originalSizeMB: originalSizeMB,
      finalSizeMB: originalSizeMB,
      compressionFailed: true
    };
  }
};

  // 5. Upload images to Google Cloud Storage 

const uploadToGCS = async () => {
  const panels = results.images?.panels;
  if (!panels) {
    alert('Vui lòng sinh hình ảnh trước khi upload');
    return;
  }

  if (!storyName.trim()) {
    alert('Vui lòng nhập tên truyện');
    return;
  }

  // Lọc panels có hình ảnh
  const panelsWithImages = panels.filter(panel => 
    panel.image_generation?.image_data && 
    panel.image_generation.status === 'generated'
  );

  if (panelsWithImages.length === 0) {
    alert('Không có panels nào có hình ảnh để upload');
    return;
  }

  setLoadingState('upload', true);
  
  const uploadedPanels = [];
  let successfulUploads = 0;
  let failedUploads = 0;

  // Initialize progress tracking
  setResult('upload', {
    success: false,
    panels: [],
    total_panels: panelsWithImages.length,
    successful_uploads: 0,
    failed_uploads: 0,
    progress: 0,
    status: 'uploading'
  });

  try {
    // Upload từng panel một với improved compression
    for (let i = 0; i < panelsWithImages.length; i++) {
      const panel = panelsWithImages[i];
      
      console.log(`Uploading panel ${i + 1}/${panelsWithImages.length}: ${panel.panel_id}`);
      
      // Update progress
      const currentProgress = Math.round(((i) / panelsWithImages.length) * 100);
      setResult('upload', prev => ({
        ...prev,
        progress: currentProgress,
        status: `Uploading panel ${i + 1}/${panelsWithImages.length}`
      }));
      
      // Try different upload strategies
      let panelUploaded = false;
      let uploadMethod = 'standard';
      
      // Strategy 1: Try streaming upload first for large images
      try {
        const originalImageData = panel.image_generation.image_data;
        const originalSize = originalImageData.length;
        
        console.log(`Panel ${panel.panel_id} original size: ${(originalSize / 1024 / 1024).toFixed(2)}MB`);
        
        // If image is large, try streaming upload first
        if (originalSize > 3 * 1024 * 1024) { // > 3MB
          console.log(`Panel ${panel.panel_id} is large, trying streaming upload`);
          const streamResult = await uploadPanelChunked(panel, storyName.trim(), chapterNumber, i, panelsWithImages.length);
          uploadedPanels.push(streamResult);
          successfulUploads++;
          panelUploaded = true;
          uploadMethod = 'streaming';
        }
      } catch (streamError) {
        console.log(`Streaming upload failed for panel ${panel.panel_id}, falling back to standard: ${streamError.message}`);
      }
      
      // Strategy 2: Standard upload with progressive compression
      if (!panelUploaded) {
        let retryCount = 0;
        const maxRetries = 3;
        
        while (!panelUploaded && retryCount < maxRetries) {
          try {
            let imageData = panel.image_generation.image_data;
            let compressionApplied = false;
            
            // Progressive compression based on retry attempt
            if (retryCount === 0) {
              // First attempt: light compression for large images
              const originalSize = imageData.length;
              if (originalSize > 15 * 1024 * 1024) { // > 15MB
                const compressed = await compressImageUltraAggressive(imageData);
                if (compressed) {
                  imageData = compressed;
                  compressionApplied = true;
                }
              }
            } else if (retryCount === 1) {
              // Second attempt: medium compression
              const compressed = await compressImageUltraAggressive(imageData);
              if (compressed) {
                imageData = compressed;
                compressionApplied = true;
              }
            } else {
              // Final attempt: aggressive compression
              const compressed = await compressBase64Image(imageData, 0.4, 1024); // Max 1024px
              if (compressed) {
                imageData = compressed;
                compressionApplied = true;
              }
            }
            
            // Create payload and check size
            const payload = {
              panel: { 
                ...panel, 
                image_generation: { 
                  ...panel.image_generation, 
                  image_data: imageData,
                  compressed: compressionApplied
                }
              },
              storyName: storyName.trim(),
              chapterNumber: chapterNumber,
              panelIndex: i,
              totalPanels: panelsWithImages.length,
              retryAttempt: retryCount
            };
            
            const payloadSize = JSON.stringify(payload).length;
            console.log(`Panel ${panel.panel_id} attempt ${retryCount + 1} payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);
            
            // Final size check - if still too large, compress more aggressively
            if (payloadSize > 10 * 1024 * 1024) { // 10MB limit 
              console.log(`Panel ${panel.panel_id} still too large, ultra compression`);
              const finalCompressed = await compressImageUltraAggressive(imageData);
              if (finalCompressed) {
                payload.panel.image_generation.image_data = finalCompressed;
                payload.panel.image_generation.compressed = true;
              }
            }

            const finalPayloadSize = JSON.stringify(payload).length;
            if (finalPayloadSize > 15 * 1024 * 1024) { // 15MB hard limit
              throw new Error(`Payload too large: ${(finalPayloadSize/1024/1024).toFixed(2)}MB. Server limit exceeded.`);
            }

            const response = await fetch(`${API_BASE_URL}/api/novel-to-comic/upload-single-panel-to-gcs`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(payload)
            });

            // Check if response is ok
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            
            if (data.success && data.panel) {
              // Panel upload thành công
              const uploadedPanel = {
                ...panel,
                gcs_upload: {
                  success: true,
                  public_url: data.panel.gcs_upload?.public_url || data.panel.image_generation?.gcs_url,
                  gcs_path: data.panel.gcs_upload?.gcs_path,
                  filename: data.panel.gcs_upload?.filename,
                  upload_time: new Date().toISOString(),
                  compressed: compressionApplied,
                  retry_count: retryCount,
                  upload_method: uploadMethod
                }
              };
              
              uploadedPanels.push(uploadedPanel);
              successfulUploads++;
              panelUploaded = true;
              console.log(`✓ Panel ${panel.panel_id} uploaded successfully ${compressionApplied ? '(compressed)' : ''}`);
              
            } else {
              throw new Error(data.error || 'Unknown server error');
            }
            
          } catch (panelError) {
            retryCount++;
            console.error(`✗ Panel ${panel.panel_id} upload attempt ${retryCount} failed:`, panelError.message);
            
            if (retryCount >= maxRetries) {
              // Final failure after all retries
              const errorPanel = {
                ...panel,
                gcs_upload: {
                  success: false,
                  error: `Failed after ${maxRetries} attempts: ${panelError.message}`,
                  upload_time: new Date().toISOString(),
                  retry_count: retryCount - 1
                }
              };
              
              uploadedPanels.push(errorPanel);
              failedUploads++;
              panelUploaded = true; // Exit retry loop
            } else {
              // Wait before retry with exponential backoff
              const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
              console.log(`Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
      }
      
      // Update real-time progress
      setResult('upload', prev => ({
        ...prev,
        panels: [...uploadedPanels],
        successful_uploads: successfulUploads,
        failed_uploads: failedUploads,
        progress: Math.round(((i + 1) / panelsWithImages.length) * 100)
      }));
      
      // Delay giữa các uploads
      if (i < panelsWithImages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Tạo kết quả cuối cùng
    const uploadResult = {
      success: successfulUploads > 0,
      panels: uploadedPanels,
      total_panels: uploadedPanels.length,
      successful_uploads: successfulUploads,
      failed_uploads: failedUploads,
      success_rate: Math.round((successfulUploads / uploadedPanels.length) * 100),
      gcs_folder: `novel-to-comic/${storyName.toLowerCase().replace(/[^a-z0-9]/g, '-')}/chapter-${chapterNumber}`,
      timestamp: new Date().toISOString(),
      status: 'completed',
      progress: 100
    };

    setResult('upload', uploadResult);
    
    console.log(`\n=== UPLOAD COMPLETED ===`);
    console.log(`Total: ${uploadedPanels.length} panels`);
    console.log(`Successful: ${successfulUploads}`);
    console.log(`Failed: ${failedUploads}`);
    console.log(`Success rate: ${uploadResult.success_rate}%`);
    console.log(`========================\n`);
    
    // Show summary alert
    if (successfulUploads > 0) {
      alert(`Upload hoàn thành!\n✓ Thành công: ${successfulUploads}/${uploadedPanels.length} panels\n${failedUploads > 0 ? `✗ Thất bại: ${failedUploads} panels` : ''}`);
      
      // Automatically create comic with uploaded panels only if all successful
      if (failedUploads === 0) {
        console.log('All panels uploaded successfully, creating comic...');
      } else {
        console.log(`${failedUploads} panels failed, skipping comic creation. Please retry failed uploads.`);
      }
    } else {
      alert(`Upload thất bại!\nTất cả ${uploadedPanels.length} panels đều upload thất bại.\nVui lòng kiểm tra:\n1. Kích thước payload quá lớn\n2. Cấu hình server giới hạn\n3. Google Cloud Storage credentials`);
    }
    
  } catch (error) {
    console.error('Upload process error:', error);
    alert('Lỗi nghiêm trọng trong quá trình upload: ' + error.message);
    
    // Update result with error state
    setResult('upload', prev => ({
      ...prev,
      success: false,
      status: 'error',
      error: error.message,
      progress: 0
    }));
    
  } finally {
    setLoadingState('upload', false);
  }
};


// Enhanced compression function with size and dimension control
const compressBase64Image = (base64String, quality = 0.8, maxDimension = null) => {
  return new Promise((resolve) => {
    try {
      // Create image element
      const img = new Image();
      
      img.onload = function() {
        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Calculate new dimensions
        let { width, height } = img;
        const defaultMaxDimension = 2048;
        const targetMaxDimension = maxDimension || defaultMaxDimension;
        
        if (width > targetMaxDimension || height > targetMaxDimension) {
          const ratio = Math.min(targetMaxDimension / width, targetMaxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Set canvas size
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different formats based on quality
        let compressedBase64;
        if (quality < 0.6) {
          // Very low quality - use JPEG
          compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        } else {
          // Higher quality - use PNG with some compression
          compressedBase64 = canvas.toDataURL('image/png');
          // If PNG is still too large, convert to JPEG
          if (compressedBase64.length > base64String.length) {
            compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          }
        }
        
        // Remove data URL prefix
        const base64Data = compressedBase64.replace(/^data:image\/[a-z]+;base64,/, '');
        
        const originalSizeMB = (base64String.length / 1024 / 1024).toFixed(2);
        const compressedSizeMB = (base64Data.length / 1024 / 1024).toFixed(2);
        const reduction = Math.round((1 - base64Data.length/base64String.length) * 100);
        
        console.log(`Image compressed: ${originalSizeMB}MB -> ${compressedSizeMB}MB (${reduction}% reduction) [${width}x${height}]`);
        
        resolve(base64Data);
      };
      
      img.onerror = function() {
        console.warn('Failed to compress image, using original');
        resolve(null);
      };
      
      // Load image
      const imageUrl = base64String.startsWith('data:') ? base64String : `data:image/png;base64,${base64String}`;
      img.src = imageUrl;
      
    } catch (error) {
      console.warn('Compression error:', error);
      resolve(null);
    }
  });
};

  const togglePanel = (panelId) => {
    setExpandedPanels(prev => ({
      ...prev,
      [panelId]: !prev[panelId]
    }));
  };

  // Cập nhật function renderPanelDetails để hiển thị dialogue
const renderPanelDetails = (panel, showPrompts = false) => (
  <div key={panel.panel_id} className="border rounded-lg p-4 mb-4">
    <div className="flex justify-between items-start mb-3">
      <h6 className="font-semibold text-lg">Panel {panel.panel_id}</h6>
      <span className={`px-2 py-1 text-xs rounded ${
        panel.scene_type === 'dialogue' ? 'bg-blue-100 text-blue-800' :
        panel.scene_type === 'action' ? 'bg-red-100 text-red-800' :
        panel.scene_type === 'establishing' ? 'bg-green-100 text-green-800' :
        'bg-gray-100 text-gray-800'
      }`}>
        {panel.scene_type}
      </span>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <div>
          <strong className="text-sm text-gray-600">Setting:</strong>
          <p className="text-sm">{panel.setting}</p>
        </div>
        <div>
          <strong className="text-sm text-gray-600">Action:</strong>
          <p className="text-sm">{panel.action}</p>
        </div>
        <div>
          <strong className="text-sm text-gray-600">Characters:</strong>
          <p className="text-sm">{panel.characters?.join(', ') || 'None'}</p>
        </div>
        <div>
          <strong className="text-sm text-gray-600">Camera Angle:</strong>
          <p className="text-sm">{panel.camera_angle}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <div>
          <strong className="text-sm text-gray-600">Visual Description:</strong>
          <p className="text-sm">{panel.visual_description}</p>
        </div>
        
        {/* Hiển thị dialogue nếu có */}
        {panel.dialogue?.text && (
          <div>
            <strong className="text-sm text-gray-600">Dialogue:</strong>
            <div className="bg-blue-50 p-2 rounded mt-1">
              {panel.dialogue.speaker && (
                <span className="font-medium text-blue-700">{panel.dialogue.speaker}: </span>
              )}
              <span className="italic">"{panel.dialogue.text}"</span>
              <div className="text-xs text-gray-600 mt-1">
                Emotion: {panel.dialogue.emotion}
              </div>
            </div>
          </div>
        )}
        
        {/* Hiển thị image prompt nếu có */}
        {showPrompts && panel.image_generation?.prompt && (
          <div>
            <strong className="text-sm text-gray-600">Image Prompt:</strong>
            <p className="text-xs bg-gray-50 p-2 rounded mt-1">{panel.image_generation.prompt}</p>
            {panel.image_generation.character_descriptions?.length > 0 && (
              <div className="mt-1">
                <strong className="text-xs text-gray-600">Character Consistency:</strong>
                <div className="text-xs text-green-600">
                  {panel.image_generation.character_descriptions.length} character(s) with consistency applied
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);

  const tabs = [
    { id: 'load', label: 'Load Content', icon: Download },
    { id: 'analyze', label: 'Analyze', icon: BookOpen },
    { id: 'characters', label: 'Character Refs', icon: Users },
    { id: 'prompts', label: 'Create Prompts', icon: Eye },
    { id: 'images', label: 'Generate Images', icon: Zap },
    { id: 'dialogue', label: 'Add Dialogue', icon: MessageSquare },
    { id: 'upload', label: 'Upload to GCS', icon: Upload },
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        API Test
      </h1>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-3 font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Icon size={18} className="mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        
        {/* Load Content Tab */}
        {activeTab === 'load' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">1. Load Novel Content</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Filename:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={filename}
                      onChange={(e) => setFilename(e.target.value)}
                      placeholder="cothanky_chapter.json"
                      className="flex-1 px-3 py-2 border rounded-md"
                    />
                    <button
                      onClick={loadNovelContent}
                      disabled={loading.load}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                      {loading.load ? <Loader2 className="animate-spin mr-2" size={16} /> : <Play className="mr-2" size={16} />}
                      Load
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Sample files:</p>
                  <div className="flex gap-2 flex-wrap">
                    {sampleFiles.map(file => (
                      <button
                        key={file}
                        onClick={() => setFilename(file)}
                        className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                      >
                        {file}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {novelContent && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Loaded Content Preview:</h4>
                <div className="max-h-40 overflow-y-auto bg-white p-3 rounded border">
                  <pre className="text-sm whitespace-pre-wrap">{novelContent.substring(0, 500)}...</pre>
                </div>
                <p className="text-sm text-gray-600 mt-2">Total length: {novelContent.length} characters</p>
              </div>
            )}
          </div>
        )}

        {/* Analyze Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">2. Analyze Content into Panels</h3>
              
              <button
                onClick={analyzeContent}
                disabled={loading.analyze || !novelContent}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                {loading.analyze ? <Loader2 className="animate-spin mr-2" size={16} /> : <BookOpen className="mr-2" size={16} />}
                Analyze Content
              </button>
            </div>

            {results.analyze && (
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-4">Analysis Results</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-100 p-3 rounded">
                    <strong>Total Panels:</strong> {results.analyze.analysis.panels?.length || 0}
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <strong>Main Characters:</strong> {results.analyze.analysis.main_characters?.join(', ') || 'N/A'}
                  </div>
                  <div className="bg-gray-100 p-3 rounded col-span-2">
                    <strong>Chapter Summary:</strong> {results.analyze.analysis.chapter_summary || 'N/A'}
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold mb-3">Panels:</h5>
                  {results.analyze.analysis.panels?.map(panel => renderPanelDetails(panel))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Characters Tab */}
        {activeTab === 'characters' && (
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">2.5. Create Character References</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Tạo character references để đảm bảo tính nhất quán của nhân vật trong các panels.
                </p>
              </div>
              
              <button
                onClick={createCharacterReferences}
                disabled={loading.characters || !results.analyze}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                {loading.characters ? <Loader2 className="animate-spin mr-2" size={16} /> : <Users className="mr-2" size={16} />}
                Create Character References
              </button>
              
              {results.analyze && results.analyze.analysis.main_characters && (
                <div className="mb-4 space-y-3">
                  <h4 className="font-medium">Upload ảnh nhân vật (tùy chọn):</h4>
                  {results.analyze.analysis.main_characters.map(charName => (
                    <div key={charName} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium">{charName}</span>
                        {characterImages[charName] && (
                          <img 
                            src={characterImages[charName].preview} 
                            alt={charName}
                            className="w-10 h-10 rounded-full object-cover border"
                          />
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCharacterImageUpload(charName, e.target.files[0])}
                          className="hidden"
                          id={`upload-${charName}`}
                        />
                        <label
                          htmlFor={`upload-${charName}`}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded cursor-pointer hover:bg-blue-600 flex items-center"
                        >
                          {uploadingImages[charName] ? (
                            <Loader2 className="animate-spin mr-1" size={14} />
                          ) : (
                            <Upload className="mr-1" size={14} />
                          )}
                          {characterImages[charName] ? 'Thay ảnh' : 'Upload ảnh'}
                        </label>
                        
                        {characterImages[charName] && (
                          <button
                            onClick={() => setCharacterImages(prev => {
                              const newState = { ...prev };
                              delete newState[charName];
                              return newState;
                            })}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {results.characters && (
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-4">Character References Results</h4>
                
                <div className="mb-4 bg-gray-100 p-3 rounded">
                  <strong>Characters Created:</strong> {Object.keys(results.characters?.character_references || {}).length}
                </div>

                <div className="space-y-4">
                  {results.characters?.character_references && Object.entries(results.characters.character_references).map(([charName, charData]) => (
                    <div key={charName} className="border rounded-lg p-4 bg-gray-50">
                      <h5 className="font-semibold text-lg mb-3">{charName}</h5>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <strong>Physical Description:</strong>
                          <p className="text-sm text-gray-700 mt-1">
                            {charData.physical_description || charData.description || 'Chưa có thông tin'}
                          </p>
                        </div>
                        
                        <div>
                          <strong>Hair:</strong>
                          <p className="text-sm text-gray-700 mt-1">{charData.hair}</p>
                        </div>
                        
                        <div>
                          <strong>Eyes:</strong>
                          <p className="text-sm text-gray-700 mt-1">{charData.eyes}</p>
                        </div>
                        
                        <div>
                          <strong>Clothing:</strong>
                          <p className="text-sm text-gray-700 mt-1">{charData.clothing}</p>
                        </div>
                      </div>
                      
                      {charData.distinctive_features && (
                        <div className="mt-3">
                          <strong>Distinctive Features:</strong>
                          <p className="text-sm text-gray-700 mt-1">{charData.distinctive_features}</p>
                        </div>
                      )}
                      
                      {charData.personality_traits && (
                        <div className="mt-3">
                          <strong>Personality:</strong>
                          <p className="text-sm text-gray-700 mt-1">{charData.personality_traits}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create Prompts Tab */}
        {activeTab === 'prompts' && (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">3. Create Image Generation Prompts</h3>
              
              <button
                onClick={generateImagePrompts}
                disabled={loading.prompts || !results.analyze}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
              >
                {loading.prompts ? <Loader2 className="animate-spin mr-2" size={16} /> : <Eye className="mr-2" size={16} />}
                Create Image Prompts
              </button>
            </div>

            {results.prompts && (
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-4">Image Prompts Results</h4>
                
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-gray-100 p-3 rounded">
                    <strong>Total Panels:</strong> {results.prompts.total_panels}
                  </div>
                  <div className="bg-gray-100 p-3 rounded">
                    <strong>Ready for Generation:</strong> {results.prompts.ready_for_generation}
                  </div>
                  <div className={`p-3 rounded ${results.prompts.character_consistency_applied ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    <strong>Character Consistency:</strong> {results.prompts.character_consistency_applied ? 'Applied' : 'Not Applied'}
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold mb-3">Panels with Prompts:</h5>
                  {results.prompts.panels?.map(panel => renderPanelDetails(panel, true))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Generate Images Tab */}
        {activeTab === 'images' && (
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">4. Generate AI Images</h3>
              
              <div className="mb-4">
                {characterRefs ? (
                  <div className="bg-green-50 p-3 rounded flex items-center">
                    <Users size={16} className="text-green-600 mr-2" />
                    <span className="text-green-700">Character references available - images will have consistent character design</span>
                  </div>
                ) : (
                  <div className="bg-yellow-50 p-3 rounded flex items-center">
                    <Users size={16} className="text-yellow-600 mr-2" />
                    <span className="text-yellow-700">No character references - characters may appear inconsistent across panels</span>
                  </div>
                )}
              </div>

              <button
                onClick={generateActualImages}
                disabled={loading.images || (!results.prompts && !results.analyze)}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center"
              >
                {loading.images ? <Loader2 className="animate-spin mr-2" size={16} /> : <Zap className="mr-2" size={16} />}
                {loading.images ? 'Generating Images...' : 'Generate AI Images'}
              </button>
            </div>

            {results.images && (
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-4">AI Image Generation Results</h4>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-100 p-3 rounded">
                    <strong>Total Panels:</strong> {results.images.total_panels}
                  </div>
                  <div className="bg-green-100 p-3 rounded">
                    <strong>Successfully Generated:</strong> {results.images.successful_generations}
                  </div>
                  <div className="bg-red-100 p-3 rounded">
                    <strong>Failed:</strong> {results.images.total_panels - results.images.successful_generations}
                  </div>
                </div>

                <div>
                  <h5 className="font-semibold mb-3">Generated Images:</h5>
                  {results.images.panels?.map(panel => renderPanelDetails(panel, true, true))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Dialogue Tab */}
        {activeTab === 'dialogue' && (
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">5. Add Dialogue to Images</h3>
              
              <div className="mb-4">
                <div className="bg-white border rounded-lg p-3 mb-3">
                  <h4 className="font-medium mb-2">Status:</h4>
                  {!results.images ? (
                    <p className="text-amber-600">⚠️ Cần sinh hình ảnh trước</p>
                  ) : !results.images.panels?.some(p => p.dialogue?.text) ? (
                    <p className="text-amber-600">⚠️ Không có panel nào có lời thoại</p>
                  ) : results.images.dialogue_added ? (
                    <p className="text-green-600">✅ Đã thêm lời thoại thành công</p>
                  ) : (
                    <p className="text-blue-600">🔄 Ready to add dialogue</p>
                  )}
                  
                  {results.images?.panels && (
                    <div className="mt-2 text-sm text-gray-600">
                      <span>Panels có lời thoại: {results.images.panels.filter(p => p.dialogue?.text).length}/{results.images.panels.length}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={addDialogueToImages}
                disabled={dialogueProcessing || !results.images || results.images.dialogue_added}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                {dialogueProcessing ? <Loader2 className="animate-spin mr-2" size={16} /> : <MessageSquare className="mr-2" size={16} />}
                {results.images?.dialogue_added ? 'Dialogue Added' : 'Add Dialogue to Images'}
              </button>
              
              <p className="text-sm text-gray-600 mt-2">
                Thêm speech bubbles và lời thoại vào các panels đã sinh hình ảnh
              </p>
            </div>

            {results.images?.panels && (
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-4">Dialogue Processing Results</h4>
                
                {results.images.dialogue_added && (
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-100 p-3 rounded">
                      <strong>Total Panels:</strong> {results.images.total_panels}
                    </div>
                    <div className="bg-gray-100 p-3 rounded">
                      <strong>With Dialogue:</strong> {results.images.panels.filter(p => p.dialogue?.text).length}
                    </div>
                    <div className="bg-green-100 p-3 rounded">
                      <strong>Dialogue Added:</strong> {results.images.dialogue_success_count || 0}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h5 className="font-semibold mb-3">Panels with Dialogue:</h5>
                  {results.images.panels
                    ?.filter(panel => panel.dialogue?.text)
                    .map(panel => (
                      <div key={panel.panel_id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h6 className="font-semibold">Panel {panel.panel_id} - {panel.scene_type}</h6>
                          {panel.dialogue_added ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              ✓ Dialogue Added
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              Pending
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="mb-3">
                              <strong className="text-sm text-gray-600">Setting:</strong>
                              <p className="text-sm">{panel.setting}</p>
                            </div>
                            
                            <div className="mb-3">
                              <strong className="text-sm text-gray-600">Dialogue:</strong>
                              <div className="bg-blue-50 p-2 rounded mt-1">
                                {panel.dialogue.speaker && (
                                  <span className="font-medium text-blue-700">{panel.dialogue.speaker}: </span>
                                )}
                                <span className="italic">"{panel.dialogue.text}"</span>
                                <div className="text-xs text-gray-600 mt-1">
                                  Emotion: {panel.dialogue.emotion}
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-500">
                              <strong>Characters:</strong> {panel.characters?.join(', ') || 'None'}
                            </div>
                          </div>
                          
                          <div>
                            {panel.image_generation?.image_data ? (
                              <div className="relative">
                                <img 
                                  src={panel.image_generation.image_data} 
                                  alt={`Panel ${panel.panel_id}`}
                                  className="w-full max-w-xs rounded border"
                                />
                                {panel.dialogue_added && (
                                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                                    With Dialogue
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full max-w-xs h-32 bg-gray-100 rounded border flex items-center justify-center">
                                <span className="text-gray-500 text-sm">No Image</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upload to GCS Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">6. Upload Images to Google Cloud Storage</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Story Name:</label>
                    <input
                      type="text"
                      value={storyName}
                      onChange={(e) => setStoryName(e.target.value)}
                      placeholder="e.g., Co Than Ky"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Chapter Number:</label>
                    <input
                      type="number"
                      value={chapterNumber}
                      onChange={(e) => setChapterNumber(parseInt(e.target.value) || 1)}
                      min="1"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
                
                <button
                  onClick={uploadToGCS}
                  disabled={loading.upload || !results.images || !storyName.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                >
                  {loading.upload ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload className="mr-2" size={16} />}
                  {loading.upload ? 'Uploading to GCS...' : 'Upload to Google Cloud Storage'}
                </button>
                
                {!results.images && (
                  <p className="text-sm text-gray-500">⚠️ Please generate images first</p>
                )}
                {!storyName.trim() && (
                  <p className="text-sm text-gray-500">⚠️ Please enter story name</p>
                )}
              </div>
            </div>

            {results.upload && (
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-semibold text-lg mb-4">GCS Upload Results</h4>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-100 p-3 rounded">
                    <strong>Total Panels:</strong> {results.upload.total_panels}
                  </div>
                  <div className="bg-green-100 p-3 rounded">
                    <strong>Successfully Uploaded:</strong> {results.upload.successful_uploads}
                  </div>
                  <div className="bg-red-100 p-3 rounded">
                    <strong>Failed:</strong> {results.upload.total_panels - results.upload.successful_uploads}
                  </div>
                </div>

                {results.upload.gcs_folder && (
                  <div className="bg-blue-50 p-3 rounded mb-4">
                    <strong>GCS Folder:</strong> {results.upload.gcs_folder}
                  </div>
                )}

                <div>
                  <h5 className="font-semibold mb-3">Uploaded Images:</h5>
                  {results.upload.panels?.map(panel => (
                    <div key={panel.panel_id} className="border rounded-lg p-4 mb-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">Panel {panel.panel_id}</h4>
                        <span className={`px-2 py-1 rounded text-xs ${
                          panel.gcs_upload?.success 
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {panel.gcs_upload?.success ? 'Uploaded' : 'Failed'}
                        </span>
                      </div>
                      
                      {panel.gcs_upload?.success && (
                        <div className="space-y-2">
                          <div><strong>GCS URL:</strong> 
                            <a 
                              href={panel.gcs_upload.public_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline ml-2 text-sm break-all"
                            >
                              {panel.gcs_upload.public_url}
                            </a>
                          </div>
                          <div><strong>File Name:</strong> {panel.gcs_upload.filename}</div>
                          
                          {/* Preview uploaded image */}
                          <div className="mt-2">
                            <img 
                              src={panel.gcs_upload.public_url} 
                              alt={`Panel ${panel.panel_id} - GCS`}
                              className="max-w-full h-auto rounded border"
                              style={{ maxHeight: '300px' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {panel.gcs_upload?.error && (
                        <div className="bg-red-50 p-2 rounded text-red-700">
                          <strong>Upload Error:</strong> {panel.gcs_upload.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Debug Panel */}
      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Debug Info</h3>
        <div className="text-sm text-gray-600">
          <p>API Base URL: {API_BASE_URL}</p>
          <p>Active Tab: {activeTab}</p>
          <p>Novel Content Length: {novelContent.length} chars</p>
          <p>Results Keys: {Object.keys(results).join(', ')}</p>
          <p>Loading States: {Object.entries(loading).filter(([k,v]) => v).map(([k]) => k).join(', ') || 'None'}</p>
        </div>
      </div>
    </div>
  );
};

export default NovelToComicTester;