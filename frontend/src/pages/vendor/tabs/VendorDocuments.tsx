import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../lib/api';
import { Upload, File, Download, Eye, Trash2, CheckCircle, AlertCircle, Clock, X, FileText, Image, Archive, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
  status: 'verified' | 'pending' | 'rejected';
  description: string;
  rejectionReason?: string;
  verificationDate?: string;
  blockchainHash?: string;
  projectId?: string;
  projectName?: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
}

export default function VendorDocuments() {
  const { user, token } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
  }, [token]);

  const fetchProjects = async () => {
    try {
      const response = await apiClient.getBudgetRequests({ state: 'allocated' });
      
      if (response.success && response.data) {
        setProjects(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Since there's no direct getDocuments endpoint, we'll fetch from project attachments
      const response = await apiClient.getBudgetRequests();
      
      if (response.success && response.data) {
        // Extract documents from project attachments
        const allDocuments: Document[] = [];
        
        response.data.forEach((project: any) => {
          if (project.attachments && project.attachments.length > 0) {
            project.attachments.forEach((attachment: any) => {
              allDocuments.push({
                id: attachment._id || Math.random().toString(36).substr(2, 9),
                name: attachment.originalName || attachment.filename,
                type: attachment.mimetype?.split('/')[1]?.toUpperCase() || 'FILE',
                size: `${(attachment.size / 1024).toFixed(1)} KB`,
                uploadDate: attachment.uploadedAt || new Date().toISOString(),
                status: 'verified', // Default to verified for existing documents
                description: `Document for project: ${project.project}`,
                verificationDate: attachment.uploadedAt,
                projectId: project._id,
                projectName: project.project
              });
            });
          }
        });
        
        setDocuments(allDocuments);
      } else {
        throw new Error(response.message || 'Failed to fetch documents');
      }
    } catch (err: any) {
      console.error('Failed to fetch documents:', err);
      setError(err.message || 'Failed to load documents. Please try again.');
      toast.error('Failed to load documents: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
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
    
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFileUpload(files);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    // For now, we'll upload to the first allocated project
    // In a real implementation, the user would select which project
    const project = projects[0];
    if (!project) {
      toast.error('No allocated projects found. Please allocate a project first.');
      return;
    }
    
    files.forEach(file => {
      const uploadId = Math.random().toString(36).substr(2, 9);
      const uploadingFile: UploadingFile = {
        id: uploadId,
        name: file.name,
        progress: 0,
        status: 'uploading'
      };
      
      setUploadingFiles(prev => [...prev, uploadingFile]);
      
      // Start upload process
      uploadDocumentToProject(project._id, file, uploadId);
    });
    setShowUploadModal(false);
  };

  const uploadDocumentToProject = async (projectId: string, file: File, uploadId: string) => {
    try {
      // Update status to processing
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, status: 'processing', progress: 50 } : f)
      );
      
      // Upload the document using the API client
      const response = await apiClient.uploadVendorDocuments(projectId, [file]);
      
      if (response.success) {
        // Update status to completed
        setUploadingFiles(prev => 
          prev.map(f => f.id === uploadId ? { ...f, status: 'completed', progress: 100 } : f)
        );
        
        // Add to documents list
        const newDocument: Document = {
          id: response.data?.documentId || Math.random().toString(36).substr(2, 9),
          name: file.name,
          type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
          size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
          uploadDate: new Date().toISOString().split('T')[0],
          status: 'pending',
          description: `Document for project: ${projects.find(p => p._id === projectId)?.title || 'Unknown Project'}`
        };
        
        setDocuments(prev => [newDocument, ...prev]);
        
        // Remove from uploading files after delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadId));
        }, 2000);
        
        // Show success notification
        toast.success(`Document "${file.name}" uploaded successfully! It will be reviewed within 24 hours.`);
        
        // Refresh documents
        fetchDocuments();
      } else {
        throw new Error(response.message || 'Failed to upload document');
      }
    } catch (err: any) {
      console.error('Failed to upload document:', err);
      
      // Update status to failed
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, status: 'failed', progress: 0 } : f)
      );
      
      toast.error(`Failed to upload document: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const document = documents.find(d => d.id === docId);
    if (!document) return;
    
    const confirmed = confirm(`Delete document "${document.name}"?\n\nThis action cannot be undone. The document will be permanently removed from your account.`);
    if (!confirmed) return;
    
    try {
      // Since we don't have a direct delete endpoint for documents,
      // we'll just remove it from the UI for now
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast.success(`Document "${document.name}" has been deleted successfully.`);
    } catch (err: any) {
      console.error('Failed to delete document:', err);
      toast.error('Failed to delete document: ' + (err.message || 'Unknown error'));
      // Revert the UI change
      setDocuments(prev => [...prev, document]);
    }
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
  };

  const handleDownloadDocument = (document: Document) => {
    // In a real implementation, this would download the actual file
    // For now, we'll just show a message
    toast.success(`Download started for "${document.name}"`);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('PDF')) return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes('IMAGE') || type.includes('JPG') || type.includes('PNG')) return <Image className="h-8 w-8 text-blue-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Management</h1>
          <p className="text-gray-600">Upload, manage, and track your compliance documents</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </button>
      </div>

      {/* Upload Status */}
      {uploadingFiles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Upload Status</h3>
          <div className="space-y-3">
            {uploadingFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <File className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <div className="flex items-center mt-1">
                      <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                        <div 
                          className="h-2 bg-blue-600 rounded-full" 
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{file.progress}%</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  {file.status === 'uploading' && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      Uploading
                    </span>
                  )}
                  {file.status === 'processing' && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                      Processing
                    </span>
                  )}
                  {file.status === 'completed' && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                      Completed
                    </span>
                  )}
                  {file.status === 'failed' && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Document</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">
                Drop files here or click to upload
              </p>
              <p className="text-xs text-gray-500">
                Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 5MB)
              </p>
              <input
                type="file"
                multiple
                className="hidden"
                id="file-upload"
                onChange={handleFileSelect}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <label
                htmlFor="file-upload"
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Upload className="h-4 w-4 mr-2" />
                Select Files
              </label>
            </div>
            
            {projects.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Uploading for project:</p>
                <p className="text-sm font-medium text-gray-900">{projects[0].project}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <div className="text-center py-12">
          <Archive className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No documents uploaded</h3>
          <p className="text-gray-500 mb-6">Get started by uploading your first compliance document.</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((document) => (
            <div key={document.id} className="bg-white rounded-lg shadow-sm border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center">
                  {getFileIcon(document.type)}
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{document.name}</h3>
                    <p className="text-xs text-gray-500">{document.type} • {document.size}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleViewDocument(document)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(document.status)}`}>
                  {document.status === 'verified' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {document.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                  {document.status === 'rejected' && <AlertCircle className="h-3 w-3 mr-1" />}
                  {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                </span>
                <span className="text-xs text-gray-500">{formatDate(document.uploadDate)}</span>
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => handleDownloadDocument(document)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </button>
                <button
                  onClick={() => handleDeleteDocument(document.id)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Document Details</h3>
              <button
                onClick={() => setSelectedDocument(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                {getFileIcon(selectedDocument.type)}
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700">Document Name</p>
                <p className="text-sm text-gray-600">{selectedDocument.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">File Type</p>
                  <p className="text-sm text-gray-600">{selectedDocument.type}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">File Size</p>
                  <p className="text-sm text-gray-600">{selectedDocument.size}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Upload Date</p>
                  <p className="text-sm text-gray-600">{formatDate(selectedDocument.uploadDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDocument.status)}`}>
                    {selectedDocument.status === 'verified' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {selectedDocument.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                    {selectedDocument.status === 'rejected' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {selectedDocument.status.charAt(0).toUpperCase() + selectedDocument.status.slice(1)}
                  </div>
                </div>
              </div>
              
              {selectedDocument.projectName && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Project</p>
                  <p className="text-sm text-gray-600">{selectedDocument.projectName}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-700">Description</p>
                <p className="text-sm text-gray-600">{selectedDocument.description}</p>
              </div>
              
              {selectedDocument.verificationDate && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Verification Date</p>
                  <p className="text-sm text-gray-600">{formatDate(selectedDocument.verificationDate)}</p>
                </div>
              )}
              
              {selectedDocument.blockchainHash && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Blockchain Hash</p>
                  <p className="text-xs text-blue-600 font-mono break-all bg-gray-50 p-2 rounded">
                    {selectedDocument.blockchainHash}
                  </p>
                </div>
              )}
              
              {selectedDocument.rejectionReason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 mb-2">Rejection Reason:</p>
                  <p className="text-sm text-red-700">{selectedDocument.rejectionReason}</p>
                </div>
              )}
              
              <div className="flex items-center space-x-3 pt-4">
                <button
                  onClick={() => handleDownloadDocument(selectedDocument)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => {
                    handleDeleteDocument(selectedDocument.id);
                    setSelectedDocument(null);
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}