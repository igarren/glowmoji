import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM + CJS for npm consumers
  {
    entry: {
      index: 'src/index.ts',
      react: 'src/react.tsx',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    external: ['react', 'react/jsx-runtime'],
  },
  // IIFE bundle for CDN / script tag usage
  {
    entry: { 'glowmoji': 'src/index.ts' },
    outExtension: () => ({ js: '.global.js' }),
    format: ['iife'],
    globalName: '_glowmoji',
    footer: { js: 'window.glowmoji=_glowmoji.glowmoji;window.glowmoji.mount=_glowmoji.mount;window.glowmoji.blink=_glowmoji.blink;window.glowmoji.autoBlink=_glowmoji.autoBlink;window.glowmoji.getBorderRadius=_glowmoji.getBorderRadius;' },
    minify: true,
    dts: false,
  },
]);
