import type { AnaliseDebate, AnaliseRodada1, EstadoMembro, ItemFeedback, Membro, Voto } from '../types'

export const ROTULO_VOTO: Record<Voto, string> = {
  aprovar: 'Aprovar',
  aprovar_com_ressalvas: 'Aprovar com ressalvas',
  rejeitar: 'Rejeitar',
}

/** Monta o system prompt efetivo de um conselheiro: persona (override do
 *  usuário ou padrão) + apêndice de feedback — o feedback só entra no prompt
 *  do PRÓPRIO membro, mudando apenas o comportamento local dele. */
export function personaEfetiva(base: string, feedback: ItemFeedback[]): string {
  if (feedback.length === 0) return base
  const positivos = feedback.filter((f) => f.gostou)
  const negativos = feedback.filter((f) => !f.gostou)
  const linhas: string[] = [
    base,
    '',
    '---',
    'FEEDBACK DO DONO DO CONSELHO sobre respostas SUAS em reuniões anteriores.',
    'Ajuste seu comportamento de acordo — isso vale só para você, não para os outros conselheiros.',
  ]
  if (positivos.length > 0) {
    linhas.push('', 'O que ele GOSTOU (continue fazendo assim):')
    for (const f of positivos) {
      linhas.push(`- "${f.trecho}"${f.comentario ? ` — comentário dele: ${f.comentario}` : ''}`)
    }
  }
  if (negativos.length > 0) {
    linhas.push('', 'O que ele NÃO GOSTOU (evite repetir):')
    for (const f of negativos) {
      linhas.push(`- "${f.trecho}"${f.comentario ? ` — comentário dele: ${f.comentario}` : ''}`)
    }
  }
  return linhas.join('\n')
}

export function promptRodada1(ideia: string): string {
  return `O empreendedor apresentou a seguinte ideia ao conselho:

<ideia>
${ideia}
</ideia>

Faça seu trabalho como conselheiro: analise a ideia a fundo pela ótica da sua especialidade, proponha estratégias concretas, aponte riscos, levante as perguntas críticas e dê seu voto preliminar.`
}

function resumoPosicao(membro: Membro, r1: AnaliseRodada1, debates: AnaliseDebate[] | undefined): string {
  const ultimo = debates && debates.length > 0 ? debates[debates.length - 1] : undefined
  const voto = ultimo?.voto ?? r1.voto
  const justificativa = ultimo?.justificativa ?? r1.justificativa
  const linhas = [
    `### ${membro.nome} (${membro.cargo}) — voto: ${ROTULO_VOTO[voto]}`,
    `Justificativa: ${justificativa}`,
    `Pontos principais: ${r1.estrategias.slice(0, 3).join(' | ')}`,
    `Riscos apontados: ${r1.riscos.slice(0, 3).join(' | ')}`,
  ]
  return linhas.join('\n')
}

export function promptDebate(
  ideia: string,
  minhaAnalise: AnaliseRodada1,
  meusDebates: AnaliseDebate[],
  colegas: { membro: Membro; estado: EstadoMembro }[],
  rodada: number,
): string {
  const meuVotoAtual = meusDebates.length > 0 ? meusDebates[meusDebates.length - 1].voto : minhaAnalise.voto
  const posicoes = colegas
    .filter(({ estado }) => estado.rodada1)
    .map(({ membro, estado }) => resumoPosicao(membro, estado.rodada1!, estado.debate))
    .join('\n\n')

  return `Rodada de debate nº ${rodada} sobre a ideia:

<ideia>
${ideia}
</ideia>

Seu voto atual é: ${ROTULO_VOTO[meuVotoAtual]} ("${minhaAnalise.justificativa}").

Posições atuais dos demais conselheiros:

${posicoes}

Agora debata: reaja às posições dos colegas com quem você mais concorda ou discorda (cite-os pelo nome), defenda ou ajuste sua posição e declare seu voto final desta rodada. Mudar de voto diante de bons argumentos é sinal de senioridade, não de fraqueza — mas não mude por mudar.`
}

export function promptSintese(
  ideia: string,
  participantes: { membro: Membro; estado: EstadoMembro }[],
): string {
  const blocos = participantes
    .filter(({ estado }) => estado.rodada1)
    .map(({ membro, estado }) => {
      const r1 = estado.rodada1!
      const debates = estado.debate ?? []
      const votoFinal = debates.length > 0 ? debates[debates.length - 1].voto : r1.voto
      const partes = [
        `### ${membro.nome} (${membro.cargo})`,
        `Voto final: ${ROTULO_VOTO[votoFinal]} (confiança inicial ${r1.confianca}/5)`,
        `Análise: ${r1.analise}`,
        `Estratégias: ${r1.estrategias.join(' | ')}`,
        `Riscos: ${r1.riscos.join(' | ')}`,
        `Perguntas críticas: ${r1.perguntas.join(' | ')}`,
      ]
      debates.forEach((d, i) => {
        const reacoes = d.reacoes.map((r) => `para ${r.para}: ${r.comentario}`).join(' || ')
        partes.push(
          `Debate ${i + 1}: voto ${ROTULO_VOTO[d.voto]}${d.mudou_voto ? ' (MUDOU DE VOTO)' : ''} — ${d.justificativa}${reacoes ? ` — Reações: ${reacoes}` : ''}`,
        )
      })
      return partes.join('\n')
    })
    .join('\n\n')

  return `A reunião do conselho sobre a ideia abaixo foi concluída. Como Presidente, produza a síntese final.

<ideia>
${ideia}
</ideia>

Registro completo da reunião (análises, debates e votos finais):

${blocos}

Escreva a síntese final do conselho em markdown, com esta estrutura:

# Veredito do Conselho
(decisão recomendada em 1 frase forte, coerente com o placar e com a qualidade dos argumentos)

## Placar e leitura da votação
(interprete os votos: unanimidade? divisão? quem mudou de voto e por quê isso importa?)

## Consensos
## Divergências relevantes
## Riscos que exigem atenção imediata
## Plano de ação recomendado
(passos priorizados e concretos: o que fazer nos próximos 7, 30 e 90 dias)

## Palavra final da Presidente
(seu conselho direto ao empreendedor, em tom humano)`
}

export function promptPlano(
  ideia: string,
  participantes: { membro: Membro; estado: EstadoMembro }[],
  veredito: string,
): string {
  const recomendacoes = participantes
    .filter(({ estado }) => estado.rodada1)
    .map(({ membro, estado }) => {
      const r1 = estado.rodada1!
      return `### ${membro.cargo}\nEstratégias: ${r1.estrategias.join(' | ')}\nRiscos: ${r1.riscos.join(' | ')}`
    })
    .join('\n\n')

  return `A reunião terminou. Agora, como Presidente, compile a decisão do conselho em um PLANO DE NEGÓCIO COMPLETO e bem pesquisado — ele virará um documento visual que o empreendedor vai avaliar antes de executar qualquer coisa.

<ideia>
${ideia}
</ideia>

<veredito_do_conselho>
${veredito}
</veredito_do_conselho>

<recomendacoes_dos_conselheiros>
${recomendacoes}
</recomendacoes_dos_conselheiros>

Diretrizes:
- Incorpore as estratégias aprovadas e trate as ressalvas como restrições do plano.
- Seja específico e prático: nomes de concorrentes reais quando conhecidos, números plausíveis.
- Valores de orçamento em reais (BRL) mensais, como ESTIMATIVAS aproximadas e conservadoras.
- O roadmap deve ter 3 a 5 fases com duração em semanas e entregas concretas.
- 4 a 6 categorias de orçamento; 3 a 5 métricas; 3 a 6 riscos; 4 a 8 próximos passos.
- Tudo em português do Brasil, direto e sem enrolação.`
}

export function promptExecucao(
  ideia: string,
  participantes: { membro: Membro; estado: EstadoMembro }[],
  veredito: string,
): string {
  const recomendacoes = participantes
    .filter(({ estado }) => estado.rodada1)
    .map(({ membro, estado }) => {
      const r1 = estado.rodada1!
      return [
        `### ${membro.cargo} (${membro.nome})`,
        `Estratégias: ${r1.estrategias.join(' | ')}`,
        `Riscos: ${r1.riscos.join(' | ')}`,
        `Perguntas em aberto: ${r1.perguntas.join(' | ')}`,
      ].join('\n')
    })
    .join('\n\n')

  return `A reunião terminou e o conselho tomou sua decisão. Sua ÚLTIMA tarefa como Presidente: transformar tudo o que foi decidido em um PROMPT DE EXECUÇÃO para um agente de programação (Claude Code) implementar a ideia.

<ideia>
${ideia}
</ideia>

<veredito_do_conselho>
${veredito}
</veredito_do_conselho>

<recomendacoes_dos_conselheiros>
${recomendacoes}
</recomendacoes_dos_conselheiros>

Regras do que você vai escrever:
- Escreva APENAS o prompt final, sem nenhum comentário antes ou depois (nada de "Aqui está o prompt:").
- O prompt deve ser AUTOSSUFICIENTE: o agente que o receber não verá esta reunião nem o veredito — todo o contexto necessário precisa estar dentro do prompt.
- Incorpore as estratégias aprovadas e trate as ressalvas do conselho como restrições explícitas.
- Se o conselho rejeitou a ideia, escreva o prompt para a versão reformulada/mínima que o conselho indicaria como aceitável, deixando isso claro na seção de contexto.
- Seja específico e detalhado: o agente executará exatamente o que estiver escrito, sem adivinhar intenções.

Estrutura obrigatória do prompt (em markdown, em português):

1. **Contexto e objetivo** — o que é o projeto, para quem, que problema resolve e qual o resultado esperado desta primeira versão.
2. **Escopo do MVP** — funcionalidade por funcionalidade, com detalhes de comportamento (o que o usuário consegue fazer, fluxos principais).
3. **Fora de escopo** — o que explicitamente NÃO construir nesta fase (com base nas ressalvas do conselho).
4. **Requisitos técnicos** — sugestão de stack com justificativa curta, integrações, onde hospedar, requisitos de dados.
5. **UX e comunicação** — diretrizes de experiência, tom de voz e mensagens-chave (aproveite Marketing, Design e Copy).
6. **Critérios de aceitação** — lista objetiva e verificável do que define "pronto".
7. **Riscos e cuidados na implementação** — os riscos do conselho que afetam o código (segurança, LGPD, custos, gargalos).
8. **Plano de implementação sugerido** — passos ordenados para o agente seguir.

Comece o prompt com um título em markdown (#) com o nome do projeto.`
}
