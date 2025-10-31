// ============================================
// FILE: src/components/upload/FilePreview.js
// ============================================
import React from 'react';
import { FileText, Download } from 'lucide-react';

function FilePreview({ file, onProcess, processing }) {
  return (
    <div className="mt-6 p-4 bg-purple-50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <FileText className="w-8 h-8 text-purple-600" />
          <div>
            <p className="font-semibold text-gray-900">{file.name}</p>
            <p className="text-sm text-gray-600">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
        <button 
          onClick={onProcess}
          disabled={processing}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{processing ? 'Processing...' : 'Process PDF'}</span>
          {!processing && <Download className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

export default FilePreview;