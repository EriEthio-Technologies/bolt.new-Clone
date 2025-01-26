import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./test/setup.ts'],
        include: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
        coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'test/',
                '**/*.d.ts',
                '**/*.test.*',
                '**/*.config.*'
            ],
            lines: 90,
            functions: 90,
            branches: 90,
            statements: 90
        },
        globals: true
    },
}) 