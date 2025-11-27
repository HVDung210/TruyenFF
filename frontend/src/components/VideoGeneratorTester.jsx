import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000'; 

const VideoGeneratorTester = ({ files, analysisResults, videoData, setVideoData, updateAnalysisResult }) => {
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
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
        // Chuẩn bị payload
        const filesData = analysisResults
            .filter(r => r.cropData && r.cropData.success !== false)
            .map(result => {
                const originalPanels = result.cropData.panels;
                const inpaintedPanels = result.inpaintedData?.panels || [];
                
                // 1. Tìm thông tin Audio của file này
                const fileAudioData = videoData.find(v => v.fileName === result.fileName);

                const panelsPayload = originalPanels.map(p => {
                    // Tìm ảnh đã xóa bong bóng (nếu có)
                    const cleanPanel = inpaintedPanels.find(ip => ip.panelId === p.id && ip.success);
                    
                    // 2. Lấy duration (Mặc định 2s nếu không có audio)
                    let duration = 2.0;
                    if (fileAudioData) {
                        const panelAudio = fileAudioData.panels.find(a => a.panelId === p.id);
                        if (panelAudio && panelAudio.duration) {
                            duration = panelAudio.duration;
                        }
                    }

                    return {
                        panelId: p.id,
                        // Ưu tiên dùng ảnh sạch (Inpainted), nếu không thì dùng ảnh gốc
                        imageB64: cleanPanel ? cleanPanel.inpaintedImageB64 : p.croppedImageBase64,
                        duration: duration // <--- GỬI KÈM DURATION
                    };
                });

                return {
                    fileName: result.fileName,
                    panels: panelsPayload
                };
            });

        const res = await fetch(`${API_BASE_URL}/api/comic/video/generate-ai-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filesData }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Lỗi sinh video');

        data.data.forEach(fileResult => {
            updateAnalysisResult(fileResult.fileName, 'aiVideoData', fileResult);
        });
        
        alert("Đã sinh video AI xong! Giờ bạn có thể ghép Scene.");

    } catch (err) {
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
        // Logic Merge: Lấy Video AI (nếu có) đè lên ảnh Crop
        const mergedCropData = analysisResults.map(result => {
            const baseCropData = result.cropData;
            const aiData = result.aiVideoData; // Dữ liệu video SVD vừa tạo

            if (!aiData) return baseCropData; // Không có video thì dùng ảnh tĩnh

            const newPanels = baseCropData.panels.map(p => {
                const aiPanel = aiData.panels.find(ap => ap.panelId === p.id);
                if (aiPanel && aiPanel.success && aiPanel.videoBase64) {
                    return {
                        ...p,
                        // TRICK: Backend Scene Generator cần sửa để nhận videoBase64
                        // Hoặc ta giả vờ đây là ảnh nhưng định dạng là video (cần backend hỗ trợ)
                        // Ở đây tạm thời gán vào một trường mới để backend xử lý
                        videoSourceBase64: aiPanel.videoBase64, 
                        isVideo: true
                    };
                }
                return p;
            });

            return { ...baseCropData, panels: newPanels };
        });

        // ... (Phần fetch API generate-scenes giữ nguyên, nhưng Backend cần update để xử lý videoSourceBase64)
        // Tạm thời để đơn giản: Bạn cứ chạy SVD để xem kết quả video raw trước đã.
        // Việc ghép vào FFmpeg sẽ làm ở bước sau.
        
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

      {/* BƯỚC 6.2: AI MOTION (SVD) - MỚI */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-3">Bước 6.2: Tạo Chuyển Động (SVD AI)</h3>
        <p className="text-gray-400 text-sm mb-4">
            Biến ảnh tĩnh thành video động (3-4s). Yêu cầu GPU mạnh.
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