import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const BubbleDetectionTester = ({ files, analysisResults, updateAnalysisResult }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Lấy dữ liệu Crop từ bước 3
  const readyToDetect = analysisResults.length > 0 && analysisResults.every(r => r.cropData);

  const handleDetectBubbles = async () => {
    if (!readyToDetect) {
      setError('Vui lòng hoàn thành Bước 3 (Panel Cropper) trước.');
      return;
    }

    setLoading(true); setError('');

    try {
      // Gửi cropData xuống backend
      const cropDataList = analysisResults.map(r => r.cropData);

      const response = await fetch(`${API_BASE_URL}/api/comic/detect-bubbles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cropData: cropDataList }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Cập nhật kết quả bubbleData
      data.data.forEach(fileResult => {
        updateAnalysisResult(fileResult.fileName, 'bubbleData', fileResult);
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getPointsString = (points) => points.map(p => p.join(',')).join(' ');

  return (
    <div className="pt-6 bg-slate-900 min-h-screen text-gray-200">
      <h2 className="text-xl font-bold mb-4 text-blue-400 pt-6">Bước 5: Kiểm tra Bong Bóng (Trên Panel)</h2>
      
      <div className="bg-slate-800 p-4 mb-6 rounded-xl border border-slate-700">
        <button onClick={handleDetectBubbles} disabled={loading || !readyToDetect}
          className="bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg">
          {loading ? 'Đang phát hiện bong bóng...' : 'Phát hiện Bong Bóng trên Panel'}
        </button>
        {!readyToDetect && <p className="text-yellow-400 mt-2 text-sm">⚠️ Cần chạy Bước 3 (Crop) trước.</p>}
      </div>

      {/* HIỂN THỊ KẾT QUẢ THEO TỪNG FILE -> TỪNG PANEL */}
      <div className="space-y-8">
        {analysisResults.map((result, idx) => (
          result.bubbleData && result.cropData && (
            <div key={idx} className="bg-slate-800 p-4 rounded-xl border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-3 border-b border-slate-600 pb-2">{result.fileName}</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {result.cropData.panels.map(panel => {
                  // Tìm dữ liệu bubble tương ứng của panel này
                  const panelBubbleData = result.bubbleData.panels.find(p => p.panelId === panel.id);
                  const bubbles = panelBubbleData ? panelBubbleData.bubbles : [];

                  return (
                    <div key={panel.id} className="relative bg-black rounded border border-slate-600 group">
                       <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs px-1 rounded-br z-10">P{panel.id}</div>
                       
                       <div className="relative">
                          {/* Ảnh Panel */}
                          <img src={`data:image/jpeg;base64,${panel.croppedImageBase64}`} className="w-full h-auto block" alt="" />
                          
                          {/* Overlay vẽ bong bóng */}
                          {panelBubbleData && (
                            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                 viewBox={`0 0 ${panelBubbleData.width} ${panelBubbleData.height}`}>
                                {bubbles.map((b, bIdx) => (
                                    <polygon key={bIdx}
                                        points={getPointsString(b.points)}
                                        fill="rgba(236, 72, 153, 0.3)"
                                        stroke="#ec4899"
                                        strokeWidth="2"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                ))}
                            </svg>
                          )}
                       </div>
                       <div className="p-2 text-xs text-center text-gray-400">
                           {bubbles.length} bong bóng
                       </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default BubbleDetectionTester;