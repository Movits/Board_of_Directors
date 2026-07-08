import { useEffect, useState } from 'react'
import type { EstadoMembro, ItemFeedback, Membro } from '../types'
import { ROTULO_VOTO } from '../board/prompts'
import { gravaFeedback, leFeedback, removeFeedback } from '../lib/storage'
import { PersonaForm } from './PersonaForm'

// ── Avaliação de uma resposta (👍/👎 + comentário opcional) ─────────────────

interface FeedbackProps {
  membroId: string
  origem: ItemFeedback['origem']
  texto: string
}

function FeedbackResposta({ membroId, origem, texto }: FeedbackProps) {
  const [escolha, setEscolha] = useState<boolean | null>(null)
  const [comentario, setComentario] = useState('')
  const [salvo, setSalvo] = useState<boolean | null>(null)

  if (salvo !== null) {
    return (
      <div className="feedback-salvo">
        ✓ Avaliação salva {salvo ? '👍' : '👎'} — este conselheiro vai levá-la em conta nas próximas
        reuniões.
      </div>
    )
  }

  return (
    <div className="feedback-bloco">
      <span className="feedback-pergunta">O que achou desta resposta?</span>
      <div className="feedback-botoes">
        <button
          className={`feedback-botao ${escolha === true ? 'ativo' : ''}`}
          onClick={() => setEscolha(true)}
          title="Gostei"
        >
          👍 Gostei
        </button>
        <button
          className={`feedback-botao ${escolha === false ? 'ativo' : ''}`}
          onClick={() => setEscolha(false)}
          title="Não gostei"
        >
          👎 Não gostei
        </button>
      </div>
      {escolha !== null && (
        <div className="feedback-form">
          <input
            type="text"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder={escolha ? 'Opcional: o que foi bom?' : 'Opcional: o que evitar da próxima vez?'}
          />
          <button
            className="botao-principal botao-compacto"
            onClick={() => {
              gravaFeedback(membroId, {
                id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                data: new Date().toISOString(),
                gostou: escolha,
                comentario: comentario.trim() || undefined,
                trecho: texto.replace(/\s+/g, ' ').slice(0, 200),
                origem,
              })
              setSalvo(escolha)
            }}
          >
            Salvar avaliação
          </button>
        </div>
      )}
    </div>
  )
}

// ── Gaveta do conselheiro ────────────────────────────────────────────────────

interface Props {
  membro: Membro
  estado: EstadoMembro
  /** No modo demonstração o feedback fica desativado (respostas simuladas). */
  demo?: boolean
  aoFechar: () => void
}

export function MemberDrawer({ membro, estado, demo, aoFechar }: Props) {
  const [aba, setAba] = useState<'reuniao' | 'config'>('reuniao')
  const [feedbacks, setFeedbacks] = useState<ItemFeedback[]>(() => leFeedback(membro.id))

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aoFechar])

  const r1 = estado.rodada1
  const atualizaFeedbacks = () => setFeedbacks(leFeedback(membro.id))

  return (
    <div className="gaveta-fundo" onClick={aoFechar}>
      <aside
        className="gaveta"
        role="dialog"
        aria-modal="true"
        aria-label={`${membro.nome} — ${membro.cargo}`}
        onClick={(e) => e.stopPropagation()}
      >
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

        <nav className="gaveta-abas">
          <button className={aba === 'reuniao' ? 'ativa' : ''} onClick={() => setAba('reuniao')}>
            💬 Reunião
          </button>
          <button
            className={aba === 'config' ? 'ativa' : ''}
            onClick={() => {
              atualizaFeedbacks()
              setAba('config')
            }}
          >
            🎭 Persona
          </button>
        </nav>

        {aba === 'reuniao' && (
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
                {demo ? (
                  <p className="feedback-demo-nota">
                    👍/👎 desativados no modo demonstração — as respostas são simuladas. Conecte
                    uma API para treinar este conselheiro com seu feedback.
                  </p>
                ) : (
                  <FeedbackResposta
                    membroId={membro.id}
                    origem="analise"
                    texto={`[Análise] ${r1.analise} | Estratégias: ${r1.estrategias.join('; ')}`}
                  />
                )}
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
                    {(d.ressalvas_pendentes ?? []).length > 0 && (
                      <>
                        <p className="ressalvas-titulo">📌 Ressalvas pendentes declaradas:</p>
                        <ul className="lista-ressalvas">
                          {d.ressalvas_pendentes!.map((r, j) => (
                            <li key={j}>{r}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    <p className="voto-linha">
                      Voto após o debate: <strong>{ROTULO_VOTO[d.voto]}</strong>
                      <br />
                      <em>{d.justificativa}</em>
                    </p>
                    {!demo && (
                      <FeedbackResposta
                        membroId={membro.id}
                        origem="debate"
                        texto={`[Debate ${i + 1}] ${d.reacoes.map((r) => `para ${r.para}: ${r.comentario}`).join(' | ')} | ${d.justificativa}`}
                      />
                    )}
                  </section>
                ))}
                {(estado.falhasDebate?.length ?? 0) > 0 && (
                  <p className="nota-falha-debate">
                    ⚠ A chamada de debate falhou na rodada{' '}
                    {estado.falhasDebate!.join(', ')} — este conselheiro manteve a posição
                    anterior nessas rodadas.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {aba === 'config' && (
          <div className="gaveta-conteudo">
            <section>
              <h3>🎭 Papel no conselho</h3>
              <p>{membro.descricao}</p>
            </section>
            <section>
              <h3>📝 Persona (system prompt)</h3>
              <p className="campo-dica">
                Edite para ajustar o comportamento deste conselheiro nas próximas reuniões.
              </p>
              <PersonaForm membro={membro} />
            </section>
            <section>
              <h3>🧠 Aprendizados (feedback que você deu)</h3>
              {feedbacks.length === 0 ? (
                <p className="campo-dica">
                  Nenhuma avaliação ainda. Use 👍/👎 nas respostas da aba Reunião — o feedback muda o
                  comportamento apenas deste conselheiro.
                </p>
              ) : (
                <ul className="lista-feedback">
                  {feedbacks.map((f) => (
                    <li key={f.id} className={f.gostou ? 'fb-positivo' : 'fb-negativo'}>
                      <span className="fb-icone">{f.gostou ? '👍' : '👎'}</span>
                      <span className="fb-corpo">
                        <span className="fb-trecho">“{f.trecho}”</span>
                        {f.comentario && <span className="fb-comentario">Seu comentário: {f.comentario}</span>}
                        <span className="fb-data">
                          {new Date(f.data).toLocaleDateString('pt-BR')} · {f.origem === 'analise' ? 'análise' : 'debate'}
                        </span>
                      </span>
                      <button
                        className="fb-remover"
                        title="Remover este aprendizado"
                        onClick={() => {
                          removeFeedback(membro.id, f.id)
                          atualizaFeedbacks()
                        }}
                      >
                        🗑
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}
