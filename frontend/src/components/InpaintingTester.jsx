import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const InpaintingTester = ({ files, analysisResults, updateAnalysisResult }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Đã xóa state 'prompt' vì LaMa không sử dụng nó

  // Bước này yêu cầu CẢ cropData (ảnh) VÀ textData (tọa độ bong bóng - dù YOLO tự detect nhưng luồng vẫn cần đảm bảo đã chạy qua các bước trước)
  const isReady = files.length > 0 &&
    analysisResults.length > 0 &&
    analysisResults.every(r => r.cropData && r.cropData.success !== false) &&
    analysisResults.every(r => r.textData && r.textData.success !== false);

  /**
   * Tổng hợp payload từ state
   */
  const buildPayload = () => {
    return analysisResults
      .filter(r => r.cropData && r.textData) // Chỉ lấy file có đủ 2 data
      .map(result => {
        const panels = result.cropData.panels.map(panel => {
          // Tìm data text tương ứng
          const textPanel = result.textData.panels.find(p => p.id === panel.id);
          
          let bubblePolygons = [];
          if (textPanel) {
            // ƯU TIÊN 1: Lấy từ 'blocks' (dữ liệu có cấu trúc, nếu có)
            if (textPanel.fullTextAnnotation?.pages?.[0]?.blocks) {
                bubblePolygons = textPanel.fullTextAnnotation.pages[0].blocks
                  .map(block => block.boundingPoly?.vertices)
                  .filter(Boolean); // Lọc bỏ giá trị null/undefined
              }
  
              // ƯU TIÊN 2: Nếu không có 'blocks', lấy từ 'textAnnotations[0]'
              if (bubblePolygons.length === 0 && textPanel.textAnnotations?.[0]?.boundingPoly?.vertices) {
                // console.warn(`File ${result.fileName} Panel ${panel.id}: Fallback to textAnnotations[0]`);
                bubblePolygons = [
                  textPanel.textAnnotations[0].boundingPoly.vertices
                ]; 
              }
          }

          return {
            panelId: panel.id,
            imageB64: panel.croppedImageBase64,
            dimensions: { w: panel.w, h: panel.h },
            bubblePolygons: bubblePolygons,
            // Đã xóa trường 'prompt'
          };
        });

        return {
          fileName: result.fileName,
          panels: panels,
        };
      });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isReady) {
      setError("Vui lòng chạy 'Bước 3: Cropper' và 'Bước 4: Text Detect' thành công trước.");
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const filesData = buildPayload();
      const payload = { filesData };

      const endpoint = `${API_BASE_URL}/api/comic/video/remove-bubbles`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) { throw new Error(data?.error || 'Lỗi từ server'); }

      // Cập nhật state chung với key 'inpaintedData'
      data.data.forEach(fileResult => {
        updateAnalysisResult(fileResult.fileName, 'inpaintedData', fileResult);
      });

    } catch (err) {
      console.error('[FE] Inpainting error:', err);
      setError(err.message || 'Đã xảy ra lỗi khi xử lý');
    } finally {
      setLoading(false);
    }
  };

  // Lấy kết quả để hiển thị (chỉ lấy file có cả ảnh gốc và ảnh đã sửa)
  const resultsToDisplay = analysisResults.filter(r => r.cropData && r.inpaintedData);

  return (
    <div className="pt-6 bg-slate-900 text-gray-200">
      <h2 className="text-xl font-bold mb-4 text-blue-400 pt-6">Bước 5: Xóa Bong Bóng (Inpainting)</h2>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <p className="text-gray-300 mb-4">
          {isReady ? (
            <span className="text-green-400 block">Đã sẵn sàng. (Có {analysisResults.length} file với đủ `cropData` và `textData`).</span>
          ) : (
             <span className="text-yellow-400 block">Vui lòng chạy "Bước 3" và "Bước 4" cho tất cả file trước.</span>
          )}
        </p>
        
        {/* Đã xóa phần nhập liệu Prompt ở đây */}
        
        <button 
          type="button" 
          onClick={onSubmit}
          disabled={loading || !isReady} 
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? `Đang xử lý ${analysisResults.length} file (LaMa Inpaint)...` : `Chạy Xóa Bong Bóng`}
        </button>

        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-3">
            <div className="font-semibold mb-2">Lỗi</div>
            <div className="text-sm">{error}</div>
          </div>
        )}
      </div>

      {/* HIỂN THỊ KẾT QUẢ */}
      {resultsToDisplay.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold text-blue-400">Kết quả Xóa Bong Bóng</h3>
            
          {resultsToDisplay.map((result) => (
            <div key={result.fileName} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h4 className="text-lg font-semibold text-blue-300 mb-4">
                {result.fileName}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {result.inpaintedData.panels.map((panel) => {
                  // Tìm ảnh panel gốc để so sánh
                  const originalPanel = result.cropData.panels.find(p => p.id === panel.panelId);
                  
                  return (
                    <div key={panel.panelId} className="border border-slate-600 rounded-lg p-2 bg-slate-900 space-y-2">
                      <div className="font-semibold text-blue-300 text-sm">Panel {panel.panelId}</div>
                      
                      {panel.success ? (
                        <>
                          <div>
                            <span className="text-xs text-gray-400">Ảnh gốc (Bước 3)</span>
                            <img
                              src={`data:image/jpeg;base64,${originalPanel.croppedImageBase64}`}
                              alt={`Panel ${panel.panelId} Original`}
                              className="w-full rounded mt-1"
                            />
                          </div>
                          <div>
                            <span className="text-xs text-green-400">Đã xóa bong bóng (Bước 4.5)</span>
                            <img
                              src={`data:image/jpeg;base64,${panel.inpaintedImageB64}`}
                              alt={`Panel ${panel.panelId} Inpainted`}
                              className="w-full rounded mt-1"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-3">
                          <div className="font-semibold mb-1">Lỗi xử lý panel</div>
                          <div className="text-sm">{panel.error}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InpaintingTester;