import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000'; 

const VideoGeneratorTester = ({ files, analysisResults, videoData, setVideoData }) => {
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [error, setError] = useState('');
  const [sceneData, setSceneData] = useState([]);

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
  
  // 2. CHECK SẴN SÀNG
  const isReadyForAudio = files.length > 0 && 
                        analysisResults.some(r => r.detectionData);

  const isReadyForScenes = videoData.length > 0 && 
                           analysisResults.length > 0 && 
                           analysisResults.every(r => r.cropData);

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

  // ===================================
  // 4. HÀM MỚI: TẠO SCENES (ĐÃ NÂNG CẤP LOGIC ƯU TIÊN INPAINTING)
  // ===================================
  const handleGenerateScenes = async () => {
    if (!isReadyForScenes) {
        setError('Vui lòng chạy "Bước 3: Panel Cropper" VÀ "Bước 6.1: Tạo Audio" trước.');
        return;
    }
    
    setLoadingScenes(true);
    setError('');

    try {
        // === LOGIC MỚI: Ưu tiên ảnh Inpainting nếu có ===
        const mergedCropData = analysisResults
            .filter(r => r.cropData && r.cropData.success !== false)
            .map(result => {
                const originalCropData = result.cropData;
                const inpaintedData = result.inpaintedData; // Lấy dữ liệu từ bước 4.5

                // Nếu không có inpainting, dùng ảnh gốc
                if (!inpaintedData || !inpaintedData.panels) {
                    return originalCropData;
                }

                console.log(`[FE] Đang trộn dữ liệu Inpainting cho file: ${result.fileName}`);

                // Nếu có, thay thế ảnh gốc bằng ảnh sạch
                const newPanels = originalCropData.panels.map(originalPanel => {
                    // Tìm panel tương ứng trong dữ liệu inpainting (lưu ý: panelId vs id)
                    const cleanPanel = inpaintedData.panels.find(p => p.panelId === originalPanel.id);

                    if (cleanPanel && cleanPanel.success && cleanPanel.inpaintedImageB64) {
                        return {
                            ...originalPanel,
                            // QUAN TRỌNG: Ghi đè ảnh gốc bằng ảnh đã xóa bong bóng
                            croppedImageBase64: cleanPanel.inpaintedImageB64 
                        };
                    }
                    return originalPanel;
                });

                return {
                    ...originalCropData,
                    panels: newPanels
                };
            });

        // Gửi payload đã được merge
        const payload = {
            videoData: videoData,
            cropData: mergedCropData 
        };

        const endpoint = `${API_BASE_URL}/api/comic/video/generate-scenes`;
        
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi từ server');

        console.log('[FE] Đã nhận dữ liệu Scenes:', data.data);
        setSceneData(data.data);
        
    } catch (err) {
        setError(err.message);
    } finally {
        setLoadingScenes(false);
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

      {/* --- Bước 6.2: Tạo Scene Video --- */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-3">Bước 6.2: Tạo Cảnh Quay Video</h3>
        
        {!isReadyForScenes && files.length > 0 && (
          <p className="text-yellow-400 mb-4">
            Vui lòng chạy "Bước 3: Panel Cropper" VÀ "Bước 6.1: Tạo Audio" trước.
          </p>
        )}
        
        {isReadyForScenes && (
            <div className="mb-4">
                <p className="text-green-400">
                  Sẵn sàng tạo {videoData.reduce((acc, f) => acc + f.panels.length, 0)} cảnh quay video.
                </p>
                {/* Hiển thị trạng thái nguồn ảnh */}
                <div className="mt-2 text-sm p-2 rounded bg-slate-700 inline-block border border-slate-600">
                    <span className="text-gray-300 font-medium mr-2">Nguồn ảnh:</span>
                    {hasInpaintedData ? (
                        <span className="text-green-400 font-bold flex items-center gap-1">
                             ✓ Ảnh đã xóa bong bóng (Từ Bước 4.5)
                        </span>
                    ) : (
                        <span className="text-yellow-400 font-bold flex items-center gap-1">
                             ⚠ Ảnh gốc có bong bóng (Chưa chạy Bước 4.5)
                        </span>
                    )}
                </div>
            </div>
        )}
        
        <button 
          type="button" 
          onClick={handleGenerateScenes}
          disabled={loadingAudio || loadingScenes || !isReadyForScenes} 
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loadingScenes ? 'Đang tạo cảnh quay (FFmpeg)...' : `Tạo Cảnh Quay Video`}
        </button>
      </div>

      {/* Thông báo lỗi chung */}
      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 p-3 rounded">{error}</div>
      )}

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

      {/* --- Hiển thị kết quả Scene --- */}
      {sceneData.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">Kết quả Cảnh Quay (Bước 6.2)</h3>
          <div className="space-y-4">
            {sceneData.map((file) => (
              <div key={file.fileName} className="bg-slate-700 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2">{file.fileName}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {file.panels.map((panel) => (
                    <div key={panel.panelId} className="bg-slate-600 p-2 rounded">
                      <p className="text-sm font-medium mb-2">Panel {panel.panelId}</p>
                      <video
                        controls
                        src={panel.videoUrl}
                        className="w-full rounded"
                        preload="metadata"
                      >
                        Video clip không được hỗ trợ.
                      </video>
                      <p className="text-xs text-gray-400 mt-1 text-center">({panel.duration}s)</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoGeneratorTester;