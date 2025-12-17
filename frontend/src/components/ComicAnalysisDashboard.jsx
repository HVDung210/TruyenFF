import React, { useState } from 'react';
import PanelDetectionTester from './PanelDetectionTester';
import PanelEditorTester from './PanelEditorTester';
import TextDetectionTester from './TextDetectionTester';
import PanelCropperTester from './PanelCropperTester';
import TextEditorTester from './TextEditorTester';
import VideoGeneratorTester from './VideoGeneratorTester';
import InpaintingTester from './InpaintingTester';
import BubbleDetectionTester from './BubbleDetectionTester';

const ComicAnalysisDashboard = () => {
  const [activeTab, setActiveTab] = useState('panels');

  const [files, setFiles] = useState([]);
  const [fileNames, setFileNames] = useState('');

  const [analysisResults, setAnalysisResults] = useState([]);

  const [videoData, setVideoData] = useState([]);
  const [sceneData, setSceneData] = useState([]);     
  const [finalVideos, setFinalVideos] = useState([]);

  const tabs = [
    { id: 'panels', label: '1. Panel Detection', component: PanelDetectionTester },
    { id: 'editor', label: '2. Panel Editor', component: PanelEditorTester },
    { id: 'crop', label: '3. Panel Cropper', component: PanelCropperTester },
    { id: 'text', label: '4. Text Detection', component: TextDetectionTester },
    { id: 'bubble', label: '5. Bubble Detection', component: BubbleDetectionTester },
    { id: 'inpainting', label: '6. Inpainting', component: InpaintingTester },
    { id: 'text-editor', label: '7. Text Editor', component: TextEditorTester }, 
    { id: 'video', label: '8. Video Generation', component: VideoGeneratorTester }
    
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || PanelDetectionTester;

  const onFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
    setFileNames(selectedFiles.map(f => f.name).join(', '));
    
    const initialResults = selectedFiles.map(f => ({
      fileName: f.name,
      status: "pending",
      detectionData: null,
      editedDetectionData: null, // <-- STATE MỚI: Lưu kết quả đã chỉnh sửa
      cropData: null,
      textData: null,
      bubbleData: null,
      inpaintedData: null,
      editedTextData: null
    }));
    setAnalysisResults(initialResults);
    // 4. RESET VIDEO DATA KHI THAY ĐỔI FILE
    setVideoData([]);
    setSceneData([]);
    setFinalVideos([]);
  };

  /**
   * HÀM MỚI: Callback để các tab con cập nhật state chung
   * @param {string} fileName Tên file
   * @param {'detectionData' | 'cropData' | 'textData' | 'inpaintedData' | 'editedDetectionData' | 'editedTextData'} type Loại dữ liệu
   * @param {object} data Dữ liệu kết quả
   */
  const updateAnalysisResult = (fileName, type, data) => {
    setAnalysisResults(currentResults =>
      currentResults.map(result =>
        result.fileName === fileName
          ? { ...result, [type]: data, status: `${type}_done` }
          : result
      )
    );
  };
  
  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-400 mb-4">Comic Analysis Dashboard</h1>
          <div className="flex space-x-1 bg-slate-700 rounded-lg p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <h3 className="text-xl font-semibold mb-3 text-blue-300">Upload ảnh</h3>
          <input 
            type="file" 
            accept="image/*" 
            multiple
            onChange={onFileChange} 
            className="w-full p-2 border border-slate-600 rounded-lg bg-slate-700 text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700" 
          />
          {files.length > 0 && (
            <div className="mt-3 text-sm text-green-400">
              <span className="font-semibold">Đã chọn {files.length} file(s):</span> {fileNames}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6">
        <ActiveComponent 
          files={files} 
          analysisResults={analysisResults} 
          updateAnalysisResult={updateAnalysisResult}
          videoData={videoData}
          setVideoData={setVideoData}
          sceneData={sceneData}
          setSceneData={setSceneData}
          finalVideos={finalVideos}
          setFinalVideos={setFinalVideos}
        />
      </div>
    </div>
  );
};

export default ComicAnalysisDashboard;
