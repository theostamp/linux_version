import { apiClient } from '../apiClient';

export interface DocumentUpload {
    id: number;
    building: {
        id: number;
        name: string;
    };
    uploaded_by: {
        id: number;
        email: string;
        first_name: string;
        last_name: string;
    };
    original_file_url: string;
    file_url: string | null;
    status: 'pending' | 'processing' | 'awaiting_confirmation' | 'completed' | 'failed';
    extracted_data: Record<string, any> | null;
    created_at: string;
    updated_at: string;
    error_message: string | null;
    original_filename: string;
    file_size: number;
    mime_type: string;
    confidence_score: number | null;
}

export interface DocumentUploadResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: DocumentUpload[];
}

export interface UploadDocumentRequest {
    file: File;
    building: number;
}

export interface ConfirmDocumentRequest {
    [key: string]: any;
}

// API Functions
export const getDocumentUploads = async (page: number = 1): Promise<DocumentUploadResponse> => {
    const response = await apiClient.get(`/parser/uploads/?page=${page}`);
    return response.data;
};

export const getDocumentUpload = async (id: string | number): Promise<DocumentUpload> => {
    const response = await apiClient.get(`/parser/uploads/${id}/`);
    return response.data;
};

export const uploadDocument = async (file: File, buildingId: number): Promise<DocumentUpload> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('building', buildingId.toString());

    const response = await apiClient.post('/parser/uploads/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const processDocument = async (id: string | number): Promise<{ message: string }> => {
    const response = await apiClient.post(`/parser/uploads/${id}/process/`);
    return response.data;
};

export const confirmDocument = async (id: string | number, data: ConfirmDocumentRequest): Promise<{ message: string }> => {
    const response = await apiClient.post(`/parser/uploads/${id}/confirm/`, data);
    return response.data;
};

export const deleteDocument = async (id: string | number): Promise<void> => {
    await apiClient.delete(`/parser/uploads/${id}/`);
};

export const bulkDeleteDocuments = async (ids: number[]): Promise<{ message: string; count: number }> => {
    const response = await apiClient.post('/parser/uploads/bulk_delete/', { ids }, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response.data;
};

export const cleanupStaleDocuments = async (hours: number = 24): Promise<{ message: string; count: number }> => {
    const response = await apiClient.post('/parser/uploads/cleanup_stale/', { hours }, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response.data;
};

export const retryDocumentProcessing = async (id: string | number): Promise<{ message: string; document_id: number }> => {
    const response = await apiClient.post(`/parser/uploads/${id}/retry_processing/`, {}, {
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return response.data;
};

export const downloadDocument = async (id: string | number, filename: string): Promise<void> => {
    const response = await apiClient.get(`/parser/uploads/${id}/download/`, {
        responseType: 'blob',
    });

    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};
