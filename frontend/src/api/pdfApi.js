// src/api/pdfApi.js
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "https://nixpdf-backend.onrender.com";

// Enhanced upload and download with better error handling and filename extraction
const uploadAndDownload = async (endpoint, files, extra = {}) => {
  try {
    const formData = new FormData();

    // Append files with appropriate field names
    if (Array.isArray(files)) {
      files.forEach(f => {
        const fieldName = 
          endpoint.includes("merge") ||
          endpoint.includes("compare") ||
          endpoint.includes("images-to-pdf")
            ? "files"
            : "file";
        formData.append(fieldName, f);
      });
    } else {
      formData.append("file", files);
    }

    // Append extra params
    for (const key in extra) {
      if (extra[key] !== undefined && extra[key] !== null) {
        formData.append(key, extra[key]);
      }
    }

    const response = await axios.post(`${API_URL}/${endpoint}`, formData, {
      responseType: endpoint === "ocr" ? "json" : "blob",
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    });

    // OCR returns JSON with text
    if (endpoint === "ocr") {
      return response.data;
    }

    // Handle file download
    const contentDisposition = response.headers["content-disposition"];
    let filename = "output.pdf";
    
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches != null && matches[1]) {
        filename = matches[1].replace(/['"]/g, '');
      }
    }

    // Handle different file types
    const contentType = response.headers["content-type"];
    if (contentType && contentType.includes("zip")) {
      filename = filename.replace(".pdf", ".zip");
    }

    // Create blob and download
    const blob = new Blob([response.data], { 
      type: response.headers['content-type'] || 'application/octet-stream' 
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);

    return { success: true, filename };
  } catch (error) {
    // Enhanced error handling
    if (error.response) {
      // Server responded with error
      if (error.response.data instanceof Blob) {
        // Try to parse blob as JSON for error message
        const text = await error.response.data.text();
        try {
          const errorData = JSON.parse(text);
          throw new Error(errorData.error || `Server error: ${error.response.status}`);
        } catch {
          throw new Error(`Server error: ${error.response.status}`);
        }
      } else if (error.response.data?.error) {
        throw new Error(error.response.data.error);
      } else {
        throw new Error(`Request failed: ${error.response.status}`);
      }
    } else if (error.request) {
      // Request made but no response
      throw new Error("No response from server. Please check if the backend is running.");
    } else {
      // Something else happened
      throw new Error(error.message || "An unexpected error occurred");
    }
  }
};

// ---------------- PDF Tools ----------------
export const mergePDFs = (files, params) => {
  if (!files || files.length < 2) {
    throw new Error("Please select at least 2 PDF files to merge");
  }
  return uploadAndDownload("merge", files, params);
};

export const splitPDF = (file, params) => {
  return uploadAndDownload("split", file, params);
};

export const compressPDF = (file) => {
  return uploadAndDownload("compress", file);
};

export const rotatePDF = (file, params = {}) => {
  const degrees = params.degrees || "90";
  return uploadAndDownload("rotate", file, { degrees });
};

export const watermarkPDF = (file, params = {}) => {
  const text = params.text || "CONFIDENTIAL";
  const opacity = params.opacity || "0.3";
  return uploadAndDownload("watermark", file, { text, opacity });
};

export const protectPDF = (file, params = {}) => {
  if (!params.password) {
    throw new Error("Password is required");
  }
  return uploadAndDownload("protect", file, { password: params.password });
};

export const unlockPDF = (file, params = {}) => {
  if (!params.password) {
    throw new Error("Password is required");
  }
  return uploadAndDownload("unlock", file, { password: params.password });
};

export const editPDF = (file, params) => {
  return uploadAndDownload("edit", file, params);
};

export const signPDF = (file, params) => {
  return uploadAndDownload("sign", file, params);
};

export const redactPDF = (file, params) => {
  return uploadAndDownload("redact", file, params);
};

export const cropPDF = (file, params) => {
  return uploadAndDownload("crop", file, params);
};

export const comparePDF = (files) => {
  if (!files || files.length !== 2) {
    throw new Error("Please select exactly 2 PDF files to compare");
  }
  return uploadAndDownload("compare", files);
};

export const addPageNumbers = (file, params = {}) => {
  const position = params.position || "bottom-right";
  return uploadAndDownload("page-numbers", file, { position });
};

export const organizePDF = (file, params) => {
  return uploadAndDownload("organize", file, params);
};

export const ocrPDF = async (file) => {
  return uploadAndDownload("ocr", file);
};

export const repairPDF = (file) => {
  return uploadAndDownload("repair", file);
};

// ---------------- PDF ↔ Office ----------------
export const officeToPDF = (file) => {
  return uploadAndDownload("office-to-pdf", file);
};

export const wordToPDF = (file) => {
  return uploadAndDownload("office-to-pdf", file);
};

export const pptToPDF = (file) => {
  return uploadAndDownload("office-to-pdf", file);
};

export const excelToPDF = (file) => {
  return uploadAndDownload("office-to-pdf", file);
};

export const pdfToWord = (file) => {
  return uploadAndDownload("pdf-to-word", file);
};

export const pdfToPowerPoint = (file) => {
  return uploadAndDownload("pdf-to-ppt", file);
};

export const pdfToExcel = (file) => {
  return uploadAndDownload("pdf-to-excel", file);
};

// ---------------- PDF ↔ Images ----------------
export const imagesToPDF = (files) => {
  if (!files || files.length === 0) {
    throw new Error("Please select at least one image");
  }
  return uploadAndDownload("images-to-pdf", files);
};

export const jpgToPDF = (files) => {
  if (!files || files.length === 0) {
    throw new Error("Please select at least one image");
  }
  return uploadAndDownload("images-to-pdf", files);
};

export const pdfToImages = (file) => {
  return uploadAndDownload("pdf-to-images", file);
};

export const pdfToJPG = (file) => {
  return uploadAndDownload("pdf-to-images", file);
};

// Health check
export const checkHealth = async () => {
  try {
    const response = await axios.get(`${API_URL}/health`);
    return response.data;
  } catch (error) {
    throw new Error("Backend health check failed");
  }
};