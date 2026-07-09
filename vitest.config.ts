import { defineConfig } from 'vitest/config'

// Config própria do Vitest (tem prioridade sobre vite.config.ts): os testes
// cobrem funções puras do conselho e rodam direto no Node, sem plugin React.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
