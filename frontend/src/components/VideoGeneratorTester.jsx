import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000'; 

const VideoGeneratorTester = ({ 
  files, 
  analysisResults, 
  videoData, 
  setVideoData, 
  updateAnalysisResult, 
  sceneData, 
  setSceneData,
  finalVideos, 
  setFinalVideos }) => {
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [error, setError] = useState('');

  const [loadingFinal, setLoadingFinal] = useState(false);
  
  // 1. LOGIC CHUẨN HÓA TEXT (Giữ nguyên)
  const getProcessedTextData = () => {
    return analysisResults
      .map(result => {
        const panelSource = result.editedDetectionData || result.detectionData;
        const textSource = result.editedTextData || result.textData;
        if (!panelSource || !panelSource.panels) {
          return null;
        }
        const upToDatePanels = panelSource.panels.map(panel => {
          const existingTextPanel = textSource?.panels.find(p => p.id === panel.id);
          return {
            ...panel,
            textContent: existingTextPanel?.textContent || ""
          };
        });
        return {
          ...(panelSource || textSource),
          fileName: panelSource.fileName,
          panels: upToDatePanels,
          panelCount: upToDatePanels.length
        };
      })
      .filter(Boolean);
  };

  const processedTextResults = getProcessedTextData();
  
  // Check điều kiện
  const isReadyForAudio = files.length > 0 && analysisResults.some(r => r.detectionData);
  
  // Sẵn sàng tạo Video AI: Cần có ảnh Inpaint (hoặc ảnh Crop gốc nếu chưa inpaint)
  const isReadyForAI = analysisResults.length > 0 && analysisResults.every(r => r.cropData);

  // Sẵn sàng ghép Scene: Cần Audio VÀ (Video AI HOẶC Ảnh Crop)
  const isReadyForScenes = videoData.length > 0 && isReadyForAI;

  // Kiểm tra xem có dữ liệu Inpainting không để hiển thị thông báo
  const hasInpaintedData = analysisResults.some(r => r.inpaintedData);

  // 3. HÀM TẠO AUDIO (Giữ nguyên)
  const handleGenerateAudio = async () => {
    if (!isReadyForAudio) {
      setError('Vui lòng chạy "Bước 1: Phát hiện Panel" trước.');
      return;
    }
    
    setLoadingAudio(true);
    setError('');
    setSceneData([]); 
    setFinalVideos([]);

    try {
      const payload = {
        textDataResults: processedTextResults 
      };
      const endpoint = `${API_BASE_URL}/api/comic/video/generate-audio`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi từ server');
      console.log('[FE] Đã nhận dữ liệu Audio từ Backend:', data.data);
      setVideoData(data.data);  
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAudio(false);
    }
  };

  // === HÀM MỚI: GỌI API SVD ===
  const handleGenerateAIVideo = async () => {
    if (!isReadyForAI) return;
    setLoadingAI(true);
    setError('');

    try {
        // Chuẩn bị payload: Gửi đầy đủ dữ liệu để Backend tự chọn
        const filesData = analysisResults
            .filter(r => r.cropData && r.cropData.success !== false)
            .map(result => {
                const originalPanels = result.cropData.panels;
                const inpaintedPanels = result.inpaintedData?.panels || [];
                
                // Tìm thông tin Audio để lấy duration
                const fileAudioData = videoData.find(v => v.fileName === result.fileName);

                const panelsPayload = originalPanels.map(p => {
                    // Tìm ảnh đã xóa bong bóng tương ứng
                    const cleanPanel = inpaintedPanels.find(ip => ip.panelId === p.id && ip.success);
                    
                    // Tìm duration
                    let duration = 2.0;
                    if (fileAudioData) {
                        const panelAudio = fileAudioData.panels.find(a => a.panelId === p.id);
                        if (panelAudio && panelAudio.duration) {
                            duration = panelAudio.duration;
                        }
                    }

                    return {
                        panelId: p.id,
                        
                        // --- [QUAN TRỌNG] GỬI CẢ 2 LOẠI ẢNH ---
                        
                        // 1. Ảnh gốc sắc nét (Dành cho Gemini phân tích nét vẽ/hành động)
                        croppedImageBase64: p.croppedImageBase64,
                        
                        // 2. Ảnh đã xóa chữ (Dành cho Kaggle sinh video để không bị méo chữ)
                        // Nếu không có ảnh inpaint thì gửi null hoặc gửi ảnh gốc
                        inpaintedImageB64: cleanPanel ? cleanPanel.inpaintedImageB64 : null,
                        
                        // 3. Ảnh mặc định (Fallback) - Ưu tiên ảnh sạch
                        imageB64: cleanPanel ? cleanPanel.inpaintedImageB64 : p.croppedImageBase64,
                        
                        // 4. Thời lượng audio
                        duration: duration
                    };
                });

                return {
                    fileName: result.fileName,
                    panels: panelsPayload
                };
            });

        // Gọi API Backend
        const res = await fetch(`${API_BASE_URL}/api/comic/video/generate-ai-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filesData }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi sinh video');

        // Cập nhật kết quả vào state
        data.data.forEach(fileResult => {
            updateAnalysisResult(fileResult.fileName, 'aiVideoData', fileResult);
        });
        
        alert("Đã sinh video AI xong! Giờ bạn có thể ghép Scene.");

    } catch (err) {
        console.error(err);
        setError(err.message);
    } finally {
        setLoadingAI(false);
    }
  };

  // ===================================
  // 4. HÀM MỚI: TẠO SCENES (ĐÃ NÂNG CẤP LOGIC ƯU TIÊN INPAINTING)
  // ===================================
  // === CẬP NHẬT HÀM GHÉP SCENE ===
  const handleGenerateScenes = async () => {
    if (!isReadyForScenes) return;
    setLoadingScenes(true);
    setError('');

    try {
        // 1. CHUẨN BỊ PAYLOAD: KẾT HỢP CROP DATA VÀ VIDEO AI
        const mergedCropData = analysisResults.map(result => {
            const baseCropData = result.cropData;
            
            // Tìm kết quả video AI tương ứng
            const aiData = analysisResults.find(r => r.fileName === result.fileName)?.aiVideoData;

            // Map qua từng panel để nhét video source vào
            const newPanels = baseCropData.panels.map(p => {
                let videoSource = null;

                // Nếu có video AI thì lấy video AI
                if (aiData) {
                    const aiPanel = aiData.panels.find(ap => ap.panelId === p.id);
                    if (aiPanel && aiPanel.success && aiPanel.videoBase64) {
                        videoSource = aiPanel.videoBase64;
                    }
                }

                return {
                    ...p,
                    // TRUYỀN VIDEO 2s XUỐNG ĐỂ BACKEND NỐI DÀI
                    videoSourceBase64: videoSource, 
                    // Cờ đánh dấu để Backend biết đây là video
                    isVideo: !!videoSource 
                };
            });

            return { ...baseCropData, panels: newPanels };
        });

        // 2. GỌI API GENERATE SCENES
        const payload = {
            videoData: videoData, // Chứa thông tin duration audio
            cropData: mergedCropData // Chứa source ảnh/video 2s
        };

        const res = await fetch(`${API_BASE_URL}/api/comic/video/generate-scenes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi tạo scene');

        console.log('[FE] Scene Data:', data.data);
        setSceneData(data.data); // <--- ĐÂY MỚI LÀ VIDEO 7 GIÂY
        
    } catch (err) {
        console.error(err);
        setError(err.message);
    } finally {
        setLoadingScenes(false);
    }
  };

  // --- HÀM BƯỚC 6.4 ---
  const handleGenerateFinal = async () => {
    if (sceneData.length === 0) return;
    setLoadingFinal(true);
    
    try {
        const payload = {
            sceneData: sceneData, // Kết quả bước 6.3 (Video câm)
            videoData: videoData  // Kết quả bước 6.1 (Audio)
        };

        const res = await fetch(`${API_BASE_URL}/api/comic/video/generate-final`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        setFinalVideos(data.data);
        alert("Video đã hoàn thành.");

    } catch (err) {
        setError(err.message);
    } finally {
        setLoadingFinal(false);
    }
  };

  return (
    <div className="pt-6 bg-slate-900 min-h-screen text-gray-200">
      <h2 className="text-xl font-bold mb-4 text-blue-400 pt-6">6. Tạo Video</h2>
      
      {/* --- Bước 6.1: Tạo Audio --- */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-3">Bước 6.1: Tạo Âm thanh (TTS)</h3>
        
        {!isReadyForAudio && files.length > 0 && (
          <p className="text-yellow-400 mb-4">Vui lòng chạy "Bước 1" trước.</p>
        )}
        {isReadyForAudio && (
            <p className="text-green-400 mb-4">
              Sẵn sàng tạo audio cho {processedTextResults.length} file (sử dụng panel mới nhất và text đã edit).
            </p>
        )}
        
        <button 
          type="button" 
          onClick={handleGenerateAudio}
          disabled={loadingAudio || loadingScenes || !isReadyForAudio} 
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loadingAudio ? 'Đang tạo audio...' : `Tạo Audio cho ${processedTextResults.length} file`}
        </button>
      </div>

      {/* --- Hiển thị kết quả Audio --- */}
      {videoData.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">Kết quả Audio (Bước 6.1)</h3>
          <div className="space-y-4">
            {videoData.map((file) => (
              <div key={file.fileName} className="bg-slate-700 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2">{file.fileName}</h4>
                <div className="space-y-2">
                  {file.panels.map((panel) => (
                      <div key={panel.panelId} className="flex items-center justify-between p-2 bg-slate-600 rounded">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">Panel {panel.id}</div>
                          <div className="text-xs text-gray-300 italic truncate" title={panel.textContent}>
                            {panel.textContent || "(Panel không chứa text)"}
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-4">
                          {panel.audioUrl ? (
                            <audio controls src={panel.audioUrl} className="h-8" />
                          ) : (
                            <div className="text-sm text-gray-400">({panel.duration}s)</div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BƯỚC 6.2: AI MOTION (SVD) - MỚI */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-3">Bước 6.2: Tạo Chuyển Động (SVD AI)</h3>
        <p className="text-gray-400 text-sm mb-4">
            Sinh video AI.
        </p>
        <button 
          onClick={handleGenerateAIVideo}
          disabled={loadingAI || !isReadyForAI}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loadingAI ? 'Đang tạo video ' : 'Sinh Video AI (SVD)'}
        </button>
        
        {/* Hiển thị kết quả video AI */}
        <div className="mt-4 grid grid-cols-2 gap-4">
            {analysisResults.map(r => r.aiVideoData?.panels.map(p => (
                p.success && (
                    <div key={`${r.fileName}-${p.panelId}`} className="bg-slate-900 p-2 rounded">
                        <div className="text-xs text-gray-400 mb-1">{r.fileName} - P{p.panelId}</div>
                        <video controls autoPlay loop className="w-full rounded">
                            <source src={`data:video/mp4;base64,${p.videoBase64}`} type="video/mp4" />
                        </video>
                    </div>
                )
            )))}
        </div>
      </div>

      {/* Thông báo lỗi chung */}
      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 p-3 rounded">{error}</div>
      )}

      

      {/* THÊM NÚT NÀY VÀO DƯỚI NÚT "SINH VIDEO AI" */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">Bước 6.3: Ghép Scene (Final)</h3>
          <p className="text-gray-400 text-sm mb-4">
            Ghép scene bằng hiệu ứng Boomerang.
          </p>
          
          <button 
            onClick={handleGenerateScenes}
            disabled={loadingScenes || !isReadyForScenes}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            {loadingScenes ? 'Đang xử lý FFmpeg...' : 'Ghép Scene & Nối dài Video'}
          </button>
      </div>

      {/* HIỂN THỊ KẾT QUẢ CUỐI CÙNG (SCENE DATA) */}
      {sceneData.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mt-6">
          <h3 className="text-lg font-semibold text-orange-400 mb-4">Kết quả Scene Hoàn Chỉnh</h3>
          <div className="space-y-4">
            {sceneData.map((file) => (
              <div key={file.fileName} className="bg-slate-700 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2">{file.fileName}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {file.panels.map((panel) => (
                    <div key={panel.panelId} className="bg-slate-900 p-2 rounded">
                      <p className="text-sm font-medium mb-1">Panel {panel.panelId}</p>
                      
                      {/* VIDEO FINAL (7s) */}
                      <video
                        controls
                        src={panel.videoUrl} 
                        className="w-full rounded border border-orange-500/30"
                      />
                      
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Duration: {panel.duration}s</span>
                        <span className="text-orange-400">Final Scene</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PHẦN UI CHO BƯỚC 6.4 (CUỐI CÙNG) --- */}
      {sceneData.length > 0 && (
        <div className="mt-8 border-t-2 border-orange-600 pt-8">
            <h3 className="text-2xl font-bold text-orange-500 mb-4 text-center">BƯỚC 6.4: XUẤT BẢN VIDEO HOÀN CHỈNH</h3>
            
            <div className="flex justify-center mb-6">
                <button 
                    onClick={handleGenerateFinal}
                    disabled={loadingFinal}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-full text-lg shadow-lg disabled:bg-gray-600 transition-all transform hover:scale-105"
                >
                    {loadingFinal ? 'Đang dựng...' : 'VIDEO FULL'}
                </button>
            </div>

            {/* HIỂN THỊ VIDEO FINAL */}
            {finalVideos.length > 0 && (
                <div className="grid grid-cols-1 gap-8">
                    {finalVideos.map((video, idx) => (
                        <div key={idx} className="bg-slate-800 border-2 border-orange-500 rounded-xl p-6 shadow-2xl">
                            <h4 className="text-xl font-bold text-white mb-4 text-center">{video.fileName} - FINAL CUT</h4>
                            
                            {video.error ? (
                                <div className="text-red-400 text-center">Lỗi: {video.error}</div>
                            ) : (
                                <div className="aspect-video w-full bg-black rounded-lg overflow-hidden">
                                    <video controls className="w-full h-full" src={video.finalUrl} />
                                </div>
                            )}
                            
                            <div className="mt-4 text-center">
                                <a href={video.finalUrl} download className="text-blue-400 hover:text-blue-300 underline">
                                    Tải video về máy
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default VideoGeneratorTester;