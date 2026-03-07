import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerMSIX } from '@electron-forge/maker-msix';
import { VitePlugin } from '@electron-forge/plugin-vite';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true
  },
  makers: [new MakerMSIX({})],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/index.ts', config: 'electron.vite.config.ts', target: 'main' },
        { entry: 'src/preload/index.ts', config: 'electron.vite.config.ts', target: 'preload' }
      ],
      renderer: [{ name: 'main_window', config: 'electron.vite.config.ts' }]
    })
  ]
};

export default config;
