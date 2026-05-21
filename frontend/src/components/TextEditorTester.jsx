import React, { useState, useEffect } from 'react';

// Component con hiển thị và chỉnh text của từng panel.
const PanelTextInput = ({ panel, onChange }) => {
  const [text, setText] = useState(panel.textContent || '');

  // Đồng bộ giá trị textarea khi dữ liệu từ cha thay đổi.
  useEffect(() => {
    setText(panel.textContent || '');
  }, [panel.textContent]);

  const handleChange = (e) => {
    setText(e.target.value);
    onChange(panel.id, e.target.value);
  };

  return (
    <div className="bg-slate-700 p-3 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-blue-300">Panel {panel.id}</span>
        {panel.textDetected ? (
          <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Có text gốc</span>
        ) : (
          <span className="text-xs bg-gray-600 text-white px-2 py-1 rounded">Không có text</span>
        )}
      </div>
      <textarea
        value={text}
        onChange={handleChange}
        className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-gray-200"
        rows={3}
        placeholder={`Nhập text cho Panel ${panel.id}...`}
      />
    </div>
  );
};

// Component chính
const TextEditorTester = ({ files, analysisResults, updateAnalysisResult }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentTextData, setCurrentTextData] = useState(null);
  const [imageUrl, setImageUrl] = useState(null); 

  // Kết hợp dữ liệu panel và text để luôn hiển thị phiên bản mới nhất.
  useEffect(() => {
    if (selectedFile) {
      const result = analysisResults.find(r => r.fileName === selectedFile.name);
      if (!result) return;

      // Lấy dữ liệu panel mới nhất từ bước chỉnh sửa, nếu có.
      const panelSource = result.editedDetectionData || result.detectionData;
      
      // Lấy dữ liệu text đã sửa, nếu người dùng đã cập nhật.
      const textSource = result.editedTextData || result.textData;

      // Không có panel thì không thể render danh sách text.
      if (!panelSource || !panelSource.panels) {
        setCurrentTextData(null);
        setImageUrl(null);
        return;
      }

      // Đồng bộ text hiện tại vào từng panel.
      const upToDatePanels = panelSource.panels.map(panel => {
        const existingTextPanel = textSource?.panels.find(p => p.id === panel.id);
        
        return {
          ...panel, 
          textContent: existingTextPanel?.textContent || "", 
          textDetected: existingTextPanel?.textDetected || false,
          textBlocks: existingTextPanel?.textBlocks || []
        };
      });

      // Tạo object kết quả đã hợp nhất để lưu vào state chung.
      const newMergedData = {
        ...(panelSource || textSource), 
        fileName: panelSource.fileName,
        panels: upToDatePanels,
        panelCount: upToDatePanels.length,
        allText: upToDatePanels.map(p => p.textContent).filter(Boolean).join("\n")
      };
      
      setCurrentTextData(newMergedData);

      // Chọn ảnh chú thích phù hợp để hiển thị ở cột bên trái.
      if (result.textData && result.textData.annotatedImageBase64) {
        setImageUrl(`data:image/jpeg;base64,${result.textData.annotatedImageBase64}`);
      } else if (result.detectionData && result.detectionData.annotatedImageBase64) {
        setImageUrl(`data:image/jpeg;base64,${result.detectionData.annotatedImageBase64}`);
      } else {
        setImageUrl(null);
      }
    } else {
      // Reset khi người dùng bỏ chọn file.
      setCurrentTextData(null);
      setImageUrl(null);
    }
  }, [selectedFile, analysisResults]);

  // Cập nhật file đang chỉnh khi người dùng đổi lựa chọn.
  const handleFileSelect = (e) => {
    const fileName = e.target.value;
    const file = files.find(f => f.name === fileName);
    setSelectedFile(file);
  };

  // Cập nhật nội dung text của panel đang sửa.
  const handlePanelChange = (panelId, newText) => {
    const updatedPanels = currentTextData.panels.map(p => 
      p.id === panelId ? { ...p, textContent: newText } : p
    );
    
    const newAllText = updatedPanels
      .map(p => p.textContent)
      .filter(Boolean)
      .join("\n");
      
    setCurrentTextData({
      ...currentTextData,
      panels: updatedPanels,
      allText: newAllText
    });
  };

  // Ghi dữ liệu đã chỉnh vào state chung để dùng ở bước sau.
  const handleSave = () => {
    if (!selectedFile || !currentTextData) return;
    updateAnalysisResult(selectedFile.name, 'editedTextData', currentTextData);
    alert(`Đã lưu text đã sửa cho file ${selectedFile.name}!`);
  };
  
  // Chỉ cần có dữ liệu panel là đủ để mở tab này.
  const isDataReady = analysisResults.length > 0 && 
                      analysisResults.some(r => r.detectionData); // Chỉ cần có Bước 1

  return (
    <div className="pt-6 bg-slate-900 min-h-screen text-gray-200">
      <h2 className="text-xl font-bold mb-4 text-blue-400 pt-6">Bước 5: Chỉnh sửa Text</h2>

      {/* Thanh công cụ */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <select 
            onChange={handleFileSelect} 
            className="bg-slate-700 border border-slate-600 rounded p-2 flex-grow min-w-[200px]"
            disabled={!isDataReady}
          >
            <option value="">-- Chọn ảnh để sửa text --</option>
            {files.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
          <button 
            onClick={handleSave} 
            disabled={!selectedFile || !currentTextData} 
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            Lưu thay đổi Text
          </button>
        </div>
        {!isDataReady && files.length > 0 && (
          <p className="text-yellow-400 mt-4">Vui lòng chạy "Bước 1: Phát hiện Panel" trước.</p>
        )}
      </div>

      {/* Bố cục hai cột: ảnh bên trái, danh sách text bên phải. */}
      {selectedFile && currentTextData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Cột trái: ảnh chú thích. */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-4">
                Ảnh chú thích: {selectedFile.name}
              </h3>
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Annotated comic" 
                  className="w-full h-auto rounded-lg border border-slate-600"
                />
              ) : (
                <p className="text-gray-400">Không tìm thấy ảnh chú thích...</p>
              )}
               <p className="text-xs text-gray-500 mt-2 italic">
                 Lưu ý: Ảnh này là từ Bước 1 hoặc 4. Nếu bạn vừa sửa panel (Bước 2), hãy chạy lại Bước 4 để cập nhật ảnh này.
               </p>
            </div>
          </div>

          {/* Cột phải: danh sách panel để chỉnh text. */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-4">
                Chỉnh sửa text ({currentTextData.panels.length} panels)
              </h3>
              <div className="flex flex-col space-y-4 max-h-[80vh] overflow-y-auto pr-2">
                {currentTextData.panels.map((panel) => (
                  <PanelTextInput 
                    key={panel.id} 
                    panel={panel} 
                    onChange={handlePanelChange} 
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
      
      {/* Thông báo khi chưa chọn file hoặc chưa có dữ liệu panel. */}
      {!selectedFile && isDataReady && (
         <div className="text-center text-gray-400 py-10">
          Vui lòng chọn một file từ dropdown để bắt đầu sửa text.
        </div>
      )}

      {selectedFile && !currentTextData && (
        <div className="text-center text-gray-400 py-10">
          Không tìm thấy dữ liệu panel cho file này. Vui lòng chạy "Bước 1".
        </div>
      )}
    </div>
  );
};

export default TextEditorTester;