import type { ExportConfig } from './types';

export const defineConfig = (config: ExportConfig) => config;

export const getAllConfigs = (config: ExportConfig) => config?.configs;
