import type { Anexo } from '../types'
import { MEMBROS } from './members'
import { anexosTextuais } from '../lib/anexos'

/** Opções para montar o briefing que roda o conselho DENTRO do Claude Code
 *  (ou qualquer agente de programação), usando o plano do usuário — sem API. */
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

/** Gera um prompt autossuficiente para colar no Claude Code. Ele conduz a
 *  reunião inteira (análises → debate → síntese → entregáveis) no plano do
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
      `### Imagens anexadas\nO empreendedor também tem estas imagens: ${imagens.map((i) => i.nome).join(', ')}. **Arraste esses arquivos para a janela do Claude Code** para que o conselho os analise (identidade visual, mockups etc.).`,
    )
  }
  if (opts.repoUrl || opts.repoResumo) {
    materiais.push(
      `### Repositório do projeto\n${opts.repoUrl ? `O código está em ${opts.repoUrl} — se possível, **leia o repositório real** (clone ou abra a pasta) em vez de confiar só no resumo abaixo.\n\n` : ''}${opts.repoResumo ?? ''}`,
    )
  }
  if (opts.pastaLocal) {
    materiais.push(
      `### Pasta local do projeto\nO projeto está numa pasta local chamada \`${opts.pastaLocal.nome}\` (ainda não publicada). **Abra essa pasta no Claude Code** (\`cd\` até ela, ou abra no editor) e **leia os arquivos de verdade** — o mapa e os trechos abaixo são só um resumo:\n\n${opts.pastaLocal.resumo}`,
    )
  }

  const cabecalho = opts.pauta
    ? `# Reunião de ACOMPANHAMENTO do Conselho de Administração

Você (Claude Code) já conhece este projeto e vai CONDUZIR uma reunião de acompanhamento do conselho. A missão não é aprovar ou rejeitar uma ideia nova, e sim **aperfeiçoar o projeto** e orientar o próximo passo. Roda no seu plano — nenhuma API externa é necessária.`
    : `# Reunião do Conselho de Administração

Você (Claude Code) vai CONVOCAR E CONDUZIR uma reunião completa de um conselho de administração de IA sobre a ideia abaixo. Roda no seu plano — nenhuma API externa é necessária.`

  const temCodigo = Boolean(opts.repoUrl || opts.pastaLocal)
  const passo4 = temCodigo
    ? '4. **Entregáveis.** (a) um **plano de negócio** detalhado (público-alvo, mercado, SWOT, estratégia, roadmap, orçamento, métricas, riscos); (b) como este é um projeto de código, **ofereça implementar** as decisões direto no projeto — ou entregue um prompt de execução autossuficiente, se o empreendedor preferir revisar antes.'
    : '4. **Entregáveis.** (a) um **plano de negócio** detalhado (público-alvo, mercado, SWOT, estratégia, roadmap, orçamento em BRL, métricas, riscos); (b) um **prompt de execução** autossuficiente, pronto para um agente de programação implementar a ideia.'

  return `${cabecalho}

## Como conduzir a reunião

1. **Análises independentes (em paralelo).** Para cada um dos conselheiros de "O conselho" (exceto a Presidente), produza uma análise pela ótica DAQUELA especialidade — o ideal é **despachar subagentes em paralelo**, um por conselheiro, cada um assumindo a persona correspondente. Cada análise deve ter: análise (2–4 parágrafos), 3–5 estratégias concretas, 2–4 riscos, 1–3 perguntas críticas e um **voto** (✅ Aprovar / ⚠️ Aprovar com ressalvas / ❌ Rejeitar) com justificativa.
${debate}
3. **Síntese da Presidente.** A Presidente Helena Vasquez consolida tudo: placar, consensos reais, divergências relevantes, riscos que exigem atenção e um plano de ação priorizado para os próximos 7, 30 e 90 dias.
${passo4}

Responda SEMPRE em português do Brasil. Seja direto, específico e prático — números, exemplos e táticas concretas, nada de generalidades.

## O conselho

${blocoConselho()}

## ${opts.pauta ? 'O projeto' : 'A ideia'}

<ideia>
${opts.ideia}
</ideia>
${opts.pauta ? `\n<pauta>\n${opts.pauta}\n</pauta>\n` : ''}${materiais.length > 0 ? '\n## Materiais de apoio\n\n' + materiais.join('\n\n') + '\n' : ''}`
}
