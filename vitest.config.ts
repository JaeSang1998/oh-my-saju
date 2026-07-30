import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: 'saju-engine/advanced', replacement: resolve('src/advanced.ts') },
      { find: 'saju-engine/timing', replacement: resolve('src/timing.ts') },
      { find: 'saju-engine', replacement: resolve('src/index.ts') },
    ],
  },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // 실행 코드가 없는 타입 정의 파일과 테스트 파일은 커버리지 분모에서 제외한다.
      exclude: ['src/**/*.test.ts', 'src/**/types.ts'],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 95,
        lines: 90,
      },
    },
  },
});
