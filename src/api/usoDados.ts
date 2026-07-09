import type { Provedor } from '../types'

/** Link para a página oficial de privacidade/uso de dados de um provedor —
 *  mostrado inline junto de qualquer controle que envie conteúdo à IA
 *  (anexos, repositório, pasta local). Transparência sobre a saída de dados. */
export interface LinkUsoDados {
  /** Texto do link (ou texto puro quando não há URL, ex.: provedor genérico). */
  rotulo: string
  /** URL oficial da política do provedor. Vazio => renderizar como texto. */
  url: string
}

/** Tabela Provedor → página de uso/retenção de dados. Páginas OFICIAIS conhecidas
 *  (nada inventado). O provedor personalizado não tem página fixa: texto genérico. */
export const LINKS_USO_DADOS: Record<Provedor, LinkUsoDados> = {
  anthropic: {
    rotulo: 'Política de privacidade da Anthropic',
    url: 'https://www.anthropic.com/legal/privacy',
  },
  openai: {
    rotulo: 'Política de privacidade da OpenAI',
    url: 'https://openai.com/policies/privacy-policy',
  },
  custom: {
    rotulo: 'consulte a política do seu provedor',
    url: '',
  },
}
