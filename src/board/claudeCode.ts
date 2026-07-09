import type { Anexo } from '../types'
import { MEMBROS } from './members'
import { anexosTextuais } from '../lib/anexos'

/** Opções para montar o prompt que roda o conselho em QUALQUER chat de IA
 *  (ChatGPT, Claude, Gemini…), usando o plano do usuário, sem API. */
export interface OpcoesClaudeCode {
  ideia: string
  anexos?: Anexo[]
  repoResumo?: string
  repoUrl?: string
  /** Pasta local do projeto (não publicada) — nome + digest. */
  pastaLocal?: { nome: string; resumo: string }
  /** Debate: número de rodadas fixas. Ignorado quando ateConsenso. */
  rodadasDebate: number
  ateConsenso: boolean
  /** Reunião de acompanhamento: pauta do que mudou e do que se quer agora. */
  pauta?: string
}

function blocoConselho(): string {
  return MEMBROS.map((m) => `### ${m.emoji} ${m.nome} — ${m.cargo}\n${m.systemPrompt}`).join('\n\n')
}

/** Gera um prompt autossuficiente para colar em qualquer chat de IA. Ele conduz
 *  a reunião inteira (análises → debate → síntese → entregáveis) no plano do
 *  usuário. Nenhuma chamada de API do app é feita. */
export function promptParaClaudeCode(opts: OpcoesClaudeCode): string {
  const anexos = opts.anexos ?? []
  const imagens = anexos.filter((a) => a.tipo === 'imagem')
  const textos = anexosTextuais(anexos)

  const debate = opts.ateConsenso
    ? '2. **Debate até o CONSENSO PLENO.** Repita rodadas de debate até que TODOS votem "Aprovar" ou TODOS votem "Rejeitar" (teto de 5 rodadas). "Aprovar com ressalvas" NÃO encerra: cada ressalva vira uma condição concreta que os colegas precisam aceitar, resolver ou rebater. Ninguém cede por conformismo; quem rejeita diz o que o faria mudar de voto.'
    : `2. **Debate (${opts.rodadasDebate} rodada${opts.rodadasDebate > 1 ? 's' : ''}).** Cada conselheiro lê as posições dos colegas, rebate citando-os pelo nome e pode mudar de voto diante de bons argumentos.`

  const materiais: string[] = []
  if (textos) materiais.push(`### Anexos de texto\n${textos}`)
  if (imagens.length > 0) {
    materiais.push(
      `### Imagens anexadas\nO empreendedor também tem estas imagens: ${imagens.map((i) => i.nome).join(', ')}. **Arraste esses arquivos para a janela do seu chat de IA** para que o conselho os analise (identidade visual, mockups etc.).`,
    )
  }
  if (opts.repoUrl || opts.repoResumo) {
    materiais.push(
      `### Repositório do projeto\n${opts.repoUrl ? `O código está em ${opts.repoUrl}. Se você estiver num assistente que lê arquivos, como o Claude Code ou o Cursor, **leia o repositório de verdade** (clone ou abra a pasta) em vez de confiar só no resumo abaixo.\n\n` : ''}${opts.repoResumo ?? ''}`,
    )
  }
  if (opts.pastaLocal) {
    materiais.push(
      `### Pasta local do projeto\nO projeto está numa pasta local chamada \`${opts.pastaLocal.nome}\` (ainda não publicada). Se você estiver num assistente que lê arquivos, como o Claude Code ou o Cursor, **abra essa pasta e leia os arquivos de verdade** (\`cd\` até ela, ou abra no editor). O mapa e os trechos abaixo são só um resumo:\n\n${opts.pastaLocal.resumo}`,
    )
  }

  const cabecalho = opts.pauta
    ? `# Reunião de ACOMPANHAMENTO do Conselho de Administração

Você é um assistente de IA e vai CONDUZIR uma reunião de acompanhamento deste conselho, que já conhece o projeto. A missão não é aprovar ou rejeitar uma ideia nova, e sim **aperfeiçoar o projeto** e orientar o próximo passo. Isso roda no seu plano; nenhuma API externa é necessária.`
    : `# Reunião do Conselho de Administração

Você é um assistente de IA e vai CONVOCAR E CONDUZIR uma reunião completa de um conselho de administração de IA sobre a ideia abaixo. Isso roda no seu plano; nenhuma API externa é necessária.`

  const temCodigo = Boolean(opts.repoUrl || opts.pastaLocal)
  const passo4 = temCodigo
    ? '4. **Entregáveis.** (a) um **plano de negócio** detalhado (público-alvo, mercado, SWOT, estratégia, roadmap, orçamento, métricas, riscos); (b) como este é um projeto de código, se você conseguir editar arquivos, **ofereça implementar** as decisões direto no projeto. Se o empreendedor preferir revisar antes, ou se você não editar arquivos, entregue um prompt de execução autossuficiente.'
    : '4. **Entregáveis.** (a) um **plano de negócio** detalhado (público-alvo, mercado, SWOT, estratégia, roadmap, orçamento em BRL, métricas, riscos); (b) um **prompt de execução** autossuficiente, pronto para um agente de programação implementar a ideia.'

  return `${cabecalho}

## Como conduzir a reunião

1. **Análises independentes.** Para cada um dos conselheiros de "O conselho" (exceto a Presidente), produza uma análise pela ótica DAQUELA especialidade. Se o seu assistente permitir, o ideal é **rodar vários subagentes em paralelo**, um por conselheiro; se não, faça um de cada vez, cada um assumindo a persona correspondente. Cada análise deve ter: análise (2–4 parágrafos), 3–5 estratégias concretas, 2–4 riscos, 1–3 perguntas críticas e um **voto** (✅ Aprovar / ⚠️ Aprovar com ressalvas / ❌ Rejeitar) com justificativa.
${debate}
3. **Síntese da Presidente.** A Presidente Helena Vasquez consolida tudo: placar, consensos reais, divergências relevantes, riscos que exigem atenção e um plano de ação priorizado para os próximos 7, 30 e 90 dias.
${passo4}

Responda SEMPRE em português do Brasil. Seja direto, específico e prático: números, exemplos e táticas concretas, nada de generalidades. Escreva num português claro e natural, que qualquer pessoa entenda, e evite abusar de travessões.

## O conselho

${blocoConselho()}

## ${opts.pauta ? 'O projeto' : 'A ideia'}

<ideia>
${opts.ideia}
</ideia>
${opts.pauta ? `\n<pauta>\n${opts.pauta}\n</pauta>\n` : ''}${materiais.length > 0 ? '\n## Materiais de apoio\n\n' + materiais.join('\n\n') + '\n' : ''}`
}
