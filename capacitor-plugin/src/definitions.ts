export interface PulseEditorCapacitorPlugin {
  echo(options: { value: string }): Promise<{ value: string }>;
  startManageStorageIntent(): Promise<void>;
  isManageStoragePermissionGranted(): Promise<{ isGranted: boolean }>;
}
