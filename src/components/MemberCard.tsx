import type { EstadoMembro, Membro, Voto } from '../types'
import { votoFinalDe } from '../board/orchestrator'

const ROTULO_STATUS: Record<EstadoMembro['status'], string> = {
  aguardando: 'Aguardando',
  analisando: 'Analisando…',
  pronto: 'Pronto',
  erro: 'Erro',
}

const VOTO_CURTO: Record<Voto, { rotulo: string; classe: string }> = {
  aprovar: { rotulo: '✅ Aprovar', classe: 'voto-aprovar' },
  aprovar_com_ressalvas: { rotulo: '⚠️ Com ressalvas', classe: 'voto-ressalvas' },
  rejeitar: { rotulo: '❌ Rejeitar', classe: 'voto-rejeitar' },
}

interface Props {
  membro: Membro
  estado: EstadoMembro
  presidente?: boolean
  aoClicar?: () => void
}

export function MemberCard({ membro, estado, presidente, aoClicar }: Props) {
  const voto = presidente ? undefined : votoFinalDe(estado)
  const mudouVoto = estado.debate?.some((d) => d.mudou_voto) ?? false
  const falhouDebate = (estado.falhasDebate?.length ?? 0) > 0

  return (
    <button
      className={`cartao-membro status-${estado.status} ${presidente ? 'cartao-presidente' : ''}`}
      style={{ ['--cor' as string]: membro.cor }}
      onClick={aoClicar}
      disabled={!aoClicar}
      title={aoClicar ? `Ver análise de ${membro.nome}` : membro.descricao}
    >
      <span className="cartao-avatar" aria-hidden>
        {membro.emoji}
        {estado.status === 'analisando' && <span className="anel-pensando" />}
      </span>
      <span className="cartao-nome">{membro.nome}</span>
      <span className="cartao-cargo">{membro.cargo}</span>
      {voto ? (
        <span className={`selo-voto ${VOTO_CURTO[voto].classe}`}>
          {VOTO_CURTO[voto].rotulo}
          {mudouVoto && <span title="Mudou de voto durante o debate"> 🔄</span>}
          {falhouDebate && (
            <span title="Uma chamada falhou durante o debate — manteve a posição anterior"> ⚠</span>
          )}
        </span>
      ) : (
        <span className={`selo-status selo-${estado.status}`}>
          {presidente && estado.status === 'analisando' ? 'Sintetizando…' : ROTULO_STATUS[estado.status]}
        </span>
      )}
      {estado.rodada1?.justificativa && (
        <span
          className="cartao-justificativa"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginTop: '0.4rem',
            fontStyle: 'italic',
            fontSize: '0.78em',
            lineHeight: 1.3,
            opacity: 0.72,
          }}
        >
          “{estado.rodada1.justificativa}”
        </span>
      )}
    </button>
  )
}
