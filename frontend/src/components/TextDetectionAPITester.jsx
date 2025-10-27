import React, { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000';

const TextDetectionAPITester = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [selectedPanel, setSelectedPanel] = useState(null);

  const onFileChange = (e) => {
    const selectedFile = e.target.files[0];
    console.log('[FE] File selected:', selectedFile?.name);
    setFile(selectedFile);
    setResult(null);
    setError('');
    setSelectedPanel(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Vui lòng chọn một ảnh.');
      return;
    }
    
    setLoading(true);
    setError('');
    setResult(null);
    setSelectedPanel(null);
    
    try {
      const formData = new FormData();
      formData.append('comicImage', file);
      
      const start = performance.now();
      const endpoint = `${API_BASE_URL}/api/text-detection/detect`;
      console.log('[FE] Submitting to endpoint:', endpoint);
      
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
        console.log('[FE] JSON response:', data);
      } else {
        const text = await res.text();
        console.warn('[FE] Non-JSON response preview:', text?.slice(0, 400));
        throw new Error(`Phản hồi không phải JSON. Status: ${res.status}. Body: ${text?.slice(0, 400)}`);
      }
      
      if (!res.ok) {
        console.error('[FE] Server returned error JSON:', data);
        throw new Error(data?.error || `Lỗi xử lý ảnh (${res.status})`);
      }
      
      setResult({
        fileName: file.name,
        success: data.success,
        data: data.data,
        processingTime: data.data?.processingTime || 0
      });
      
      console.log('[FE] Text detection completed successfully');
      
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

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-gray-200">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold mb-4 text-blue-400">Text Detection API Tester</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-300">Upload ảnh comic</h3>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={onFileChange} 
                  className="w-full p-2 border border-slate-600 rounded-lg bg-slate-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" 
                />
                {file && (
                  <div className="mt-2 text-sm text-gray-400">
                    Đã chọn: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
              <button 
                type="submit" 
                disabled={loading || !file} 
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Đang xử lý...' : 'Phát hiện text'}
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
              {file && (
                <div className="flex justify-between">
                  <span>File đã chọn:</span>
                  <span className="text-blue-400">{file.name}</span>
                </div>
              )}
              {result && (
                <div className="flex justify-between">
                  <span>Thời gian xử lý:</span>
                  <span className="text-green-400">{result.processingTime}ms</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {result && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-blue-400">Kết quả phát hiện text</h3>
              <div className="flex gap-4 text-sm">
                <span className="bg-green-600 text-white px-3 py-1 rounded-full">
                  Thành công ({result.processingTime}ms)
                </span>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full">
                  Panels: {result.data?.panelCount || 0}
                </span>
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full">
                  Có text: {result.data?.totalTextDetected || 0}
                </span>
              </div>
            </div>
            
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <h5 className="text-md font-semibold mb-2 text-blue-300">Ảnh đã đánh dấu</h5>
                  <img
                    src={`data:image/jpeg;base64,${result.data.annotatedImageBase64}`}
                    alt={`annotated-${result.fileName}`}
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

              {/* Chi tiết panels */}
              {result.data.panels && (
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

              {/* Panel detail modal */}
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

                      {selectedPanel.textAnnotations && selectedPanel.textAnnotations.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2 text-blue-300">Text annotations:</h4>
                          <div className="bg-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                            {selectedPanel.textAnnotations.map((annotation, idx) => (
                              <div key={idx} className="mb-2 p-2 bg-slate-600 rounded text-xs">
                                <div className="font-semibold mb-1">Text {idx + 1}:</div>
                                <div className="mb-1">{annotation.description}</div>
                                {annotation.confidence && (
                                  <div className="text-gray-400">
                                    Confidence: {(annotation.confidence * 100).toFixed(1)}%
                                  </div>
                                )}
                              </div>
                            ))}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default TextDetectionAPITester;
