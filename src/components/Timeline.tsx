import type { FaseReuniao } from '../types'

interface Props {
  fase: FaseReuniao
  rodadaDebate: number
  totalDebates: number
}

const ORDEM: FaseReuniao[] = ['rodada1', 'debate', 'sintese', 'concluida']

export function Timeline({ fase, rodadaDebate, totalDebates }: Props) {
  const indice = fase === 'preparando' ? -1 : ORDEM.indexOf(fase === 'erro' ? 'concluida' : fase)
  const etapas = [
    { rotulo: 'Análises', detalhe: 'cada conselheiro estuda a ideia' },
    {
      rotulo: totalDebates > 1 && fase === 'debate' ? `Debate ${rodadaDebate}/${totalDebates}` : 'Debate',
      detalhe: 'réplicas e revisão de votos',
    },
    { rotulo: 'Síntese', detalhe: 'a Presidente consolida' },
    { rotulo: 'Veredito', detalhe: 'decisão e plano de ação' },
  ]

  return (
    <ol className="linha-tempo" aria-label="Andamento da reunião">
      {etapas.map((etapa, i) => (
        <li
          key={etapa.rotulo}
          className={i < indice ? 'feita' : i === indice ? 'atual' : ''}
        >
          <span className="etapa-numero">{i < indice ? '✓' : i + 1}</span>
          <span className="etapa-rotulo">{etapa.rotulo}</span>
          <span className="etapa-detalhe">{etapa.detalhe}</span>
        </li>
      ))}
    </ol>
  )
}
