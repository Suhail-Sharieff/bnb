import React, { useState, useRef } from 'react';
import { Upload, X, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useFileUpload } from '../hooks/useApi';
import { cn } from '../lib/utils';

interface FileUploadProps {
  onUploadSuccess?: (file: any) => void;
  onUploadError?: (error: string) => void;
  allowedTypes?: string[];
  maxSizeInMB?: number;
  folder?: string;
  multiple?: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  maxSizeInMB = 10,
  folder = 'documents',
  multiple = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadFile, uploadProgress, isUploading, uploadError, uploadedFile, resetUpload } = useFileUpload();

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`;
    }
    
    if (file.size > maxSizeInMB * 1024 * 1024) {
      return `File size exceeds ${maxSizeInMB}MB limit`;
    }
    
    return null;
  };

  const handleFiles = (files: FileList) => {
    const fileArray = Array.from(files);
    
    if (!multiple && fileArray.length > 1) {
      alert('Only one file is allowed');
      return;
    }
    
    const validFiles: File[] = [];
    const errors: string[] = [];
    
    fileArray.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });
    
    if (errors.length > 0) {
      alert('File validation errors:\n' + errors.join('\n'));
      return;
    }
    
    setSelectedFiles(validFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    try {
      resetUpload();
      
      for (const file of selectedFiles) {
        await uploadFile(file, folder, description);
      }
      
      onUploadSuccess?.(uploadedFile);
      setSelectedFiles([]);
      setDescription('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      onUploadError?.(errorMessage);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-semibold text-gray-50 mb-4">Upload Budget Documents</h3>
      
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          dragActive ? "border-blue-400 bg-blue-500/10" : "border-gray-600 hover:border-gray-500",
          isUploading && "pointer-events-none opacity-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={allowedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="space-y-4">
            <Loader className="w-12 h-12 text-blue-400 mx-auto animate-spin" />
            <div className="space-y-2">
              <p className="text-gray-300">Uploading...</p>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400">{uploadProgress}% complete</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-gray-300 font-medium">Drop files here or click to browse</p>
              <p className="text-sm text-gray-500 mt-1">
                Max size: {maxSizeInMB}MB • Supported: PDF, Excel, CSV, Images
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Description Input */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description for this document..."
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={2}
          disabled={isUploading}
        />
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Selected Files:</h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded-lg">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-gray-200 font-medium">{file.name}</p>
                  <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="text-red-400 hover:text-red-300 transition-colors"
                disabled={isUploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className={cn(
            "w-full mt-4 py-2 px-4 rounded-lg font-medium transition-colors",
            isUploading
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          )}
        >
          {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
        </button>
      )}

      {/* Upload Status */}
      {uploadError && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-500 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{uploadError}</p>
        </div>
      )}

      {uploadedFile && (
        <div className="mt-4 p-3 bg-green-900/20 border border-green-500 rounded-lg flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-300 text-sm font-medium">File uploaded successfully!</p>
            {uploadedFile.fileUrl && (
              <a 
                href={uploadedFile.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                View uploaded file
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;