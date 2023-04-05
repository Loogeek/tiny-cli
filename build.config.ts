import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['src/index', 'src/utils.ts', 'src/config.ts'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: true,
  },
});
