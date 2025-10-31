// ============================================
// FILE: src/services/pdfService.js
// ============================================
import api from './api';

export const uploadPDF = async (feature, file, options = {}) => {
  const formData = new FormData();
  formData.append('pdf', file);

  // Add additional options based on feature
  if (options.pages) {
    formData.append('pages', options.pages);
  }
  if (options.degrees) {
    formData.append('degrees', options.degrees);
  }
  if (options.password) {
    formData.append('password', options.password);
  }
  if (options.text) {
    formData.append('text', options.text);
  }
  if (options.opacity) {
    formData.append('opacity', options.opacity);
  }

  const endpoint = getEndpointForFeature(feature);

  try {
    const response = await api.post(endpoint, formData, {
      responseType: 'blob',
    });

    // Download file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${feature}-${Date.now()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const mergePDFs = async (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('pdfs', file);
  });

  try {
    const response = await api.post('/merge', formData, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `merged-${Date.now()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  } catch (error) {
    throw error;
  }
};

export const getPDFInfo = async (file) => {
  const formData = new FormData();
  formData.append('pdf', file);

  try {
    const response = await api.post('/info', formData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

function getEndpointForFeature(feature) {
  const endpoints = {
    merge: '/merge',
    split: '/split',
    compress: '/compress',
    rotate: '/rotate',
    lock: '/protect',
    unlock: '/unlock',
    watermark: '/watermark',
    sign: '/sign',
    convert: '/convert-to-images',
  };

  return endpoints[feature] || '/compress';
}

export default {
  uploadPDF,
  mergePDFs,
  getPDFInfo,
};