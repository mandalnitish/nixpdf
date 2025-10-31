// src/hooks/usePDFTool.js
import { useState, useCallback } from 'react';

export const usePDFTool = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);

  const runTool = useCallback(async (toolFunc, files, params = {}) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setSuccess(false);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await toolFunc(files, params);
      
      clearInterval(progressInterval);
      setProgress(100);
      setSuccess(true);
      
      // Reset success after 3 seconds
      setTimeout(() => {
        setSuccess(false);
        setProgress(0);
      }, 3000);
      
      return result;
    } catch (err) {
      setError(err.message || 'An error occurred');
      setProgress(0);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setProgress(0);
    setSuccess(false);
  }, []);

  return {
    loading,
    error,
    progress,
    success,
    runTool,
    reset
  };
};