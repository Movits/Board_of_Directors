import type { Reuniao } from '../types'
import { MEMBROS, membroPorId } from '../board/members'
import { ROTULO_VOTO } from '../board/prompts'
import { votoDoConsenso, votoFinalDe } from '../board/orchestrator'

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
  // Na árvore do documento o navegador respeita o atributo download (nome do
  // arquivo); revogar o blob na hora fazia o nome se perder ("download").
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportaMarkdown(reuniao: Reuniao): void {
  baixaArquivo(`conselho-${reuniao.id}.md`, reuniaoParaMarkdown(reuniao), 'text/markdown')
}

export function exportaJson(reuniao: Reuniao): void {
  baixaArquivo(`conselho-${reuniao.id}.json`, JSON.stringify(reuniao, null, 2), 'application/json')
}

// ── Export para o Obsidian (pasta brain/reuniões do second brain) ────────────

/** [[Wikilink]] para a nota do conselheiro em brain/conselho/. Aceita citação
 *  parcial ("Ricardo" → [[Ricardo Tanaka|Ricardo]]); sem correspondência,
 *  devolve o texto puro — nunca um link quebrado. */
function wikilink(nome: string): string {
  const alvo = nome.trim().toLowerCase()
  if (!alvo) return nome
  const membro = MEMBROS.find(
    (m) => m.nome.toLowerCase() === alvo || m.nome.toLowerCase().includes(alvo) || alvo.includes(m.nome.toLowerCase()),
  )
  if (!membro) return nome
  return membro.nome === nome.trim() ? `[[${membro.nome}]]` : `[[${membro.nome}|${nome.trim()}]]`
}

function situacaoConsenso(reuniao: Reuniao): string {
  if (!reuniao.config.ateConsenso) return 'nao-se-aplica'
  if (reuniao.consensoNaRodada === undefined) return 'nao-alcancado'
  const voto = votoDoConsenso(reuniao)
  if (voto === 'aprovar') return 'pleno-aprovar'
  if (voto === 'rejeitar') return 'pleno-rejeitar'
  return 'legado' // regra antiga: unanimidade de ressalvas contava como consenso
}

export function nomeArquivoObsidian(reuniao: Reuniao): string {
  const dia = new Date(reuniao.data).toISOString().slice(0, 10)
  const palavras = reuniao.config.ideia.trim().split(/\s+/).slice(0, 6).join(' ')
  // Só ASCII no nome: caracteres fora disso (até um travessão) fazem o Chrome
  // ignorar o atributo download e salvar como "download", sem nome.
  const limpo = palavras
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|#^[\]]/g, '-')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60)
    .replace(/[\s.-]+$/, '')
  return `${dia} - ${limpo || 'reuniao-do-conselho'}.md`
}

export function reuniaoParaObsidian(reuniao: Reuniao): string {
  const quando = new Date(reuniao.data)
  const consenso = situacaoConsenso(reuniao)
  const linhas: string[] = [
    '---',
    'tipo: reuniao-conselho',
    `data: ${quando.toISOString().slice(0, 10)}`,
    `hora: "${quando.toTimeString().slice(0, 5)}"`,
    `provedor: ${reuniao.config.provedor}`,
    `modelo: ${reuniao.config.modelo || 'nao-informado'}`,
    `demo: ${reuniao.config.demo}`,
    `modo_consenso: ${reuniao.config.ateConsenso ?? false}`,
    `consenso: ${consenso}`,
    ...(reuniao.consensoNaRodada !== undefined ? [`consenso_na_rodada: ${reuniao.consensoNaRodada}`] : []),
    `placar_aprovar: ${reuniao.placar.aprovar}`,
    `placar_ressalvas: ${reuniao.placar.aprovar_com_ressalvas}`,
    `placar_rejeitar: ${reuniao.placar.rejeitar}`,
    'tags: [conselho/reuniao]',
    '---',
    '',
    `# Reunião do Conselho — ${quando.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    '',
    '> [!quote] Ideia analisada',
    `> ${reuniao.config.ideia.replace(/\n/g, '\n> ')}`,
    '',
    `**Placar:** ✅ Aprovar ${reuniao.placar.aprovar} · ⚠️ Com ressalvas ${reuniao.placar.aprovar_com_ressalvas} · ❌ Rejeitar ${reuniao.placar.rejeitar}`,
  ]

  if (consenso === 'pleno-aprovar' || consenso === 'pleno-rejeitar') {
    linhas.push(
      '',
      `**Consenso pleno (${consenso === 'pleno-aprovar' ? 'Aprovar' : 'Rejeitar'})** alcançado na rodada ${reuniao.consensoNaRodada}.`,
    )
  } else if (consenso === 'nao-alcancado') {
    linhas.push('', '**Consenso pleno não alcançado** — ressalvas e divergências permanecem (ver veredito).')
  } else if (consenso === 'legado') {
    linhas.push('', '**Consenso registrado pela regra antiga** (unanimidade de ressalvas).')
  }

  const estados = Object.values(reuniao.membros).filter((e) => e.rodada1)
  linhas.push(
    '',
    '## Participantes',
    '',
    ...estados.map((estado) => {
      const membro = membroPorId(estado.membroId)
      const voto = votoFinalDe(estado)
      return `- ${membro?.emoji ?? ''} ${wikilink(membro?.nome ?? estado.membroId)} (${membro?.cargo ?? '—'}) — ${voto ? ROTULO_VOTO[voto] : 'sem voto'}`
    }),
    '',
    '---',
    '',
    '## Análises e debate',
  )

  for (const estado of estados) {
    const membro = membroPorId(estado.membroId)
    if (!membro || !estado.rodada1) continue
    const r1 = estado.rodada1
    linhas.push(
      '',
      `### ${membro.emoji} ${wikilink(membro.nome)} — ${membro.cargo}`,
      '',
      `**Voto na 1ª rodada:** ${ROTULO_VOTO[r1.voto]} (confiança ${r1.confianca}/5) — ${r1.justificativa}`,
      '',
      r1.analise,
      '',
      '**Estratégias:**',
      ...r1.estrategias.map((e) => `- ${e}`),
      '',
      '**Riscos:**',
      ...r1.riscos.map((r) => `- ${r}`),
    )
    ;(estado.debate ?? []).forEach((d, i) => {
      linhas.push(
        '',
        `**Debate ${i + 1}:** voto ${ROTULO_VOTO[d.voto]}${d.mudou_voto ? ' _(mudou de voto)_' : ''} — ${d.justificativa}`,
      )
      d.reacoes.forEach((r) => linhas.push(`- Para ${wikilink(r.para)}: ${r.comentario}`))
      const ressalvas = d.ressalvas_pendentes ?? []
      if (ressalvas.length > 0) {
        linhas.push('', '📌 Ressalvas pendentes nesta rodada:', ...ressalvas.map((r) => `- ${r}`))
      }
    })
    const falhas = estado.falhasDebate ?? []
    if (falhas.length > 0) {
      linhas.push('', `> [!warning] A chamada de debate falhou na(s) rodada(s) ${falhas.join(', ')} — manteve a posição anterior.`)
    }
  }

  linhas.push('', '---', '', '## Veredito da Presidente', '', reuniao.veredito)

  if (reuniao.promptExecucao) {
    linhas.push(
      '',
      '---',
      '',
      '## Prompt de execução',
      '',
      '````markdown',
      reuniao.promptExecucao,
      '````',
    )
  }

  linhas.push('', '---', '', 'Relacionado: [[Reunião]] · [[Consenso Pleno]] · [[Votos]]')
  return linhas.join('\n')
}

export function exportaObsidian(reuniao: Reuniao): void {
  baixaArquivo(nomeArquivoObsidian(reuniao), reuniaoParaObsidian(reuniao), 'text/markdown')
}
