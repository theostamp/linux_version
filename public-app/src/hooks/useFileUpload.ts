import { useState, useCallback } from 'react';

interface FileUploadOptions {
  maxSize?: number; // in MB
  allowedTypes?: string[];
  maxFiles?: number;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface FileUploadResult {
  success: boolean;
  file_path?: string;
  file_name?: string;
  file_size?: number;
  error?: string;
}

export const useFileUpload = (options: FileUploadOptions = {}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    maxSize = 10, // 10MB default
    allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx'],
    maxFiles = 5
  } = options;

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      return `Το αρχείο "${file.name}" είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${maxSize}MB`;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      return `Το αρχείο "${file.name}" δεν είναι υποστηριζόμενος τύπος. Επιτρεπόμενοι τύποι: ${allowedTypes.join(', ')}`;
    }

    return null;
  }, [maxSize, allowedTypes]);

  const uploadFile = useCallback(async (
    file: File,
    endpoint: string,
    additionalData?: Record<string, any>
  ): Promise<FileUploadResult> => {
    setIsUploading(true);
    setProgress(null);
    setError(null);

    try {
      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Add additional data
      if (additionalData) {
        Object.entries(additionalData).forEach(([key, value]) => {
          formData.append(key, value.toString());
        });
      }

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round((event.loaded / event.total) * 100);
            setProgress({
              loaded: event.loaded,
              total: event.total,
              percentage
            });
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve({
                success: true,
                file_path: response.file_path,
                file_name: response.file_name,
                file_size: response.file_size
              });
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error || 'Upload failed'));
            } catch (e) {
              reject(new Error(`Upload failed with status: ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload was cancelled'));
        });

        // Send request
        xhr.open('POST', endpoint);
        xhr.send(formData);
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  }, [validateFile]);

  const uploadMultipleFiles = useCallback(async (
    files: File[],
    endpoint: string,
    additionalData?: Record<string, any>
  ): Promise<FileUploadResult[]> => {
    if (files.length > maxFiles) {
      const error = `Πάρα πολλά αρχεία. Μέγιστο αριθμό: ${maxFiles}`;
      setError(error);
      return files.map(() => ({ success: false, error }));
    }

    const results: FileUploadResult[] = [];

    for (const file of files) {
      const result = await uploadFile(file, endpoint, additionalData);
      results.push(result);

      // If one file fails, we might want to stop or continue based on requirements
      if (!result.success) {
        break;
      }
    }

    return results;
  }, [uploadFile, maxFiles]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetProgress = useCallback(() => {
    setProgress(null);
  }, []);

  return {
    // State
    isUploading,
    progress,
    error,

    // Actions
    uploadFile,
    uploadMultipleFiles,
    validateFile,
    clearError,
    resetProgress,

    // Options
    maxSize,
    allowedTypes,
    maxFiles
  };
};
