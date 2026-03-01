export type TaskStatus = 'UPLOADED' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type FilterType = 'yolo' | 'grayscale' | 'blur' | 'canny' | 'pixelate' | 'invert' | 'sepia' | 'contrast';

export interface VideoTask {
  task_id: string;              // Было id
  status: TaskStatus;
  original_filename: string;    // Было filename
  filter_type?: FilterType | string; 
  original_file_url?: string;   // Было original_url / preview_url
  download_url?: string;        // Было result_url
  created_at: string;
}

export interface UploadResponse {
  task_id: string;
  upload_url: string;
}