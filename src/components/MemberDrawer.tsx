import { useEffect } from 'react'
import type { EstadoMembro, Membro } from '../types'
import { ROTULO_VOTO } from '../board/prompts'

interface Props {
  membro: Membro
  estado: EstadoMembro
  aoFechar: () => void
}

export function MemberDrawer({ membro, estado, aoFechar }: Props) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aoFechar])

  const r1 = estado.rodada1

  return (
    <div className="gaveta-fundo" onClick={aoFechar}>
      <aside className="gaveta" onClick={(e) => e.stopPropagation()}>
        <header className="gaveta-cabecalho" style={{ ['--cor' as string]: membro.cor }}>
          <span className="gaveta-avatar">{membro.emoji}</span>
          <div>
            <h2>{membro.nome}</h2>
            <p>{membro.cargo}</p>
          </div>
          <button className="gaveta-fechar" onClick={aoFechar} aria-label="Fechar">
            ✕
          </button>
        </header>

        <div className="gaveta-conteudo">
          {estado.status === 'erro' && (
            <div className="aviso aviso-erro">Este conselheiro não conseguiu analisar: {estado.erro}</div>
          )}
          {estado.status === 'analisando' && !r1 && <p className="gaveta-vazia">Analisando a ideia…</p>}
          {estado.status === 'aguardando' && <p className="gaveta-vazia">Aguardando a vez de falar.</p>}

          {r1 && (
            <>
              <section>
                <h3>📋 Análise</h3>
                {r1.analise.split('\n').filter(Boolean).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                <p className="voto-linha">
                  Voto na 1ª rodada: <strong>{ROTULO_VOTO[r1.voto]}</strong> · confiança {r1.confianca}/5
                  <br />
                  <em>{r1.justificativa}</em>
                </p>
              </section>
              <section>
                <h3>🧭 Estratégias propostas</h3>
                <ul>
                  {r1.estrategias.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>⚠️ Riscos apontados</h3>
                <ul>
                  {r1.riscos.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>❓ Perguntas críticas</h3>
                <ul>
                  {r1.perguntas.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </section>
              {(estado.debate ?? []).map((d, i) => (
                <section key={i} className="bloco-debate">
                  <h3>
                    🗣️ Debate — rodada {i + 1}
                    {d.mudou_voto && <span className="selo-mudou"> mudou de voto</span>}
                  </h3>
                  {d.reacoes.map((r, j) => (
                    <p key={j} className="reacao">
                      <strong>Para {r.para}:</strong> {r.comentario}
                    </p>
                  ))}
                  <p className="voto-linha">
                    Voto após o debate: <strong>{ROTULO_VOTO[d.voto]}</strong>
                    <br />
                    <em>{d.justificativa}</em>
                  </p>
                </section>
              ))}
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
