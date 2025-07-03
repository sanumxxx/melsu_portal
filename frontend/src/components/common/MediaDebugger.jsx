import React, { useState, useEffect } from 'react';
import { testMediaUrl } from '../../services/api';

const MediaDebugger = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testUrls] = useState([
    '/uploads/announcements/test.jpg',
    '/uploads/announcements/test.mp4',
    '/uploads/announcements/test.png',
    '/api/announcements/current',
    '/health'
  ]);

  const runTests = async () => {
    setIsLoading(true);
    setTestResults([]);
    
    console.log('🧪 Starting media URL tests...');
    
    const results = [];
    
    // Тест базовых URL
    for (const url of testUrls) {
      console.log(`Testing: ${url}`);
      const result = await testMediaUrl(url);
      results.push({
        url,
        ...result,
        type: 'URL Test'
      });
    }
    
    // Тест API для получения объявлений
    try {
      const response = await fetch('/api/announcements/current');
      const data = await response.json();
      
      if (data.has_unviewed && data.announcement && data.announcement.media_url) {
        console.log('🎯 Found real media URL to test:', data.announcement.media_url);
        const mediaTest = await testMediaUrl(data.announcement.media_url);
        results.push({
          url: data.announcement.media_url,
          ...mediaTest,
          type: 'Real Media'
        });
      }
    } catch (error) {
      console.error('❌ Failed to fetch announcements:', error);
      results.push({
        url: '/api/announcements/current',
        success: false,
        error: error.message,
        type: 'API Test'
      });
    }
    
    setTestResults(results);
    setIsLoading(false);
    console.log('✅ Media URL tests completed:', results);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">🔍 Media Files Debugger</h2>
      
      <div className="mb-4">
        <button
          onClick={runTests}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Run Tests'}
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Results:</h3>
          
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-medium ${
                  result.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {result.success ? '✅' : '❌'} {result.type}
                </span>
                <span className="text-sm text-gray-500">
                  Status: {result.status || 'ERROR'}
                </span>
              </div>
              
              <div className="text-sm">
                <div className="font-mono text-xs bg-gray-100 p-2 rounded mb-2">
                  {result.url}
                </div>
                
                {result.error && (
                  <div className="text-red-600 mb-2">
                    Error: {result.error}
                  </div>
                )}
                
                {result.success && (
                  <div className="text-green-600">
                    Successfully accessible
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h4 className="font-semibold mb-2">Debug Information:</h4>
        <div className="text-sm space-y-1">
          <div>Current Origin: <code>{window.location.origin}</code></div>
          <div>User Agent: <code>{navigator.userAgent}</code></div>
          <div>Timestamp: <code>{new Date().toISOString()}</code></div>
        </div>
      </div>
    </div>
  );
};

export default MediaDebugger; 