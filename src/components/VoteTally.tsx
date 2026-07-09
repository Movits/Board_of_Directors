import type { Placar } from '../types'

interface Props {
  placar: Placar
  total: number
  votaram: number
}

export function VoteTally({ placar, total, votaram }: Props) {
  const soma = Math.max(votaram, 1)
  const pct = (n: number) => `${(n / soma) * 100}%`

  return (
    <section className="placar" aria-label="Placar da votação">
      <h3>
        Votação <small>{votaram} de {total} votos</small>
      </h3>
      <div className="placar-barra" role="img" aria-label={`Aprovar ${placar.aprovar}, com ressalvas ${placar.aprovar_com_ressalvas}, rejeitar ${placar.rejeitar}`}>
        {placar.aprovar > 0 && <span className="barra-aprovar" style={{ width: pct(placar.aprovar) }} />}
        {placar.aprovar_com_ressalvas > 0 && (
          <span className="barra-ressalvas" style={{ width: pct(placar.aprovar_com_ressalvas) }} />
        )}
        {placar.rejeitar > 0 && <span className="barra-rejeitar" style={{ width: pct(placar.rejeitar) }} />}
        {votaram === 0 && <span className="barra-vazia" />}
      </div>
      <ul className="placar-legenda">
        <li>
          <span className="ponto ponto-aprovar" /> Aprovar <strong>{placar.aprovar}</strong>
        </li>
        <li>
          <span className="ponto ponto-ressalvas" /> Com ressalvas <strong>{placar.aprovar_com_ressalvas}</strong>
        </li>
        <li>
          <span className="ponto ponto-rejeitar" /> Rejeitar <strong>{placar.rejeitar}</strong>
        </li>
      </ul>
      {/* Região oculta que narra o placar a cada mudança para leitores de tela */}
      <p className="sr-apenas" aria-live="polite">
        Aprovar {placar.aprovar}, com ressalvas {placar.aprovar_com_ressalvas}, rejeitar{' '}
        {placar.rejeitar}, de {total} votos
      </p>
    </section>
  )
}
