// Listas de modelos por provedor — dados PUROS, sem importar os SDKs.
// Isolar isto de anthropic.ts/openai.ts é o que permite o code-split: a home
// e o modo demo não baixam os SDKs (@anthropic-ai/sdk, openai) — eles só
// carregam via import() dinâmico quando uma reunião REAL é convocada.

export interface InfoModelo {
  id: string
  rotulo: string
  detalhe: string
}

export const MODELOS_ANTHROPIC: InfoModelo[] = [
  { id: 'claude-opus-4-8', rotulo: 'Claude Opus 4.8', detalhe: 'máxima qualidade (~US$1–2 por reunião)' },
  { id: 'claude-sonnet-5', rotulo: 'Claude Sonnet 5', detalhe: 'equilíbrio (~US$0,30–0,60 por reunião)' },
  { id: 'claude-haiku-4-5', rotulo: 'Claude Haiku 4.5', detalhe: 'rápido e barato (~US$0,10 por reunião)' },
]

export const MODELOS_OPENAI: InfoModelo[] = [
  { id: 'gpt-5.5', rotulo: 'GPT-5.5', detalhe: 'modelo mais capaz da OpenAI' },
  { id: 'gpt-5.4', rotulo: 'GPT-5.4', detalhe: 'equilíbrio entre qualidade e custo' },
  { id: 'gpt-5.4-mini', rotulo: 'GPT-5.4 mini', detalhe: 'rápido e barato' },
]
