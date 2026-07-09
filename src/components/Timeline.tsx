import type { FaseReuniao } from '../types'

interface Props {
  fase: FaseReuniao
  rodadaDebate: number
  totalDebates: number
  ateConsenso: boolean
  gerarPlano: boolean
  gerarPrompt: boolean
}

export function Timeline({ fase, rodadaDebate, totalDebates, ateConsenso, gerarPlano, gerarPrompt }: Props) {
  const ordem: FaseReuniao[] = [
    'rodada1',
    'debate',
    'sintese',
    ...(gerarPlano ? (['plano'] as FaseReuniao[]) : []),
    ...(gerarPrompt ? (['prompt'] as FaseReuniao[]) : []),
  ]

  const indice =
    fase === 'preparando'
      ? -1
      : fase === 'concluida' || fase === 'erro'
        ? ordem.length
        : ordem.indexOf(fase)

  const rotuloDebate = ateConsenso
    ? fase === 'debate'
      ? `Debate ${rodadaDebate} (consenso pleno)`
      : 'Debate até consenso pleno'
    : totalDebates > 1 && fase === 'debate'
      ? `Debate ${rodadaDebate}/${totalDebates}`
      : 'Debate'

  const etapas = [
    { rotulo: 'Análises', detalhe: 'cada conselheiro estuda a ideia' },
    { rotulo: rotuloDebate, detalhe: 'réplicas e revisão de votos' },
    { rotulo: 'Veredito', detalhe: 'a Presidente consolida e decide' },
    ...(gerarPlano ? [{ rotulo: 'Plano', detalhe: 'documento com pesquisa e números' }] : []),
    ...(gerarPrompt ? [{ rotulo: 'Prompt de execução', detalhe: 'pronto para um agente executar' }] : []),
  ]

  return (
    <ol className="linha-tempo" aria-label="Andamento da reunião">
      {etapas.map((etapa, i) => (
        <li
          key={i}
          className={i < indice ? 'feita' : i === indice ? 'atual' : ''}
          aria-current={i === indice ? 'step' : undefined}
        >
          <span className="etapa-numero">{i < indice ? '✓' : i + 1}</span>
          <span className="etapa-rotulo">{etapa.rotulo}</span>
          <span className="etapa-detalhe">{etapa.detalhe}</span>
        </li>
      ))}
    </ol>
  )
}
