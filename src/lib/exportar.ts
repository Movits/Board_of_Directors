import type { Reuniao } from '../types'
import { membroPorId } from '../board/members'
import { ROTULO_VOTO } from '../board/prompts'
import { votoFinalDe } from '../board/orchestrator'

export function reuniaoParaMarkdown(reuniao: Reuniao): string {
  const data = new Date(reuniao.data).toLocaleString('pt-BR')
  const linhas: string[] = [
    `# Reunião do Conselho — ${data}`,
    '',
    `**Ideia analisada:**`,
    '',
    `> ${reuniao.config.ideia.replace(/\n/g, '\n> ')}`,
    '',
    `**Placar final:** ✅ Aprovar: ${reuniao.placar.aprovar} · ⚠️ Com ressalvas: ${reuniao.placar.aprovar_com_ressalvas} · ❌ Rejeitar: ${reuniao.placar.rejeitar}`,
    '',
    '---',
    '',
    '## Análises dos conselheiros',
    '',
  ]

  for (const estado of Object.values(reuniao.membros)) {
    const membro = membroPorId(estado.membroId)
    if (!membro || !estado.rodada1) continue
    const r1 = estado.rodada1
    const votoFinal = votoFinalDe(estado)
    linhas.push(
      `### ${membro.emoji} ${membro.nome} — ${membro.cargo}`,
      '',
      `**Voto final:** ${votoFinal ? ROTULO_VOTO[votoFinal] : '—'} (confiança ${r1.confianca}/5)`,
      '',
      r1.analise,
      '',
      '**Estratégias:**',
      ...r1.estrategias.map((e) => `- ${e}`),
      '',
      '**Riscos:**',
      ...r1.riscos.map((r) => `- ${r}`),
      '',
      '**Perguntas críticas:**',
      ...r1.perguntas.map((p) => `- ${p}`),
      '',
    )
    ;(estado.debate ?? []).forEach((d, i) => {
      linhas.push(`**Debate ${i + 1}:** voto ${ROTULO_VOTO[d.voto]}${d.mudou_voto ? ' _(mudou de voto)_' : ''} — ${d.justificativa}`)
      d.reacoes.forEach((r) => linhas.push(`- Para **${r.para}**: ${r.comentario}`))
      linhas.push('')
    })
  }

  linhas.push('---', '', reuniao.veredito)

  if (reuniao.promptExecucao) {
    linhas.push(
      '',
      '---',
      '',
      '## Prompt de execução (Claude Code)',
      '',
      'Cole o bloco abaixo no Claude Code para executar o plano decidido pelo conselho:',
      '',
      '````markdown',
      reuniao.promptExecucao,
      '````',
    )
  }
  return linhas.join('\n')
}

export function baixaArquivo(nome: string, conteudo: string, tipo: string): void {
  const blob = new Blob([conteudo], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

export function exportaMarkdown(reuniao: Reuniao): void {
  baixaArquivo(`conselho-${reuniao.id}.md`, reuniaoParaMarkdown(reuniao), 'text/markdown')
}

export function exportaJson(reuniao: Reuniao): void {
  baixaArquivo(`conselho-${reuniao.id}.json`, JSON.stringify(reuniao, null, 2), 'application/json')
}
