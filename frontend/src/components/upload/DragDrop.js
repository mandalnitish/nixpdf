// ============================================
// FILE: src/components/upload/DragDrop.js
// ============================================
import React, { useState } from 'react';
import { Upload } from 'lucide-react';

function DragDrop({ onFileSelect }) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`border-4 border-dashed rounded-xl p-12 text-center transition-colors ${
        dragActive ? 'border-purple-500 bg-purple-50' : 'border-purple-300 hover:border-purple-500'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept="application/pdf"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <Upload className="w-16 h-16 text-purple-500 mx-auto mb-4" />
        <p className="text-xl font-semibold text-gray-900 mb-2">
          Select PDF file
        </p>
        <p className="text-gray-600">
          or drag and drop file here
        </p>
      </label>
    </div>
  );
}

export default DragDrop;
