import Anthropic from '@anthropic-ai/sdk'
import type { Anexo, Transporte, UsoTokens } from '../types'

// A lista de modelos vive em ./modelos (dados puros, sem SDK) para não puxar
// o @anthropic-ai/sdk para o bundle da home. Re-exportada por compatibilidade.
export { MODELOS_ANTHROPIC } from './modelos'

/** Timeout por chamada: um provedor travado (local/custom) nunca prende a
 *  reunião para sempre. Combinado com o signal do usuário via AbortSignal.any. */
const TIMEOUT_CHAMADA_MS = 120_000

function comTimeout(signal: AbortSignal | undefined): AbortSignal {
  const t = AbortSignal.timeout(TIMEOUT_CHAMADA_MS)
  return signal ? AbortSignal.any([signal, t]) : t
}

function reportaUso(onUsage: ((u: UsoTokens) => void) | undefined, usage: Anthropic.Usage | undefined) {
  if (!onUsage || !usage) return
  onUsage({
    entrada: usage.input_tokens ?? 0,
    saida: usage.output_tokens ?? 0,
    cache: usage.cache_read_input_tokens ?? undefined,
  })
}

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

/** Conteúdo multimodal: blocos de imagem/PDF antes do texto (ordem recomendada). */
function montaConteudo(user: string, anexos?: Anexo[]): string | Anthropic.ContentBlockParam[] {
  const midia = (anexos ?? []).filter((a) => a.tipo === 'imagem' || a.tipo === 'pdf')
  if (midia.length === 0) return user
  const blocos: Anthropic.ContentBlockParam[] = midia.map((a) =>
    a.tipo === 'pdf'
      ? {
          type: 'document' as const,
          source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: a.dados },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: a.mime as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif',
            data: a.dados,
          },
        },
  )
  return [...blocos, { type: 'text' as const, text: user }]
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
    async estruturada({ system, user, schema, signal, anexos, onUsage }) {
      try {
        const stream = client.messages.stream(
          {
            model: modelo,
            max_tokens: 12000,
            system,
            ...(thinking ? { thinking } : {}),
            output_config: { format: { type: 'json_schema', schema: schema as Record<string, unknown> } },
            messages: [{ role: 'user', content: montaConteudo(user, anexos) }],
          },
          { signal: comTimeout(signal) },
        )
        const mensagem = await stream.finalMessage()
        reportaUso(onUsage, mensagem.usage)
        return extraiTexto(mensagem)
      } catch (err) {
        throw traduzErro(err)
      }
    },

    async streamada({ system, user, onDelta, signal, anexos, onUsage }) {
      try {
        const stream = client.messages.stream(
          {
            model: modelo,
            max_tokens: 16000,
            system,
            ...(thinking ? { thinking } : {}),
            messages: [{ role: 'user', content: montaConteudo(user, anexos) }],
          },
          { signal: comTimeout(signal) },
        )
        stream.on('text', (delta) => onDelta(delta))
        const mensagem = await stream.finalMessage()
        reportaUso(onUsage, mensagem.usage)
        return extraiTexto(mensagem)
      } catch (err) {
        throw traduzErro(err)
      }
    },
  }
}
