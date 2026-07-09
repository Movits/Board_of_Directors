import OpenAI from 'openai'
import type { Anexo, Transporte, UsoTokens } from '../types'

/** Timeout por chamada: um provedor local/custom travado não prende a reunião. */
const TIMEOUT_CHAMADA_MS = 120_000

function comTimeout(signal: AbortSignal | undefined): AbortSignal {
  const t = AbortSignal.timeout(TIMEOUT_CHAMADA_MS)
  return signal ? AbortSignal.any([signal, t]) : t
}

function reportaUso(
  onUsage: ((u: UsoTokens) => void) | undefined,
  usage: OpenAI.Completions.CompletionUsage | undefined | null,
) {
  if (!onUsage || !usage) return
  onUsage({
    entrada: usage.prompt_tokens ?? 0,
    saida: usage.completion_tokens ?? 0,
    cache: usage.prompt_tokens_details?.cached_tokens ?? undefined,
  })
}

export const MODELOS_OPENAI = [
  { id: 'gpt-5.5', rotulo: 'GPT-5.5', detalhe: 'modelo mais capaz da OpenAI' },
  { id: 'gpt-5.4', rotulo: 'GPT-5.4', detalhe: 'equilíbrio entre qualidade e custo' },
  { id: 'gpt-5.4-mini', rotulo: 'GPT-5.4 mini', detalhe: 'rápido e barato' },
]

function traduzErro(err: unknown): Error {
  if (err instanceof OpenAI.AuthenticationError) {
    return new Error('Chave de API inválida para esta API. Confira em Configurações.')
  }
  if (err instanceof OpenAI.PermissionDeniedError) {
    return new Error('Sua chave não tem permissão para este modelo.')
  }
  if (err instanceof OpenAI.NotFoundError) {
    return new Error('Modelo ou endpoint não encontrado. Confira o nome do modelo e a Base URL.')
  }
  if (err instanceof OpenAI.RateLimitError) {
    return new Error('Limite de requisições da API atingido. Aguarde um instante.')
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return new Error(
      'Falha de conexão com a API. Verifique sua internet, a Base URL e se a API aceita chamadas do navegador (CORS — para Ollama local, inicie com OLLAMA_ORIGINS).',
    )
  }
  if (err instanceof OpenAI.APIError) {
    return new Error(`Erro da API (${err.status ?? '?'}): ${err.message}`)
  }
  return err instanceof Error ? err : new Error(String(err))
}

/** Conteúdo multimodal: imagens como data URL (PDFs são bloqueados na UI —
 *  o chat/completions não os aceita; só o provedor Claude lê PDF nativamente). */
function montaConteudo(
  user: string,
  anexos?: Anexo[],
): string | OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  const imagens = (anexos ?? []).filter((a) => a.tipo === 'imagem')
  if (imagens.length === 0) return user
  return [
    ...imagens.map((a) => ({
      type: 'image_url' as const,
      image_url: { url: `data:${a.mime};base64,${a.dados}` },
    })),
    { type: 'text' as const, text: user },
  ]
}

/** Isola o objeto JSON de respostas que vierem com cercas de markdown ou texto extra. */
function extraiJson(texto: string): string {
  const semCercas = texto.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  const inicio = semCercas.indexOf('{')
  const fim = semCercas.lastIndexOf('}')
  if (inicio >= 0 && fim > inicio) return semCercas.slice(inicio, fim + 1)
  return semCercas.trim()
}

interface Opcoes {
  apiKey: string
  modelo: string
  baseUrl?: string
  /** Modo compatibilidade (Ollama, LM Studio, OpenRouter…): usa max_tokens e
   *  cai para instrução de JSON em texto quando a API não suporta json_schema. */
  compat?: boolean
}

export function criaTransporteOpenai({ apiKey, modelo, baseUrl, compat = false }: Opcoes): Transporte {
  const client = new OpenAI({
    // APIs locais como o Ollama não exigem chave, mas o SDK exige uma string
    apiKey: apiKey || 'sem-chave',
    dangerouslyAllowBrowser: true,
    maxRetries: 3,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  })

  // Alguns servidores compatíveis não aceitam max_completion_tokens (mais novo)
  const limite = (n: number) => (compat ? { max_tokens: n } : { max_completion_tokens: n })

  // Uma vez detectado que a API não suporta json_schema, usa sempre o fallback.
  let usaFallbackJson = false

  const chamadaEstruturada = async (
    system: string,
    user: string,
    schema: Record<string, unknown>,
    signal: AbortSignal | undefined,
    comSchema: boolean,
    anexos?: Anexo[],
    onUsage?: (u: UsoTokens) => void,
  ) => {
    const pedidoJson = comSchema
      ? {
          response_format: {
            type: 'json_schema' as const,
            json_schema: { name: 'resposta_conselheiro', strict: true, schema },
          },
        }
      : {}
    const sufixo = comSchema
      ? ''
      : `\n\nIMPORTANTE: responda APENAS com um objeto JSON válido (sem markdown, sem texto antes ou depois) seguindo exatamente este JSON Schema:\n${JSON.stringify(schema)}`
    const resposta = await client.chat.completions.create(
      {
        model: modelo,
        ...limite(12000),
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: montaConteudo(user + sufixo, anexos) },
        ],
        ...pedidoJson,
      },
      { signal: comTimeout(signal) },
    )
    const escolha = resposta.choices[0]
    if (escolha?.message?.refusal) {
      throw new Error('A API recusou esta solicitação por política de segurança.')
    }
    const texto = escolha?.message?.content
    if (!texto) throw new Error('A API retornou uma resposta vazia.')
    reportaUso(onUsage, resposta.usage)
    return comSchema ? texto : extraiJson(texto)
  }

  return {
    async estruturada({ system, user, schema, signal, anexos, onUsage }) {
      try {
        if (!usaFallbackJson) {
          try {
            return await chamadaEstruturada(system, user, schema, signal, true, anexos, onUsage)
          } catch (err) {
            // API sem suporte a response_format json_schema → tenta via instrução
            if (compat && err instanceof OpenAI.BadRequestError) {
              usaFallbackJson = true
            } else {
              throw err
            }
          }
        }
        return await chamadaEstruturada(system, user, schema, signal, false, anexos, onUsage)
      } catch (err) {
        throw traduzErro(err)
      }
    },

    async streamada({ system, user, onDelta, signal, anexos, onUsage }) {
      try {
        const stream = await client.chat.completions.create(
          {
            model: modelo,
            ...limite(16000),
            stream: true,
            stream_options: { include_usage: true },
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: montaConteudo(user, anexos) },
            ],
          },
          { signal: comTimeout(signal) },
        )
        let completo = ''
        for await (const pedaco of stream) {
          const delta = pedaco.choices[0]?.delta?.content ?? ''
          if (delta) {
            completo += delta
            onDelta(delta)
          }
          // O chunk final (com include_usage) carrega o usage e choices vazio.
          if (pedaco.usage) reportaUso(onUsage, pedaco.usage)
        }
        if (!completo) throw new Error('A API retornou uma resposta vazia.')
        return completo
      } catch (err) {
        throw traduzErro(err)
      }
    },
  }
}

/** Lista os modelos disponíveis na API (GET /models) — funciona com qualquer
 *  API compatível com OpenAI: Ollama, LM Studio, OpenRouter, Groq, Gemini… */
export async function listaModelosOpenai(apiKey: string, baseUrl?: string): Promise<string[]> {
  try {
    const client = new OpenAI({
      apiKey: apiKey || 'sem-chave',
      dangerouslyAllowBrowser: true,
      maxRetries: 1,
      ...(baseUrl ? { baseURL: baseUrl } : {}),
    })
    const ids: string[] = []
    for await (const m of client.models.list()) {
      ids.push(m.id)
      if (ids.length >= 500) break
    }
    return ids.sort((a, b) => a.localeCompare(b))
  } catch (err) {
    throw traduzErro(err)
  }
}
