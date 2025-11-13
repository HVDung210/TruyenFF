// File: src/components/VideoGeneratorTester.jsx
// TRẠNG THÁI: ĐÃ SỬA LẠI (SỬ DỤNG LOGIC KẾT HỢP STATE)

import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000'; 

const VideoGeneratorTester = ({ files, analysisResults, videoData, setVideoData }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1. LOGIC CHUẨN HÓA (Đã sửa lại)
  const getProcessedTextData = () => {
    return analysisResults
      .map(result => {
        // === LOGIC MỚI: KẾT HỢP DATA ===

        // 1. Lấy "Sự thật" về Panel (từ Bước 2 hoặc 1)
        const panelSource = result.editedDetectionData || result.detectionData;
        
        // 2. Lấy "Sự thật" về Text (từ Bước 5 hoặc 4)
        const textSource = result.editedTextData || result.textData;

        // 3. Nếu không có panel, bỏ qua file này
        if (!panelSource || !panelSource.panels) {
          return null;
        }

        // 4. Tạo danh sách panel mới nhất để gửi đi
        const upToDatePanels = panelSource.panels.map(panel => {
          const existingTextPanel = textSource?.panels.find(p => p.id === panel.id);
          return {
            ...panel, // Lấy {id, x, y, w, h}
            textContent: existingTextPanel?.textContent || "" // Lấy text (nếu có)
          };
        });

        // 5. Tạo đối tượng data để gửi cho API
        // Dùng (panelSource || textSource) để đảm bảo có metadata
        return {
          ...(panelSource || textSource),
          fileName: panelSource.fileName,
          panels: upToDatePanels, // Gửi danh sách đã kết hợp
          panelCount: upToDatePanels.length
        };
      })
      .filter(Boolean); // Lọc bỏ các file null
  };

  const processedTextResults = getProcessedTextData();
  // 2. Sửa lại: Chỉ cần có panel là được
  const isReady = files.length > 0 && 
                  analysisResults.some(r => r.detectionData); // Chỉ cần có Bước 1

  // 3. (Hàm handleGenerateAudio giữ nguyên)
  const handleGenerateAudio = async () => {
    if (!isReady) {
      setError('Vui lòng chạy "Bước 1: Phát hiện Panel" trước.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const payload = {
        // Gửi dữ liệu text đã được chuẩn hóa (đã qua edit nếu có)
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

      // Log debug 1: Xác nhận đã nhận data
      console.log('[FE] Đã nhận dữ liệu Audio từ Backend:', data.data);
      setVideoData(data.data);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. (Phần return/render giữ nguyên)
  return (
    <div className="pt-6 bg-slate-900 min-h-screen text-gray-200">
      <h2 className="text-xl font-bold mb-4 text-blue-400 pt-6">6. Tạo Video</h2>
      
      {/* --- Bước 1: Tạo Audio --- */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-300 mb-3">Bước 6.1: Tạo Âm thanh (TTS)</h3>
        
        {!isReady && files.length > 0 && (
          <p className="text-yellow-400 mb-4">Vui lòng chạy "Bước 1" trước.</p>
        )}
        {isReady && (
            <p className="text-green-400 mb-4">
              Sẵn sàng tạo audio cho {processedTextResults.length} file (sử dụng panel mới nhất và text đã edit).
            </p>
        )}
        
        <button 
          type="button" 
          onClick={handleGenerateAudio}
          disabled={loading || !isReady} 
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
        >
          {loading ? 'Đang tạo audio...' : `Tạo Audio cho ${processedTextResults.length} file`}
        </button>
        
        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 p-3 rounded">{error}</div>
        )}
      </div>

      {/* --- Hiển thị kết quả Audio --- */}
      {videoData.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-4">Kết quả Audio</h3>
          <div className="space-y-4">
            {videoData.map((file) => (
              <div key={file.fileName} className="bg-slate-700 p-3 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-2">{file.fileName}</h4>
                <div className="space-y-2">
                  {file.panels.map((panel) => {
                    
                    if (panel.audioUrl) {
                      console.log(`[FE] Render Panel ${panel.panelId}, URL: ${panel.audioUrl}`);
                    }

                    return (
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
                    );
                  })}
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