import React, { useState, useRef } from "react";
import { usePDFTool } from "../hooks/usePDFTool";
import {
  mergePDFs,
  splitPDF,
  compressPDF,
  rotatePDF,
  watermarkPDF,
  protectPDF,
  unlockPDF,
  editPDF,
  signPDF,
  ocrPDF,
  repairPDF,
  redactPDF,
  cropPDF,
  comparePDF,
  addPageNumbers,
  organizePDF,
  pdfToWord,
  pdfToPowerPoint,
  pdfToExcel,
  wordToPDF,
  pptToPDF,
  excelToPDF,
  jpgToPDF,
  pdfToJPG,
} from "../api/pdfApi";

const tools = [
  { 
    icon: "🔗", 
    name: "Merge PDF", 
    desc: "Combine multiple PDFs into one", 
    func: mergePDFs, 
    multiple: true,
    accept: "application/pdf"
  },
  { 
    icon: "✂️", 
    name: "Split PDF", 
    desc: "Extract all pages as separate PDFs", 
    func: splitPDF, 
    multiple: false,
    accept: "application/pdf"
  },
  { 
    icon: "📦", 
    name: "Compress PDF", 
    desc: "Reduce file size", 
    func: compressPDF, 
    multiple: false,
    accept: "application/pdf"
  },
  { 
    icon: "🔄", 
    name: "Rotate PDF", 
    desc: "Rotate pages clockwise", 
    func: rotatePDF, 
    multiple: false, 
    params: [{ name: "degrees", type: "select", options: ["90", "180", "270"], default: "90" }],
    accept: "application/pdf"
  },
  { 
    icon: "💧", 
    name: "Watermark", 
    desc: "Add watermark text to PDF", 
    func: watermarkPDF, 
    multiple: false, 
    params: [
      { name: "text", type: "text", placeholder: "CONFIDENTIAL", default: "CONFIDENTIAL" },
      { name: "opacity", type: "range", min: "0.1", max: "1", step: "0.1", default: "0.3" }
    ],
    accept: "application/pdf"
  },
  { 
    icon: "🔒", 
    name: "Protect PDF", 
    desc: "Add password protection", 
    func: protectPDF, 
    multiple: false, 
    params: [{ name: "password", type: "password", placeholder: "Enter password", required: true }],
    accept: "application/pdf"
  },
  { 
    icon: "🔓", 
    name: "Unlock PDF", 
    desc: "Remove password", 
    func: unlockPDF, 
    multiple: false, 
    params: [{ name: "password", type: "password", placeholder: "Enter password", required: true }],
    accept: "application/pdf"
  },
  { 
    icon: "🔢", 
    name: "Page Numbers", 
    desc: "Add page numbers", 
    func: addPageNumbers, 
    multiple: false,
    params: [{ name: "position", type: "select", options: ["bottom-right", "bottom-center", "bottom-left"], default: "bottom-right" }],
    accept: "application/pdf"
  },
  { 
    icon: "🔎", 
    name: "OCR PDF", 
    desc: "Extract text from scanned PDF", 
    func: ocrPDF, 
    multiple: false,
    accept: "application/pdf,image/*",
    isOCR: true
  },
  { 
    icon: "🛠️", 
    name: "Repair PDF", 
    desc: "Fix corrupted PDF files", 
    func: repairPDF, 
    multiple: false,
    accept: "application/pdf"
  },
  { 
    icon: "⚖️", 
    name: "Compare PDF", 
    desc: "Compare two PDFs", 
    func: comparePDF, 
    multiple: true,
    accept: "application/pdf"
  },
  { 
    icon: "📄→📝", 
    name: "PDF to Word", 
    desc: "Convert to DOCX", 
    func: pdfToWord, 
    multiple: false,
    accept: "application/pdf"
  },
  { 
    icon: "📄→📊", 
    name: "PDF to PowerPoint", 
    desc: "Convert to PPTX", 
    func: pdfToPowerPoint, 
    multiple: false,
    accept: "application/pdf"
  },
  { 
    icon: "📄→📈", 
    name: "PDF to Excel", 
    desc: "Convert to XLSX", 
    func: pdfToExcel, 
    multiple: false,
    accept: "application/pdf"
  },
  { 
    icon: "📝→📄", 
    name: "Word to PDF", 
    desc: "Convert DOCX to PDF", 
    func: wordToPDF, 
    multiple: false,
    accept: ".docx,.doc"
  },
  { 
    icon: "📊→📄", 
    name: "PowerPoint to PDF", 
    desc: "Convert PPTX to PDF", 
    func: pptToPDF, 
    multiple: false,
    accept: ".pptx,.ppt"
  },
  { 
    icon: "📈→📄", 
    name: "Excel to PDF", 
    desc: "Convert XLSX to PDF", 
    func: excelToPDF, 
    multiple: false,
    accept: ".xlsx,.xls"
  },
  { 
    icon: "🖼️→📄", 
    name: "JPG to PDF", 
    desc: "Convert images to PDF", 
    func: jpgToPDF, 
    multiple: true,
    accept: "image/*"
  },
  { 
    icon: "📄→🖼️", 
    name: "PDF to JPG", 
    desc: "Export as images", 
    func: pdfToJPG, 
    multiple: false,
    accept: "application/pdf"
  },
];

const ToolCard = ({ tool, onRun }) => {
  const [files, setFiles] = useState([]);
  const [params, setParams] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const fileInputRef = useRef(null);
  const { loading, error, progress, success, runTool, reset } = usePDFTool();

  const handleFileChange = (selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    setFiles(fileArray);
    reset();
    setOcrResult(null);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
    }
  };

  const handleParamChange = (paramName, value) => {
    setParams(prev => ({ ...prev, [paramName]: value }));
  };

  const handleRun = async () => {
    if (!files || files.length === 0) {
      alert("Please select file(s) first");
      return;
    }

    // Validate required params
    if (tool.params) {
      for (const param of tool.params) {
        if (param.required && !params[param.name]) {
          alert(`${param.name} is required`);
          return;
        }
      }
    }

    try {
      const fileToProcess = tool.multiple ? files : files[0];
      const result = await runTool(tool.func, fileToProcess, params);
      
      // Handle OCR result
      if (tool.isOCR && result.text) {
        setOcrResult(result.text);
      }
    } catch (err) {
      console.error('Tool error:', err);
    }
  };

  const handleClear = () => {
    setFiles([]);
    setParams({});
    setOcrResult(null);
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 flex flex-col">
      {/* Icon and Title */}
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-gradient-to-br from-pink-100 to-purple-100 rounded-full w-14 h-14 flex items-center justify-center text-3xl">
          {tool.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg text-gray-800">{tool.name}</h3>
          <p className="text-gray-600 text-xs">{tool.desc}</p>
        </div>
      </div>

      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 mb-3 text-center transition-all cursor-pointer ${
          dragActive 
            ? 'border-pink-500 bg-pink-50' 
            : 'border-gray-300 hover:border-pink-400 hover:bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={tool.accept}
          multiple={tool.multiple}
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
        />
        
        {files.length > 0 ? (
          <div className="text-sm">
            <p className="text-green-600 font-semibold mb-1">
              ✓ {files.length} file{files.length > 1 ? 's' : ''} selected
            </p>
            <p className="text-gray-500 text-xs truncate">
              {files[0].name}
              {files.length > 1 && ` +${files.length - 1} more`}
            </p>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            <p className="font-medium">📁 Click or drag files here</p>
            <p className="text-xs mt-1">
              {tool.multiple ? 'Multiple files accepted' : 'Single file only'}
            </p>
          </div>
        )}
      </div>

      {/* Parameters */}
      {tool.params && (
        <div className="space-y-2 mb-3">
          {tool.params.map(param => (
            <div key={param.name}>
              <label className="text-xs font-medium text-gray-700 mb-1 block capitalize">
                {param.name}
                {param.required && <span className="text-red-500">*</span>}
              </label>
              
              {param.type === "select" ? (
                <select
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  value={params[param.name] || param.default || ''}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                >
                  {param.options.map(opt => (
                    <option key={opt} value={opt}>{opt}°</option>
                  ))}
                </select>
              ) : param.type === "range" ? (
                <div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={params[param.name] || param.default || param.min}
                    onChange={(e) => handleParamChange(param.name, e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 text-center mt-1">
                    {params[param.name] || param.default || param.min}
                  </p>
                </div>
              ) : (
                <input
                  type={param.type}
                  placeholder={param.placeholder}
                  value={params[param.name] || ''}
                  onChange={(e) => handleParamChange(param.name, e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {loading && (
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-center text-gray-600 mt-1">Processing... {progress}%</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 mb-3 text-center">
          <p className="text-green-700 text-sm font-medium">✓ Success!</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
          <p className="text-red-700 text-xs">{error}</p>
        </div>
      )}

      {/* OCR Result */}
      {ocrResult && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-blue-900 mb-2">Extracted Text:</p>
          <p className="text-xs text-gray-700 whitespace-pre-wrap">{ocrResult}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={handleRun}
          disabled={loading || files.length === 0}
          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold py-2.5 rounded-lg hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
        >
          {loading ? '⏳ Processing...' : '▶ Process'}
        </button>
        
        {files.length > 0 && (
          <button
            onClick={handleClear}
            disabled={loading}
            className="px-4 bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-all duration-200"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");

  const categories = [
    { id: "all", name: "All Tools" },
    { id: "edit", name: "Edit" },
    { id: "convert", name: "Convert" },
    { id: "optimize", name: "Optimize" },
    { id: "secure", name: "Secure" },
  ];

  const getCategoryForTool = (toolName) => {
    if (toolName.includes("to") || toolName.includes("→")) return "convert";
    if (["Merge PDF", "Split PDF", "Rotate PDF", "Crop PDF", "Organize PDF", "Page Numbers"].includes(toolName)) return "edit";
    if (["Compress PDF", "Repair PDF", "OCR PDF"].includes(toolName)) return "optimize";
    if (["Protect PDF", "Unlock PDF", "Watermark", "Redact PDF"].includes(toolName)) return "secure";
    return "edit";
  };

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = category === "all" || getCategoryForTool(tool.name) === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-4xl">📄</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              NixPdf
            </h1>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="text-gray-700 hover:text-pink-600 font-medium transition">Home</a>
            <a href="#" className="text-gray-700 hover:text-pink-600 font-medium transition">Features</a>
            <a href="#" className="text-gray-700 hover:text-pink-600 font-medium transition">About</a>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            All-in-One PDF Solution
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Edit, convert, compress, and secure your PDFs with ease. No registration required.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <input
              type="text"
              placeholder="🔍 Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent shadow-sm"
            />
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  category === cat.id
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredTools.map((tool, idx) => (
            <ToolCard key={idx} tool={tool} />
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">No tools found matching your search.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-md mt-20 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-gray-600">&copy; 2025 NixPdf. All rights reserved.</p>
          <p className="text-gray-500 text-sm mt-2">Free PDF tools for everyone</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;