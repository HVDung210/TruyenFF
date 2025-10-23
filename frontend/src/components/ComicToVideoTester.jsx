import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const ComicToVideoTester = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debug, setDebug] = useState(null);
  const [results, setResults] = useState([]);
  const [processedCount, setProcessedCount] = useState(0);

  const onFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    console.log('[FE] onFileChange files:', selectedFiles.map(f => ({ name: f.name, size: f.size, type: f.type })));
    setFiles(selectedFiles);
    setResults([]);
    setError('');
    setProcessedCount(0);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) {
      setError('Vui lòng chọn ít nhất một ảnh.');
      return;
    }
    
    setLoading(true);
    setError('');
    setResults([]);
    setProcessedCount(0);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const start = performance.now();
      const endpoint = `${API_BASE_URL}/api/comic-to-video/detect-multiple`;
      console.log('[FE] Submitting to endpoint:', endpoint, 'filesCount=', files.length);
      
      const res = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });
      
      const elapsed = Math.round(performance.now() - start);
      const contentType = res.headers.get('content-type') || '';
      console.log('[FE] Response status:', res.status, 'elapsedMs=', elapsed, 'contentType=', contentType);
      let data;
      
      if (contentType.includes('application/json')) {
        data = await res.json();
        console.log('[FE] JSON response keys:', Object.keys(data || {}));
      } else {
        const text = await res.text();
        console.warn('[FE] Non-JSON response preview:', text?.slice(0, 400));
        throw new Error(`Phản hồi không phải JSON. Status: ${res.status}. Body: ${text?.slice(0, 400)}`);
      }
      
      if (!res.ok) {
        console.error('[FE] Server returned error JSON:', data);
        throw new Error(data?.error || `Lỗi xử lý ảnh (${res.status})`);
      }
      
      // Update results with the batch response
      setResults(data.results || []);
      setProcessedCount(data.totalFiles || 0);
      console.log('[FE] Results count:', (data.results || []).length, 'totalFiles:', data.totalFiles);
      
      // Check if any processing failed
      const failedResults = data.results?.filter(r => !r.success) || [];
      if (failedResults.length > 0) {
        setError(`${failedResults.length} file(s) xử lý thất bại. Xem chi tiết bên dưới.`);
        console.warn('[FE] Failed items:', failedResults.map((f, i) => ({ i, fileName: f.fileName, error: f.error })));
      }
      
    } catch (err) {
      console.error('[FE] onSubmit error:', err);
      setError(err.message || 'Đã xảy ra lỗi khi xử lý');
    } finally {
      setLoading(false);
      console.log('[FE] Processing finished');
    }
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-gray-200">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Phát hiện panel</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-300">Upload nhiều ảnh</h3>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  onChange={onFileChange} 
                  className="w-full p-2 border border-slate-600 rounded-lg bg-slate-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" 
                />
                {files.length > 0 && (
                  <div className="mt-2 text-sm text-gray-400">
                    Đã chọn {files.length} file(s): {files.map(f => f.name).join(', ')}
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                disabled={loading || !files.length} 
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? `Đang xử lý... (${processedCount}/${files.length})` : 'Phát hiện panel'}
              </button>
            </form>

            {error && (
              <div className="mt-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg p-3">
                <div className="font-semibold mb-2">Lỗi khi xử lý</div>
                <div className="text-sm">{error}</div>
              </div>
            )}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-300">Thông tin hệ thống</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex justify-between">
                <span>API Endpoint:</span>
                <span className="text-blue-400 font-mono">{API_BASE_URL}</span>
              </div>
              <div className="flex justify-between">
                <span>Trạng thái:</span>
                <span className={loading ? "text-yellow-400" : "text-green-400"}>
                  {loading ? 'Đang xử lý' : 'Sẵn sàng'}
                </span>
              </div>
              {files.length > 0 && (
                <div className="flex justify-between">
                  <span>Files đã chọn:</span>
                  <span className="text-blue-400">{files.length}</span>
                </div>
              )}
              {loading && (
                <div className="flex justify-between">
                  <span>Tiến độ:</span>
                  <span className="text-yellow-400">{processedCount}/{files.length}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-blue-400">Kết quả xử lý</h3>
              <div className="flex gap-4 text-sm">
                <span className="bg-green-600 text-white px-3 py-1 rounded-full">
                  Thành công: {results.filter(r => r.success).length}
                </span>
                <span className="bg-red-600 text-white px-3 py-1 rounded-full">
                  Thất bại: {results.filter(r => !r.success).length}
                </span>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full">
                  Tổng: {results.length}
                </span>
              </div>
            </div>
            
            {results.map((result, index) => (
              <div key={index} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-blue-300">
                    {result.fileName || result.data?.fileName}
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
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <h5 className="text-md font-semibold mb-2 text-blue-300">Ảnh đã đánh dấu</h5>
                      <img
                        src={`data:image/jpeg;base64,${result.data.annotatedImageBase64}`}
                        alt={`annotated-${result.fileName || result.data?.fileName}`}
                        className="w-full rounded-lg border border-slate-600"
                      />
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h5 className="text-md font-semibold mb-2 text-blue-300">Thông tin panel</h5>
                        <div className="bg-slate-700 rounded-lg p-3 text-sm space-y-1">
                          <div><strong>Tổng khung:</strong> {result.data.panelCount}</div>
                          <div><strong>Kích thước:</strong> {result.data.width} x {result.data.height}</div>
                          <div><strong>Thời gian xử lý:</strong> {result.data.processingTime}ms</div>
                          
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-md font-semibold mb-2 text-blue-300">Chi tiết panels</h5>
                        <div className="bg-slate-700 rounded-lg p-3 max-h-64 overflow-y-auto text-xs">
                          {result.data.panels?.map((panel, panelIndex) => (
                            <div key={panelIndex} className="mb-2 p-2 bg-slate-600 rounded">
                              <div className="font-semibold">Panel {panel.id}</div>
                              <div>Vị trí: ({panel.x}, {panel.y}) - Kích thước: {panel.w} x {panel.h}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
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
    </div>
  );
};

export default ComicToVideoTester;