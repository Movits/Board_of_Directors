import type { FaseReuniao } from '../types'

interface Props {
  fase: FaseReuniao
  rodadaDebate: number
  totalDebates: number
  ateConsenso: boolean
  gerarPrompt: boolean
}

export function Timeline({ fase, rodadaDebate, totalDebates, ateConsenso, gerarPrompt }: Props) {
  const ordem: FaseReuniao[] = gerarPrompt
    ? ['rodada1', 'debate', 'sintese', 'prompt']
    : ['rodada1', 'debate', 'sintese']

  const indice =
    fase === 'preparando'
      ? -1
      : fase === 'concluida' || fase === 'erro'
        ? ordem.length
        : ordem.indexOf(fase)

  const rotuloDebate = ateConsenso
    ? fase === 'debate'
      ? `Debate ${rodadaDebate} (consenso)`
      : 'Debate até consenso'
    : totalDebates > 1 && fase === 'debate'
      ? `Debate ${rodadaDebate}/${totalDebates}`
      : 'Debate'

  const etapas = [
    { rotulo: 'Análises', detalhe: 'cada conselheiro estuda a ideia' },
    { rotulo: rotuloDebate, detalhe: 'réplicas e revisão de votos' },
    { rotulo: 'Veredito', detalhe: 'a Presidente consolida e decide' },
    ...(gerarPrompt ? [{ rotulo: 'Prompt p/ Claude Code', detalhe: 'plano pronto para executar' }] : []),
  ]

  return (
    <ol className="linha-tempo" aria-label="Andamento da reunião">
      {etapas.map((etapa, i) => (
        <li key={i} className={i < indice ? 'feita' : i === indice ? 'atual' : ''}>
          <span className="etapa-numero">{i < indice ? '✓' : i + 1}</span>
          <span className="etapa-rotulo">{etapa.rotulo}</span>
          <span className="etapa-detalhe">{etapa.detalhe}</span>
        </li>
      ))}
    </ol>
  )
}
