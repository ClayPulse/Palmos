import { WebPlugin } from '@capacitor/core';

import type { PulseEditorCapacitorPlugin } from './definitions';

export class PulseEditorCapacitorWeb extends WebPlugin implements PulseEditorCapacitorPlugin {
  async echo(options: { value: string }): Promise<{ value: string }> {
    console.log('ECHO', options);
    return options;
  }

  async startManageStorageIntent(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async isManageStoragePermissionGranted(): Promise<{ isGranted: boolean }> {
    throw new Error('Method not implemented.');
  }
}
