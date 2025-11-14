// File: src/components/VideoGeneratorTester.jsx
// TRẠNG THÁI: ĐÃ THÊM BƯỚC 6.2 (TẠO CẢNH QUAY)

import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000'; 

const VideoGeneratorTester = ({ files, analysisResults, videoData, setVideoData }) => {
  // 1. TÁCH STATE LOADING
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [loadingScenes, setLoadingScenes] = useState(false);
  const [error, setError] = useState('');
  // STATE MỚI ĐỂ LƯU KẾT QUẢ VIDEO
  const [sceneData, setSceneData] = useState([]);

  // 1. LOGIC CHUẨN HÓA (Giữ nguyên code của bạn)
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
  
  // 2. CHECK SẴN SÀNG (Đã cập nhật)
  // Sẵn sàng cho Audio (Bước 6.1)
  const isReadyForAudio = files.length > 0 && 
                        analysisResults.some(r => r.detectionData); // Chỉ cần có Bước 1

  // Sẵn sàng cho Scene (Bước 6.2)
  const isReadyForScenes = videoData.length > 0 && // Phải có audio (duration)
                           analysisResults.length > 0 && // Phải có file
                           analysisResults.every(r => r.cropData); // Phải chạy xong Bước 3 (ảnh)

  // 3. HÀM TẠO AUDIO (Đã cập nhật)
  const handleGenerateAudio = async () => {
    if (!isReadyForAudio) {
      setError('Vui lòng chạy "Bước 1: Phát hiện Panel" trước.');
      return;
    }
    
    setLoadingAudio(true); // Cập nhật state
    setError('');
    setSceneData([]); // Reset video cũ nếu tạo lại audio

    try {
      const payload = {
        textDataResults: processedTextResults 
      };
      const endpoint = `${API_BASE_URL}/api/comic/video/generate-audio`;
      // ... (fetch, .json(), ... giữ nguyên) ...
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
      setLoadingAudio(false); // Cập nhật state
    }
  };

  // ===================================
  // 4. HÀM MỚI: TẠO SCENES (BƯỚC 6.2)
  // ===================================
  const handleGenerateScenes = async () => {
    if (!isReadyForScenes) {
        setError('Vui lòng chạy "Bước 3: Panel Cropper" VÀ "Bước 6.1: Tạo Audio" trước.');
        return;
    }
    
    setLoadingScenes(true);
    setError('');

    try {
        // Lấy data ảnh (từ Bước 3)
        const cropData = analysisResults
            .map(r => r.cropData)
            .filter(r => r && r.success !== false);

        // Gửi cả 2: data audio (duration) và data crop (ảnh)
        const payload = {
            videoData: videoData,
            cropData: cropData 
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

  // 5. PHẦN RENDER (Đã cập nhật)
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
          disabled={loadingAudio || loadingScenes || !isReadyForAudio} // Cập nhật disabled
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loadingAudio ? 'Đang tạo audio...' : `Tạo Audio cho ${processedTextResults.length} file`}
        </button>
      </div>

      {/* --- THÊM MỚI: Bước 6.2: Tạo Scene Video --- */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-3">Bước 6.2: Tạo Cảnh Quay Video</h3>
        
        {!isReadyForScenes && files.length > 0 && (
          <p className="text-yellow-400 mb-4">
            Vui lòng chạy "Bước 3: Panel Cropper" VÀ "Bước 6.1: Tạo Audio" trước.
          </p>
        )}
        {isReadyForScenes && (
            <p className="text-green-400 mb-4">
              {/* Tính tổng số panel */}
              Sẵn sàng tạo {videoData.reduce((acc, f) => acc + f.panels.length, 0)} cảnh quay video.
            </p>
        )}
        
        <button 
          type="button" 
          onClick={handleGenerateScenes}
          disabled={loadingAudio || loadingScenes || !isReadyForScenes} // Cập nhật disabled
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loadingScenes ? 'Đang tạo cảnh quay (FFmpeg)...' : `Tạo Cảnh Quay Video`}
        </button>
      </div>

      {/* Thông báo lỗi chung */}
      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 p-3 rounded">{error}</div>
      )}

      {/* --- Hiển thị kết quả Audio (Giữ nguyên) --- */}
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

      {/* --- THÊM MỚI: Hiển thị kết quả Scene (Bước 6.2) --- */}
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
                        preload="metadata" // Tải metadata để hiển thị thumbnail (nếu có)
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