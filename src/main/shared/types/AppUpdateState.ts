export type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error';

export interface AppUpdateState {
  status: AppUpdateStatus;
  version: string | null;
  releaseName: string | null;
  releaseNotes: string | null;
  percent: number | null;
  transferredBytes: number | null;
  totalBytes: number | null;
  bytesPerSecond: number | null;
  error: string | null;
}
