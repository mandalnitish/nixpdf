import React, { useState } from 'react';
import DragDrop from './DragDrop';
import FilePreview from './FilePreview';

function FileUpload({ feature, selectedFile, onFileSelect }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (file) => {
    if (file && file.type === 'application/pdf') {
      onFileSelect(file);
      setError(null);
      setSuccess(false);
    } else {
      setError('Please select a valid PDF file');
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) return;

    setProcessing(true);
    setError(null);
    setSuccess(false);

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);

      // Get the correct endpoint
      const endpoint = getEndpoint(feature);
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

      console.log('Uploading to:', `${API_URL}${endpoint}`);

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Server error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${feature}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Process error:', err);
      setError(err.message || 'Failed to process PDF. Make sure backend is running on port 5000');
    } finally {
      setProcessing(false);
    }
  };

  const getEndpoint = (feature) => {
    const endpoints = {
      merge: '/merge',
      split: '/split',
      compress: '/compress',
      convert: '/convert-to-images',
      rotate: '/rotate',
      lock: '/protect',
      unlock: '/unlock',
      watermark: '/watermark',
      sign: '/sign',
    };
    return endpoints[feature] || '/compress';
  };

  const getFeatureName = () => {
    const names = {
      merge: 'Merge',
      split: 'Split',
      compress: 'Compress',
      convert: 'Convert',
      rotate: 'Rotate',
      lock: 'Protect',
      unlock: 'Unlock',
      watermark: 'Watermark',
      sign: 'Sign',
    };
    return names[feature] || 'Process';
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-3xl mx-auto">
      <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        {getFeatureName()} PDF
      </h3>

      <DragDrop onFileSelect={handleFileChange} />

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-semibold">Error:</p>
          <p className="text-red-600">{error}</p>
          <p className="text-sm text-red-500 mt-2">
            💡 Make sure the backend server is running on http://localhost:5000
          </p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          ✅ PDF processed successfully! Check your downloads folder.
        </div>
      )}

      {selectedFile && (
        <FilePreview 
          file={selectedFile} 
          onProcess={handleProcess}
          processing={processing}
        />
      )}
    </div>
  );
}

export default FileUpload;