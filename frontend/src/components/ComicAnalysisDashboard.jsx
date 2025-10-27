import React, { useState } from 'react';
import ComicToVideoTester from './ComicToVideoTester';
import TextDetectionTester from './TextDetectionTester';
import TextDetectionAPITester from './TextDetectionAPITester';

const ComicAnalysisDashboard = () => {
  const [activeTab, setActiveTab] = useState('panels');

  const tabs = [
    { id: 'panels', label: 'Panel Detection', component: ComicToVideoTester },
    { id: 'text', label: 'Text Detection', component: TextDetectionTester },
    // { id: 'api-test', label: 'API Tester', component: TextDetectionAPITester }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ComicToVideoTester;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-blue-400 mb-4">Comic Analysis Dashboard</h1>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-slate-700 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default ComicAnalysisDashboard;
