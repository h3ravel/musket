import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  } as never,
  test: {
    passWithNoTests: true,
    pool: 'threads',
    name: 'generic',
    environment: 'node',
    root: './',
    include: ['tests/*.{test,spec}.?(c|m)[jt]s?(x)'],
    watchTriggerPatterns: [
      {
        pattern: /^tests\/(Commands|Xcc)\/(.*)\.(ts|tsx)$/,
        testsToRun: () => `./tests/command.test.ts`,
      },
    ],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*', '**/.h3ravel/**'],
    }
  }
})
