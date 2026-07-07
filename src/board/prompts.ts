import type { AnaliseDebate, AnaliseRodada1, EstadoMembro, Membro, Voto } from '../types'

export const ROTULO_VOTO: Record<Voto, string> = {
  aprovar: 'Aprovar',
  aprovar_com_ressalvas: 'Aprovar com ressalvas',
  rejeitar: 'Rejeitar',
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
