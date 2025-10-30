import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const TextDetectionTester = ({ files, analysisResults, updateAnalysisResult }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [selectedPanel, setSelectedPanel] = useState(null);

  const isPanelDataReady = analysisResults.length > 0 && 
                           analysisResults.every(r => r.detectionData || !files.find(f => f.name === r.fileName));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError('Vui lòng chọn ít nhất một ảnh từ mục Upload chung bên trên.');
      return;
    }

    if (!isPanelDataReady) {
      setError("Vui lòng chạy 'Bước 1: Phát hiện Panel' thành công cho tất cả ảnh trước.");
      return;
   }
    
    setLoading(true);
    setError('');

    setSelectedPanel(null);
    
    try {
      const formData = new FormData();
      
      files.forEach((file) => {
        formData.append('comicImages', file); 
      });

      const panelDataPayload = analysisResults
        .filter(r => r.detectionData)
        .map(r => ({
          fileName: r.fileName,
          // ƯU TIÊN LẤY DATA ĐÃ SỬA, NẾU KHÔNG CÓ THÌ LẤY DATA GỐC
          panels: (r.editedDetectionData || r.detectionData).panels
        }));
      
      formData.append('panelData', JSON.stringify(panelDataPayload));
          
      const endpoint = `${API_BASE_URL}/api/text-detection/detect-from-data`;
          
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
          
      const data = await res.json();
          
      if (!res.ok) { throw new Error(data?.error || 'Lỗi'); }

      // Cập nhật state chung (Cả thành công và thất bại)
      data.results.forEach(result => {
        if (result.success) {
          updateAnalysisResult(result.data.fileName, 'textData', result.data);
        } else {
          // Lưu cả lỗi vào state chung
          updateAnalysisResult(result.fileName, 'textData', { error: result.error, fileName: result.fileName, success: false });
        }
      });
      
      if (data.failed > 0) {
        setError(`${data.failed} file(s) xử lý thất bại. Xem chi tiết bên dưới.`);
      }
      
    } catch (err) {
      console.error('[FE] onSubmit error:', err);
      setError(err.message || 'Đã xảy ra lỗi khi xử lý');
    } finally {
      setLoading(false);
      console.log('[FE] Processing finished');
    }
  };

  const handlePanelClick = (panel) => {
    setSelectedPanel(panel);
  };

  // BƯỚC 4: Lọc dữ liệu hiển thị từ `analysisResults` (prop)
  const resultsToDisplay = analysisResults
    .filter(r => r.textData) // Lọc những item có dữ liệu của tab này
    .map(r => {
      // Chuẩn hóa cấu trúc
      if (r.textData.success === false) {
        return { success: false, error: r.textData.error, fileName: r.textData.fileName };
      }
      return { success: true, data: r.textData };
    });

  return (
    <div className="pt-6 bg-slate-900 min-h-screen text-gray-200">
      <h2 className="text-xl font-bold mb-4 text-blue-400 pt-6">Bước 3: Phát hiện Text</h2>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <p className="text-gray-300 mb-4">
          {isPanelDataReady && files.length > 0 && (
            <span className="text-green-400 block">Đã có dữ liệu panel. Sẵn sàng detect text.</span>
          )}
          {!isPanelDataReady && files.length > 0 && (
             <span className="text-yellow-400 block">Vui lòng chạy "Bước 1" trước.</span>
          )}
        </p>
        <button 
          type="button" 
          onClick={onSubmit}
          disabled={loading || files.length === 0 || !isPanelDataReady} 
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? `Đang xử lý ${files.length} file...` : `Phát hiện text cho ${files.length} file`}
        </button>

        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-3">
            <div className="font-semibold mb-2">Lỗi</div>
            <div className="text-sm">{error}</div>
          </div>
        )}
      </div>


      {/* BƯỚC 5: Render dựa trên `resultsToDisplay` */}
      {resultsToDisplay.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-blue-400">Kết quả phát hiện text</h3>
            <div className="flex gap-4 text-sm">
              <span className="bg-green-600 text-white px-3 py-1 rounded-full">
                Thành công: {resultsToDisplay.filter(r => r.success).length}
              </span>
              <span className="bg-red-600 text-white px-3 py-1 rounded-full">
                Thất bại: {resultsToDisplay.filter(r => !r.success).length}
              </span>
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full">
                Tổng: {resultsToDisplay.length}
              </span>
            </div>
          </div>
            
          {resultsToDisplay.map((result, index) => (
            <div key={index} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-lg font-semibold text-blue-300">
                  {result.data?.fileName || result.fileName}
                </h4>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <span className="bg-green-600 text-white px-2 py-1 rounded text-sm">
                      Thành công ({result.data?.processingTime}ms)
                    </span>
                  ) : (
                    <span className="bg-red-600 text-white px-2 py-1 rounded text-sm">
                      Thất bại
                    </span>
                  )}
                </div>
              </div>

              {result.success ? (
                // (Phần này giữ nguyên)
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <h5 className="text-md font-semibold mb-2 text-blue-300">Ảnh đã đánh dấu</h5>
                    <img
                      src={`data:image/jpeg;base64,${result.data.annotatedImageBase64}`}
                      alt={`annotated-${result.data.fileName}`}
                      className="w-full rounded-lg border border-slate-600"
                    />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-md font-semibold mb-2 text-blue-300">Thông tin tổng quan</h5>
                      <div className="bg-slate-700 rounded-lg p-3 text-sm space-y-1">
                        <div><strong>Tổng panels:</strong> {result.data.panelCount}</div>
                        <div><strong>Panels có text:</strong> {result.data.totalTextDetected}</div>
                        <div><strong>Kích thước:</strong> {result.data.width} x {result.data.height}</div>
                        <div><strong>Thời gian xử lý:</strong> {result.data.processingTime}ms</div>
                      </div>
                    </div>
                    
                    <div>
                      <h5 className="text-md font-semibold mb-2 text-blue-300">Tất cả text phát hiện</h5>
                      <div className="bg-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto text-sm">
                        {result.data.allText ? (
                          <div className="whitespace-pre-wrap">{result.data.allText}</div>
                        ) : (
                          <div className="text-gray-400 italic">Không có text nào được phát hiện</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // (Phần này giữ nguyên)
                <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-3">
                  <div className="font-semibold mb-1">Lỗi xử lý file</div>
                  <div className="text-sm">{result.error}</div>
                </div>
              )}

              {/* (Phần này giữ nguyên) */}
              {result.success && result.data.panels && (
                <div className="mt-6">
                  <h5 className="text-md font-semibold mb-3 text-blue-300">Chi tiết từng panel</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {result.data.panels.map((panel, panelIndex) => (
                      <div 
                        key={panelIndex} 
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPanel?.id === panel.id 
                            ? 'bg-blue-600 border-blue-500' 
                            : panel.textDetected 
                              ? 'bg-green-900/30 border-green-600 hover:bg-green-900/50' 
                              : 'bg-red-900/30 border-red-600 hover:bg-red-900/50'
                        }`}
                        onClick={() => handlePanelClick(panel)}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-sm">Panel {panel.id}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            panel.textDetected 
                              ? 'bg-green-600 text-white' 
                              : 'bg-red-600 text-white'
                          }`}>
                            {panel.textDetected ? 'Có text' : 'Không có text'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-300 space-y-1">
                          <div>Vị trí: ({panel.x}, {panel.y})</div>
                          <div>Kích thước: {panel.w} x {panel.h}</div>
                          {panel.textContent && (
                            <div className="mt-2 p-2 bg-slate-800 rounded text-xs">
                              <div className="font-semibold mb-1">Text:</div>
                              <div className="line-clamp-3">{panel.textContent}</div>
                            </div>
                          )}
                          {panel.error && (
                            <div className="mt-2 p-2 bg-red-800 rounded text-xs text-red-200">
                              <div className="font-semibold mb-1">Lỗi:</div>
                              <div>{panel.error}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* (Phần Modal giữ nguyên) */}
      {selectedPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-blue-300">
                Chi tiết Panel {selectedPanel.id}
              </h3>
              <button 
                onClick={() => setSelectedPanel(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Vị trí:</span> ({selectedPanel.x}, {selectedPanel.y})
                </div>
                <div>
                  <span className="font-semibold">Kích thước:</span> {selectedPanel.w} x {selectedPanel.h}
                </div>
                <div>
                  <span className="font-semibold">Có text:</span> 
                  <span className={`ml-2 px-2 py-1 rounded text-xs ${
                    selectedPanel.textDetected 
                      ? 'bg-green-600 text-white' 
                      : 'bg-red-600 text-white'
                  }`}>
                    {selectedPanel.textDetected ? 'Có' : 'Không'}
                  </span>
                </div>
              </div>

              {selectedPanel.textContent && (
                <div>
                  <h4 className="font-semibold mb-2 text-blue-300">Nội dung text:</h4>
                  <div className="bg-slate-700 rounded-lg p-3 whitespace-pre-wrap text-sm">
                    {selectedPanel.textContent}
                  </div>
                </div>
              )}

              {selectedPanel.error && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-3">
                  <h4 className="font-semibold mb-2">Lỗi xử lý:</h4>
                  <div className="text-sm">{selectedPanel.error}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextDetectionTester;