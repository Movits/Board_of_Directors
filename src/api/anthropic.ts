import Anthropic from '@anthropic-ai/sdk'
import type { Transporte } from '../types'

export const MODELOS_ANTHROPIC = [
  { id: 'claude-opus-4-8', rotulo: 'Claude Opus 4.8', detalhe: 'máxima qualidade (~US$1–2 por reunião)' },
  { id: 'claude-sonnet-5', rotulo: 'Claude Sonnet 5', detalhe: 'equilíbrio (~US$0,30–0,60 por reunião)' },
  { id: 'claude-haiku-4-5', rotulo: 'Claude Haiku 4.5', detalhe: 'rápido e barato (~US$0,10 por reunião)' },
]

// Thinking adaptativo só é aceito nos modelos 4.6+ (Opus/Sonnet/Fable).
// Para Haiku e modelos personalizados desconhecidos, omitimos o parâmetro.
const PREFIXOS_ADAPTIVE = [
  'claude-opus-4-6',
  'claude-opus-4-7',
  'claude-opus-4-8',
  'claude-sonnet-4-6',
  'claude-sonnet-5',
  'claude-fable',
]

function suportaAdaptive(modelo: string): boolean {
  return PREFIXOS_ADAPTIVE.some((p) => modelo.startsWith(p))
}

function traduzErro(err: unknown): Error {
  if (err instanceof Anthropic.AuthenticationError) {
    return new Error('Chave de API da Anthropic inválida. Confira em Configurações.')
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return new Error('Sua chave da Anthropic não tem permissão para este modelo.')
  }
  if (err instanceof Anthropic.NotFoundError) {
    return new Error('Modelo não encontrado na API da Anthropic. Confira o nome do modelo.')
  }
  if (err instanceof Anthropic.RateLimitError) {
    return new Error('Limite de requisições da Anthropic atingido. Aguarde um instante.')
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new Error('Falha de conexão com a API da Anthropic. Verifique sua internet.')
  }
  if (err instanceof Anthropic.APIError) {
    return new Error(`Erro da API Anthropic (${err.status ?? '?'}): ${err.message}`)
  }
  return err instanceof Error ? err : new Error(String(err))
}

function extraiTexto(mensagem: Anthropic.Message): string {
  if (mensagem.stop_reason === 'refusal') {
    throw new Error('A API recusou esta solicitação por política de segurança.')
  }
  const texto = mensagem.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
  if (!texto) {
    throw new Error(
      mensagem.stop_reason === 'max_tokens'
        ? 'Resposta truncada por limite de tokens.'
        : 'A API retornou uma resposta vazia.',
    )
  }
  return texto
}

export function criaTransporteAnthropic(apiKey: string, modelo: string): Transporte {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
    maxRetries: 3,
  })
  const thinking = suportaAdaptive(modelo) ? ({ type: 'adaptive' } as const) : undefined

  return {
    async estruturada({ system, user, schema, signal }) {
      try {
        const stream = client.messages.stream(
          {
            model: modelo,
            max_tokens: 12000,
            system,
            ...(thinking ? { thinking } : {}),
            output_config: { format: { type: 'json_schema', schema: schema as Record<string, unknown> } },
            messages: [{ role: 'user', content: user }],
          },
          { signal },
        )
        return extraiTexto(await stream.finalMessage())
      } catch (err) {
        throw traduzErro(err)
      }
    },

    async streamada({ system, user, onDelta, signal }) {
      try {
        const stream = client.messages.stream(
          {
            model: modelo,
            max_tokens: 16000,
            system,
            ...(thinking ? { thinking } : {}),
            messages: [{ role: 'user', content: user }],
          },
          { signal },
        )
        stream.on('text', (delta) => onDelta(delta))
        return extraiTexto(await stream.finalMessage())
      } catch (err) {
        throw traduzErro(err)
      }
    },
  }
}
