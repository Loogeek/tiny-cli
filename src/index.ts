import { loadConfig } from 'unconfig';
import { getAllConfigs } from './config';
import { ExportConfig } from './types';
import { startOptimize } from './utils';

const { config } = await loadConfig<ExportConfig>({
  sources: [
    {
      files: 'tiny.config',
      extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json'],
    },
  ],
});

const configs = getAllConfigs(config);

startOptimize(configs, config?.APIKey);
