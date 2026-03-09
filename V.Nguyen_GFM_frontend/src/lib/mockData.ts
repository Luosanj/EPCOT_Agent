export interface AnalysisResult {
  id: string;
  taskType: 'GEP' | 'EFP' | 'EAP';
  score: number;
  confidence: 'High' | 'Moderate' | 'Low';
  classification: string;
  region: {
    chromosome: string;
    start: number;
    end: number;
  };
  cellType: string;
  modelVersion: string;
  datasetVersion: string;
  runtime: string;
  jobId: string;
  createdAt: Date;
}

export interface ActiveJob {
  id: string;
  name: string;
  progress: number;
  status: 'running' | 'queued' | 'completed' | 'failed';
  taskType: 'GEP' | 'EFP' | 'EAP';
  startedAt: Date;
}

export interface NotebookPage {
  id: string;
  title: string;
  blocks: NotebookBlock[];
  versions: NotebookVersion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotebookBlock {
  id: string;
  type: 'text' | 'result' | 'table' | 'chart' | 'divider';
  content: string;
  resultData?: AnalysisResult;
}

export interface NotebookVersion {
  id: string;
  version: number;
  label: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}