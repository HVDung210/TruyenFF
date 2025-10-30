import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000';

// 1. Nhận `files` từ props
const PanelDetectionTester = ({ files,analysisResults, updateAnalysisResult }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError('Vui lòng chọn ít nhất một ảnh từ mục Upload chung bên trên.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const formData = new FormData();
      
      // 2. Thêm TẤT CẢ file vào một FormData
      // Tên field 'files' phải khớp với tên trong comic.js (upload.array('files', 10))
      files.forEach((file) => {
        formData.append('files', file); 
      });
          
      const start = performance.now();
      
      // 3. Gọi API "detect-multiple"
      const endpoint = `${API_BASE_URL}/api/comic-to-video/detect-multiple`; //
          
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
          
      const elapsed = Math.round(performance.now() - start);
      console.log(`[FE] Panel Detect API Response:`, res.status, 'elapsedMs=', elapsed);
          
      const data = await res.json();
          
      if (!res.ok) {
        throw new Error(data?.error || `Lỗi xử lý ảnh (${res.status})`);
      }

      // 4. API trả về một object, chúng ta lấy mảng `results`

      data.results.forEach(result => {
        if (result.success) {
          updateAnalysisResult(result.data.fileName, 'detectionData', result.data);
        } else {
          // Cũng cập nhật nếu thất bại, để hiển thị lỗi
          updateAnalysisResult(result.fileName, 'detectionData', { error: result.error, fileName: result.fileName, success: false });
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

  // BƯỚC 3: Lọc dữ liệu hiển thị từ `analysisResults` (prop)
  // Chỉ lấy những kết quả thuộc về tab này (detectionData)
  const resultsToDisplay = analysisResults
    .filter(r => r.detectionData) // Lọc những item có dữ liệu của tab này
    .map(r => {
      // Chuẩn hóa cấu trúc để giống với `results` cũ
      // (Nếu thành công, data nằm trong detectionData. Nếu thất bại, detectionData là { success: false, ... })
      return r.detectionData.success === false
        ? { success: false, error: r.detectionData.error, fileName: r.detectionData.fileName }
        : { success: true, data: r.detectionData };
    });

  return (
    <div className="pt-6 bg-slate-900 min-h-screen text-gray-200">
      <h2 className="text-xl font-bold mb-4 text-blue-400 pt-6">Bước 1: Phát hiện Panel</h2>

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <p className="text-gray-300 mb-4">
          Sử dụng {files.length} file(s) đã chọn.
        </p>
        <button 
          type="button" 
          onClick={onSubmit}
          disabled={loading} // Chỉ cần check loading
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? `Đang xử lý ${files.length} file...` : `Chạy phát hiện Panel`}
        </button>

        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-3">
            <div className="font-semibold mb-2">Lỗi</div>
            <div className="text-sm">{error}</div>
          </div>
        )}
      </div>

      {/* BƯỚC 4: Render dựa trên `resultsToDisplay` (biến mới) thay vì `results` (state cũ) */}
      {resultsToDisplay.length > 0 && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-blue-400">Kết quả phát hiện Panel</h3>
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
            
          {/* Map qua `resultsToDisplay` */}
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
                // (Phần này giữ nguyên, vì nó đọc từ `result.data`)
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
                        <div><strong>Kích thước:</strong> {result.data.width} x {result.data.height}</div>
                        <div><strong>Phương pháp:</strong> {result.data.detectionMethod}</div>
                        <div><strong>Thời gian xử lý:</strong> {result.data.processingTime}ms</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // (Phần này giữ nguyên, vì nó đọc từ `result.error`)
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

export default PanelDetectionTester;