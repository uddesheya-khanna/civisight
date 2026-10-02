import {
  HealthResponse,
  AnalysisResult,
  ProgressResponse,
  InspectionType,
  ApiErrorResponse,
} from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export class ApiClientError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.details = details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errCode = `HTTP_${res.status}`;
    let errMsg = res.statusText || 'An unexpected error occurred.';
    let details: Record<string, unknown> | undefined = undefined;

    try {
      const errJson = (await res.json()) as ApiErrorResponse;
      if (errJson && errJson.error) {
        errCode = errJson.error.code || errCode;
        errMsg = errJson.error.message || errMsg;
        details = errJson.error.details;
      }
    } catch {
      // response was not JSON
    }

    throw new ApiClientError(errMsg, errCode, details);
  }
  return (await res.json()) as T;
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse<HealthResponse>(res);
  },

  async analyzeImage(
    file: File,
    inspectionType: InspectionType,
    clientRequestId?: string,
  ): Promise<AnalysisResult> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('inspection_type', inspectionType);
    if (clientRequestId) {
      formData.append('client_request_id', clientRequestId);
    }

    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<AnalysisResult>(res);
  },

  async getProgress(clientRequestId: string): Promise<ProgressResponse> {
    const res = await fetch(`${API_BASE}/api/progress/${encodeURIComponent(clientRequestId)}`);
    return handleResponse<ProgressResponse>(res);
  },

  async downloadReport(analysisId: string): Promise<Blob> {
    const res = await fetch(`${API_BASE}/api/report/${encodeURIComponent(analysisId)}`, {
      method: 'POST',
    });
    if (!res.ok) {
      return handleResponse<Blob>(res); // will throw ApiClientError
    }
    return await res.blob();
  },

  getFileUrl(analysisId: string, kind: 'original' | 'annotated'): string {
    return `${API_BASE}/api/files/${encodeURIComponent(analysisId)}/${kind}`;
  },
};
