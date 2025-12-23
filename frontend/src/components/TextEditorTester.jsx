// File: src/components/TextEditorTester.jsx
// TRẠNG THÁI: ĐÃ SỬA LẠI (SỬ DỤNG LOGIC KẾT HỢP STATE)

import React, { useState, useEffect } from 'react';

// Component con (Giữ nguyên)
const PanelTextInput = ({ panel, onChange }) => {
  const [text, setText] = useState(panel.textContent || '');

  // Cập nhật text nếu prop (từ state cha) thay đổi
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

  // 1. SỬA LẠI HOÀN TOÀN LOGIC useEffect (ĐỂ KẾT HỢP STATE)
  useEffect(() => {
    if (selectedFile) {
      const result = analysisResults.find(r => r.fileName === selectedFile.name);
      if (!result) return;

      // === LOGIC MỚI: KẾT HỢP DATA ===

      // 1. Lấy "Sự thật" về Panel (từ Bước 2 hoặc 1)
      const panelSource = result.editedDetectionData || result.detectionData;
      
      // 2. Lấy "Sự thật" về Text (từ Bước 5 hoặc 4)
      const textSource = result.editedTextData || result.textData;

      // 3. Nếu không có panel, thoát
      if (!panelSource || !panelSource.panels) {
        setCurrentTextData(null);
        setImageUrl(null);
        return;
      }

      // 4. Tạo danh sách panel mới nhất
      // Lấy panel từ panelSource, và tìm text tương ứng từ textSource
      const upToDatePanels = panelSource.panels.map(panel => {
        // Tìm text cho panel này (nếu có)
        const existingTextPanel = textSource?.panels.find(p => p.id === panel.id);
        
        return {
          ...panel, // Lấy {id, x, y, w, h} từ panelSource
          textContent: existingTextPanel?.textContent || "", // Lấy text (nếu có)
          textDetected: existingTextPanel?.textDetected || false // Lấy cờ (nếu có)
        };
      });

      // 5. Tạo một đối tượng 'textData' mới, hợp nhất
      // Dùng (panelSource || textSource) để đảm bảo có metadata
      const newMergedData = {
        ...(panelSource || textSource), 
        fileName: panelSource.fileName,
        panels: upToDatePanels,
        panelCount: upToDatePanels.length,
        allText: upToDatePanels.map(p => p.textContent).filter(Boolean).join("\n")
      };
      
      setCurrentTextData(newMergedData);

      // === Lấy Ảnh (Logic cũ vẫn đúng) ===
      if (result.textData && result.textData.annotatedImageBase64) {
        setImageUrl(`data:image/jpeg;base64,${result.textData.annotatedImageBase64}`);
      } else if (result.detectionData && result.detectionData.annotatedImageBase64) {
        setImageUrl(`data:image/jpeg;base64,${result.detectionData.annotatedImageBase64}`);
      } else {
        setImageUrl(null);
      }
    } else {
      // Reset khi không chọn file
      setCurrentTextData(null);
      setImageUrl(null);
    }
  }, [selectedFile, analysisResults]);

  // 2. Xử lý khi chọn file (Giữ nguyên)
  const handleFileSelect = (e) => {
    const fileName = e.target.value;
    const file = files.find(f => f.name === fileName);
    setSelectedFile(file);
  };

  // 3. Xử lý khi thay đổi text (Giữ nguyên)
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

  // 4. Lưu thay đổi (Giữ nguyên)
  const handleSave = () => {
    if (!selectedFile || !currentTextData) return;
    updateAnalysisResult(selectedFile.name, 'editedTextData', currentTextData);
    alert(`Đã lưu text đã sửa cho file ${selectedFile.name}!`);
  };
  
  // 5. Sửa lại: Chỉ cần có panel là được
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

      {/* Layout 2 cột (Giữ nguyên) */}
      {selectedFile && currentTextData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CỘT BÊN TRÁI: HIỂN THỊ ẢNH */}
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

          {/* CỘT BÊN PHẢI: SỬA TEXT (Giờ sẽ hiển thị đúng số panel) */}
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
      
      {/* Các thông báo (Giữ nguyên) */}
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