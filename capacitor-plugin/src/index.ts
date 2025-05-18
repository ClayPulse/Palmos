import { registerPlugin } from '@capacitor/core';

import type { PulseEditorCapacitorPlugin } from './definitions';

const PulseEditorCapacitor = registerPlugin<PulseEditorCapacitorPlugin>('PulseEditorCapacitor', {
  web: () => import('./web').then((m) => new m.PulseEditorCapacitorWeb()),
});

export * from './definitions';
export { PulseEditorCapacitor };
