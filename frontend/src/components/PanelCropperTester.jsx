import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const PanelCropperTester = ({ files, analysisResults, updateAnalysisResult }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  

  const isPanelDataReady = analysisResults.length > 0 && 
                           analysisResults.every(r => r.detectionData || !files.find(f => f.name === r.fileName));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError('Vui lòng upload ảnh ở trên.');
      return;
    }
    
    if (!isPanelDataReady) {
       setError("Vui lòng chạy 'Bước 1: Phát hiện Panel' thành công cho tất cả ảnh trước khi cắt.");
       return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file); 
      });

      const panelDataPayload = analysisResults
        .filter(r => r.detectionData) 
        .map(r => ({
          fileName: r.fileName,
          panels: r.detectionData.panels
        }));
      
      formData.append('panelData', JSON.stringify(panelDataPayload));
      
      const endpoint = `${API_BASE_URL}/api/comic/crop-from-data`;
      
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) { throw new Error(data?.error || data?.details || 'Lỗi'); }
      

      // Cập nhật state chung (Cả thành công và thất bại)
      data.results.forEach(result => {
        if (result.success) {
          updateAnalysisResult(result.data.fileName, 'cropData', result.data);
        } else {
          // Lưu cả lỗi vào state chung
          updateAnalysisResult(result.fileName, 'cropData', { error: result.error, fileName: result.fileName, success: false });
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
    }
  };

  // BƯỚC 4: Lọc dữ liệu hiển thị từ `analysisResults` (prop)
  const resultsToDisplay = analysisResults
    .filter(r => r.cropData) // Lọc những item có dữ liệu của tab này
    .map(r => {
      // Chuẩn hóa cấu trúc để giống với `results` cũ
      if (r.cropData.success === false) {
        return { success: false, error: r.cropData.error, fileName: r.cropData.fileName };
      }
      return { success: true, data: r.cropData };
    });

  return (
    <div className="pt-6 bg-slate-900 text-gray-200">
      <h2 className="text-xl font-bold mb-4 text-blue-400 pt-6">Bước 2: Cắt Panel</h2>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <p className="text-gray-300 mb-4">
          {isPanelDataReady && files.length > 0 && (
            <span className="text-green-400 block">Đã có dữ liệu panel. Sẵn sàng để cắt.</span>
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
          {loading ? `Đang cắt ${files.length} file...` : `Chạy cắt Panel`}
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
              <h4 className="text-lg font-semibold text-blue-300 mb-2">
                {result.fileName || result.data?.fileName}
              </h4>
              
              {result.success ? (
                <>
                  <div className="bg-slate-700 rounded-lg p-3 text-sm space-y-1 mb-4">
                    <div><strong>Tổng panels:</strong> {result.data.panelCount}</div>
                    <div><strong>Kích thước gốc:</strong> {result.data.width} x {result.data.height}</div>
                    <div><strong>Phương pháp:</strong> {result.data.detectionMethod}</div>
                    <div><strong>Thời gian xử lý:</strong> {result.data.processingTime}ms</div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {result.data.panels.map((panel) => (
                      <div key={panel.id} className="border border-slate-600 rounded-lg p-2 bg-slate-900">
                        <div className="font-semibold text-blue-300 text-sm mb-2">Panel {panel.id}</div>
                        <img
                          src={`data:image/jpeg;base64,${panel.croppedImageBase64}`}
                          alt={`Panel ${panel.id}`}
                          className="w-full rounded"
                        />
                        <div className="text-xs text-gray-400 mt-2">
                          (w: {panel.w}, h: {panel.h})
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-3">
                  <div className="font-semibold mb-1">Lỗi xử lý file</div>
                  <div className="text-sm">{result.error}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PanelCropperTester;