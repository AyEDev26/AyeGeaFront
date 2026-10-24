import { version } from '../../package.json';

// Única fuente de versión y build ID (inyectado en compilación desde quasar.config.ts)
export const appVersion: string = version;
export const buildId: string = __BUILD_ID__;
export const appVersionLabel: string = `v${version} · ${__BUILD_ID__}`;
