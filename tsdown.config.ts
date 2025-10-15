import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    treeshake: true,
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    outDir: 'dist',
    dts: true,
    clean: true,
    external: [
      'fs',
      'os',
      'tsx',
      'path',
      'tsdown',
      'dotenv',
      'crypto',
      'rollup',
      'esbuild',
      'edge.js',
      'nodemailer',
      'typescript',
      'chalk',
      'commander',
      /^@h3ravel\/.*/gi,
      /^node:.*/gi,
      /.*\/promises$/gi,
      'fs-readdir-recursive',
    ],
  },
])
