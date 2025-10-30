// Tên file: PanelEditorTester.jsx (Đã sửa lỗi hiển thị)

// 1. IMPORT `useCallback` (Rất quan trọng để tránh lỗi lặp vô hạn)
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image, Rect, Transformer } from 'react-konva';
import useImage from 'use-image';

// Component con 1: Tải ảnh (CÓ callback onImageLoad)
const ComicImage = ({ imageUrl, onImageLoad }) => {
  const [image] = useImage(imageUrl, 'Anonymous');

  // Gọi callback khi ảnh đã load xong và có kích thước
  useEffect(() => {
    if (image) {
      // Truyền kích thước thật của ảnh lên cho component cha
      onImageLoad({ width: image.width, height: image.height });
    }
  }, [image, onImageLoad]); // Phụ thuộc vào image và onImageLoad

  return <Image image={image} />;
};

// Component con 2: Khung Panel (Giữ nguyên)
const PanelBox = ({ shapeProps, isSelected, onSelect, onChange }) => {
  const shapeRef = useRef();
  const trRef = useRef();

  useEffect(() => {
    if (isSelected) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <React.Fragment>
      <Rect
        onClick={onSelect}
        onTap={onSelect}
        ref={shapeRef}
        {...shapeProps}
        draggable
        onDragEnd={(e) => {
          onChange({
            ...shapeProps,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = shapeRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...shapeProps,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </React.Fragment>
  );
};

// Component chính
const PanelEditorTester = ({ files, analysisResults, updateAnalysisResult }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [panels, setPanels] = useState([]);
  const [selectedId, selectShape] = useState(null);
  // 2. STATE MỚI: Lưu kích thước thật của ảnh
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const stageRef = useRef(null);

  // Load ảnh và panel data khi người dùng chọn một file từ dropdown
  useEffect(() => {
    if (selectedFile) {
      // 1. Tải file GỐC (sẽ chậm)
      const url = URL.createObjectURL(selectedFile);
      setImageUrl(url);

      // 2. Lấy panel data (LOGIC GIỮ KẾT QUẢ CỦA BẠN ĐÂY)
      const result = analysisResults.find(r => r.fileName === selectedFile.name);
      const panelData = result?.editedDetectionData || result?.detectionData; // <-- Nó ưu tiên data đã sửa

      if (panelData && panelData.panels) {
        const konvaPanels = panelData.panels.map(p => ({
            x: p.x, y: p.y, width: p.w, height: p.h,
            id: 'panel-' + p.id, stroke: 'red', strokeWidth: 4
        }));
        setPanels(konvaPanels);
      } else {
        setPanels([]);
      }

      // 3. Cleanup URL
      return () => URL.revokeObjectURL(url);
    } else {
      // Dọn dẹp nếu không có file nào được chọn
      setImageUrl(null);
      setPanels([]);
      setImageDimensions({ width: 0, height: 0 });
    }
  }, [selectedFile, analysisResults]);

  const handleFileSelect = (e) => {
    const fileName = e.target.value;
    const file = files.find(f => f.name === fileName);
    
    // 3. RESET kích thước (để hiển thị "Đang tải...")
    setImageDimensions({ width: 0, height: 0 }); 
    
    setSelectedFile(file);
    selectShape(null);
  };

  const handleSave = () => {
    if (!selectedFile) return;

    const savedPanels = panels.map((p, index) => ({
        id: index + 1,
        x: Math.round(p.x), y: Math.round(p.y),
        w: Math.round(p.width), h: Math.round(p.height)
    }));
    
    // 4. LƯU KÍCH THƯỚC: Lưu kích thước ảnh cùng với panel đã sửa
    const originalData = analysisResults.find(r => r.fileName === selectedFile.name)?.detectionData;
    const newEditedData = { 
        ...originalData, 
        panels: savedPanels,
        width: imageDimensions.width, // <-- Lưu kích thước ảnh
        height: imageDimensions.height // <-- Lưu kích thước ảnh
    };

    updateAnalysisResult(selectedFile.name, 'editedDetectionData', newEditedData);
    alert(`Đã lưu ${savedPanels.length} panel cho file ${selectedFile.name}!`);
  };
  
  const handleAddPanel = () => {
      // 5. Kiểm tra đã tải ảnh xong chưa
      if (!selectedFile || imageDimensions.width === 0) {
          alert("Vui lòng đợi ảnh tải xong trước khi thêm panel.");
          return;
      }
      const newId = 'panel-' + (panels.length + 1) + '-' + Math.random();
      setPanels([
          ...panels,
          {
              x: 20, y: 20,
              width: Math.min(100, imageDimensions.width - 40), // Đảm bảo panel mới không quá to
              height: Math.min(100, imageDimensions.height - 40),
              id: newId, stroke: 'red', strokeWidth: 4
          }
      ]);
      selectShape(newId);
  }

  const handleDeletePanel = () => {
    if(selectedId) {
        setPanels(panels.filter(p => p.id !== selectedId));
        selectShape(null);
    }
  }

  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      selectShape(null);
    }
  };

  // 6. Dùng `useCallback` để ngăn lỗi lặp vô hạn
  const handleImageLoad = useCallback(({ width, height }) => {
    setImageDimensions({ width, height });
  }, []); // Dependency array rỗng vì `setImageDimensions` là ổn định

  return (
    <div className="pt-6 bg-slate-900 text-gray-200">
      <h2 className="text-xl font-bold mb-4 text-blue-400 pt-6">Bước 2: Chỉnh sửa Panel</h2>
      
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        {/* (Thanh công cụ - Giữ nguyên logic <select>) */}
        <div className="flex flex-wrap gap-4 items-center">
            <select onChange={handleFileSelect} className="bg-slate-700 border border-slate-600 rounded p-2 flex-grow min-w-[200px]">
                <option value="">-- Chọn ảnh để chỉnh sửa --</option>
                {files.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
            <button onClick={handleAddPanel} disabled={!selectedFile || imageDimensions.width === 0} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg">Thêm Panel</button>
            <button onClick={handleDeletePanel} disabled={!selectedId} className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg">Xóa Panel</button>
            <button onClick={handleSave} disabled={!selectedFile || panels.length === 0} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg">Lưu thay đổi</button>
        </div>
        {selectedFile && imageDimensions.width > 0 && (
            <div className="mt-4 text-sm text-gray-400">
                Kích thước ảnh: {imageDimensions.width} x {imageDimensions.height} px
            </div>
        )}
      </div>

      {/* 7. SỬA LỖI LAYOUT (THIẾU HEIGHT/WIDTH): */}
      {imageUrl && ( // Nếu có URL (đã chọn file)
        <div 
            className="border border-slate-600 overflow-auto" // THÊM thanh cuộn
            style={{ 
                maxWidth: '100%', 
                maxHeight: '80vh', // Giới hạn chiều cao
                backgroundColor: '#1e293b' 
            }}
        >
          {/* Hiển thị "Đang tải" nếu ảnh chưa giải nén xong */}
          {imageDimensions.width === 0 && (
             <div className="text-center text-gray-400 py-10">
                <div className="font-bold text-lg">Đang giải nén ảnh...</div>
                <div>(File ảnh gốc có kích thước lớn, vui lòng chờ...)</div>
             </div>
          )}
          
          {/* Hiển thị Stage KHI ĐÃ có kích thước */}
          <Stage
            width={imageDimensions.width} // Đặt theo kích thước thật
            height={imageDimensions.height} // Đặt theo kích thước thật
            onMouseDown={checkDeselect}
            onTouchStart={checkDeselect}
            ref={stageRef}
            // Ẩn Stage đi khi đang tải (để tránh lỗi)
            style={{ display: imageDimensions.width > 0 ? 'block' : 'none' }}
          >
            <Layer>
              <ComicImage imageUrl={imageUrl} onImageLoad={handleImageLoad} />
              {panels.map((rect, i) => (
                <PanelBox
                  key={rect.id || i} // Sửa key để ổn định hơn
                  shapeProps={rect}
                  isSelected={rect.id === selectedId}
                  onSelect={() => {
                    selectShape(rect.id);
                  }}
                  onChange={(newAttrs) => {
                    const rects = panels.slice();
                    const index = panels.findIndex(p => p.id === newAttrs.id);
                    if (index !== -1) {
                        rects[index] = newAttrs;
                        setPanels(rects);
                    }
                  }}
                />
              ))}
            </Layer>
          </Stage>
        </div>
      )}
      {!imageUrl && ( // Nếu chưa chọn file
          <div className="text-center text-gray-400 py-10">Vui lòng chọn một file ảnh từ danh sách để bắt đầu chỉnh sửa.</div>
      )}
    </div>
  );
};

export default PanelEditorTester;