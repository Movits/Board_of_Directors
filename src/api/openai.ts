import OpenAI from 'openai'
import type { Transporte } from '../types'

export const MODELOS_OPENAI = [
  { id: 'gpt-5.5', rotulo: 'GPT-5.5', detalhe: 'modelo mais capaz da OpenAI' },
  { id: 'gpt-5.4', rotulo: 'GPT-5.4', detalhe: 'equilíbrio entre qualidade e custo' },
  { id: 'gpt-5.4-mini', rotulo: 'GPT-5.4 mini', detalhe: 'rápido e barato' },
]

function traduzErro(err: unknown): Error {
  if (err instanceof OpenAI.AuthenticationError) {
    return new Error('Chave de API da OpenAI inválida. Confira em Configurações.')
  }
  if (err instanceof OpenAI.PermissionDeniedError) {
    return new Error('Sua chave da OpenAI não tem permissão para este modelo.')
  }
  if (err instanceof OpenAI.NotFoundError) {
    return new Error('Modelo não encontrado nesta API. Confira o nome do modelo (e a Base URL, se personalizada).')
  }
  if (err instanceof OpenAI.RateLimitError) {
    return new Error('Limite de requisições da OpenAI atingido. Aguarde um instante.')
  }
  if (err instanceof OpenAI.APIConnectionError) {
    return new Error('Falha de conexão com a API. Verifique sua internet (e se a Base URL aceita chamadas do navegador).')
  }
  if (err instanceof OpenAI.APIError) {
    return new Error(`Erro da API OpenAI (${err.status ?? '?'}): ${err.message}`)
  }
  return err instanceof Error ? err : new Error(String(err))
}

export function criaTransporteOpenai(apiKey: string, modelo: string, baseUrl?: string): Transporte {
  const client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
    maxRetries: 3,
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  })

  return {
    async estruturada({ system, user, schema, signal }) {
      try {
        const resposta = await client.chat.completions.create(
          {
            model: modelo,
            max_completion_tokens: 12000,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'resposta_conselheiro',
                strict: true,
                schema: schema as Record<string, unknown>,
              },
            },
          },
          { signal },
        )
        const escolha = resposta.choices[0]
        if (escolha?.message?.refusal) {
          throw new Error('A API recusou esta solicitação por política de segurança.')
        }
        const texto = escolha?.message?.content
        if (!texto) throw new Error('A API retornou uma resposta vazia.')
        return texto
      } catch (err) {
        throw traduzErro(err)
      }
    },

    async streamada({ system, user, onDelta, signal }) {
      try {
        const stream = await client.chat.completions.create(
          {
            model: modelo,
            max_completion_tokens: 16000,
            stream: true,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
          },
          { signal },
        )
        let completo = ''
        for await (const pedaco of stream) {
          const delta = pedaco.choices[0]?.delta?.content ?? ''
          if (delta) {
            completo += delta
            onDelta(delta)
          }
        }
        if (!completo) throw new Error('A API retornou uma resposta vazia.')
        return completo
      } catch (err) {
        throw traduzErro(err)
      }
    },
  }
}
