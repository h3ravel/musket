import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    exports: true,
    outExtensions: (e) => {
      return ({
        js: e.format === 'es' ? '.js' : '.cjs',
        dts: '.d.ts'
      })
    },
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
