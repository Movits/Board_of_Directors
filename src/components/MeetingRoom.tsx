import { useEffect, useMemo, useRef, useState } from 'react'
import type { ConfigReuniao, ContextoProjeto, EstadoMembro, FaseReuniao, Plano, Reuniao, Voto } from '../types'
import { MEMBROS, MEMBROS_VOTANTES, PRESIDENTE, membroPorId } from '../board/members'
import {
  conduzirReuniao,
  calculaPlacar,
  gerarPlano,
  gerarPromptExecucao,
  votoDoConsenso,
  MAX_RODADAS_CONSENSO,
  type ContextoEntregavel,
} from '../board/orchestrator'
import { personaEfetiva } from '../board/prompts'
import { criaTransporte } from '../api'
import { criaTransporteDemo } from '../board/demo'
import {
  anexaReuniaoAoProjeto,
  gravaReuniao,
  leBaseUrlDe,
  leChave,
  leFeedback,
  leHistorico,
  lePersonas,
  leProjeto,
} from '../lib/storage'
import { MemberCard } from './MemberCard'
import { MemberDrawer } from './MemberDrawer'
import { VoteTally } from './VoteTally'
import { VerdictPanel } from './VerdictPanel'
import { PromptPanel } from './PromptPanel'
import { PlanDocument } from './PlanDocument'
import { Timeline } from './Timeline'

/** Prompt efetivo de cada membro: override do usuário (ou padrão) + feedback
 *  local daquele agente — avaliações 👍/👎 só afetam o próprio conselheiro. */
function montaPersonas(): Record<string, string> {
  const overrides = lePersonas()
  const personas: Record<string, string> = {}
  for (const m of MEMBROS) {
    personas[m.id] = personaEfetiva(overrides[m.id] ?? m.systemPrompt, leFeedback(m.id))
  }
  return personas
}

interface Props {
  config: ConfigReuniao
  existente?: Reuniao
  aoNovaReuniao: () => void
  aoVerProjeto?: (projetoId: string) => void
}

/** Resumo da reunião anterior do projeto — contexto para acompanhamentos. */
function resumoReuniaoAnterior(projetoId: string): string | undefined {
  const projeto = leProjeto(projetoId)
  const ultimaId = projeto?.reunioesIds[projeto.reunioesIds.length - 1]
  if (!ultimaId) return undefined
  const anterior = leHistorico().find((r) => r.id === ultimaId)
  if (!anterior) return undefined
  const placar = `Placar: ✅ ${anterior.placar.aprovar} · ⚠️ ${anterior.placar.aprovar_com_ressalvas} · ❌ ${anterior.placar.rejeitar}`
  const veredito =
    anterior.veredito.length > 6000 ? anterior.veredito.slice(0, 6000) + '\n… (resumo truncado)' : anterior.veredito
  return `Data: ${new Date(anterior.data).toLocaleDateString('pt-BR')}${anterior.config.pauta ? `\nPauta daquela reunião: ${anterior.config.pauta}` : ''}\n${placar}\n\n${veredito}`
}

interface EstadoUI {
  fase: FaseReuniao
  rodadaDebate: number
  membros: Record<string, EstadoMembro>
  statusPresidente: EstadoMembro['status']
  veredito: string
  promptExecucao: string
  plano?: Plano
  consensoNaRodada?: number
  /** Voto do consenso pleno ('aprovar' | 'rejeitar'); indefinido em registros antigos. */
  consensoVoto?: Voto
  erro?: string
  reuniao?: Reuniao
  /** Falha na geração de um entregável (a reunião continua válida). */
  erroPlano?: string
  erroPrompt?: string
  regerando?: 'plano' | 'prompt'
}

function estadoInicial(config: ConfigReuniao, existente?: Reuniao): EstadoUI {
  if (existente) {
    return {
      fase: 'concluida',
      rodadaDebate: config.rodadasDebate,
      membros: existente.membros,
      statusPresidente: 'pronto',
      veredito: existente.veredito,
      promptExecucao: existente.promptExecucao ?? '',
      plano: existente.plano,
      consensoNaRodada: existente.consensoNaRodada,
      consensoVoto: existente.consensoVoto ?? votoDoConsenso(existente),
      reuniao: existente,
    }
  }
  const membros: Record<string, EstadoMembro> = {}
  for (const id of config.membrosIds) {
    membros[id] = { membroId: id, status: 'aguardando' }
  }
  return {
    fase: 'preparando',
    rodadaDebate: 0,
    membros,
    statusPresidente: 'aguardando',
    veredito: '',
    promptExecucao: '',
  }
}

export function MeetingRoom({ config, existente, aoNovaReuniao, aoVerProjeto }: Props) {
  const [estado, setEstado] = useState<EstadoUI>(() => estadoInicial(config, existente))
  const [membroAberto, setMembroAberto] = useState<string | null>(null)
  const [planoAberto, setPlanoAberto] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const iniciadaRef = useRef(false)

  // Materiais do projeto (anexos, repo, reunião anterior) que alimentam a reunião
  const projeto = useMemo(
    () => (config.projetoId ? leProjeto(config.projetoId) : undefined),
    [config.projetoId],
  )
  const anexos = useMemo(() => projeto?.anexos ?? [], [projeto])
  const contexto = useMemo<ContextoProjeto>(
    () => ({
      repo: projeto?.repo?.resumo,
      reuniaoAnterior:
        config.pauta && config.projetoId ? resumoReuniaoAnterior(config.projetoId) : undefined,
    }),
    [projeto, config.pauta, config.projetoId],
  )

  useEffect(() => {
    if (existente || iniciadaRef.current) return
    iniciadaRef.current = true // evita reexecução no StrictMode do React

    const abort = new AbortController()
    abortRef.current = abort
    const transporte = config.demo
      ? criaTransporteDemo()
      : criaTransporte(config.provedor, {
          apiKey: leChave(config.provedor),
          modelo: config.modelo,
          baseUrl: config.provedor === 'anthropic' ? undefined : leBaseUrlDe(config.provedor),
        })

    conduzirReuniao({
      config,
      transporte,
      personas: montaPersonas(),
      abortar: abort.signal,
      anexos,
      contexto,
      eventos: {
        onFase: (fase, rodada) =>
          setEstado((e) => ({ ...e, fase, rodadaDebate: rodada ?? e.rodadaDebate })),
        onStatusMembro: (membroId, status, erro) =>
          setEstado((e) => {
            if (membroId === PRESIDENTE.id) return { ...e, statusPresidente: status }
            return {
              ...e,
              membros: {
                ...e.membros,
                [membroId]: { ...e.membros[membroId], status, erro },
              },
            }
          }),
        onRodada1: (membroId, resultado) =>
          setEstado((e) => ({
            ...e,
            membros: {
              ...e.membros,
              [membroId]: { ...e.membros[membroId], rodada1: resultado },
            },
          })),
        onDebate: (membroId, _rodada, resultado) =>
          setEstado((e) => ({
            ...e,
            membros: {
              ...e.membros,
              [membroId]: {
                ...e.membros[membroId],
                debate: [...(e.membros[membroId].debate ?? []), resultado],
              },
            },
          })),
        onDebateFalhou: (membroId, rodada) =>
          setEstado((e) => ({
            ...e,
            membros: {
              ...e.membros,
              [membroId]: {
                ...e.membros[membroId],
                falhasDebate: [...(e.membros[membroId].falhasDebate ?? []), rodada],
              },
            },
          })),
        onConsenso: (rodada, voto) =>
          setEstado((e) => ({ ...e, consensoNaRodada: rodada, consensoVoto: voto })),
        onVereditoDelta: (texto) => setEstado((e) => ({ ...e, veredito: e.veredito + texto })),
        onPlano: (plano) => setEstado((e) => ({ ...e, plano })),
        onPromptDelta: (texto) =>
          setEstado((e) => ({ ...e, promptExecucao: e.promptExecucao + texto })),
        onEntregavelErro: (tipo, mensagem) =>
          setEstado((e) =>
            tipo === 'plano' ? { ...e, erroPlano: mensagem } : { ...e, erroPrompt: mensagem },
          ),
        onConcluida: (reuniao) => {
          gravaReuniao(reuniao)
          if (config.projetoId) anexaReuniaoAoProjeto(config.projetoId, reuniao.id)
          setEstado((e) => ({ ...e, reuniao }))
        },
        onErro: (mensagem) => setEstado((e) => ({ ...e, erro: mensagem })),
      },
    })

    return () => {
      // No StrictMode (dev), o efeito roda 2x: liberamos a guarda para o
      // remonte reiniciar a reunião, e abortamos a execução órfã.
      iniciadaRef.current = false
      abort.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Refaz só a chamada do entregável que falhou e atualiza a reunião salva. */
  const regerarEntregavel = async (tipo: 'plano' | 'prompt') => {
    const transporte = config.demo
      ? criaTransporteDemo()
      : criaTransporte(config.provedor, {
          apiKey: leChave(config.provedor),
          modelo: config.modelo,
          baseUrl: config.provedor === 'anthropic' ? undefined : leBaseUrlDe(config.provedor),
        })
    const ctxRegerar: ContextoEntregavel = {
      config,
      transporte,
      personas: montaPersonas(),
      participantes: MEMBROS_VOTANTES.filter((m) => estado.membros[m.id]?.rodada1).map((m) => ({
        membro: m,
        estado: estado.membros[m.id],
      })),
      veredito: estado.veredito,
      anexos,
    }
    setEstado((e) =>
      tipo === 'plano'
        ? { ...e, regerando: tipo, erroPlano: undefined }
        : { ...e, regerando: tipo, erroPrompt: undefined, promptExecucao: '' },
    )
    try {
      if (tipo === 'plano') {
        const plano = await gerarPlano(ctxRegerar)
        const reuniao = estado.reuniao ? { ...estado.reuniao, plano } : undefined
        if (reuniao) gravaReuniao(reuniao)
        setEstado((e) => ({ ...e, plano, reuniao: reuniao ?? e.reuniao, regerando: undefined }))
      } else {
        const promptExecucao = await gerarPromptExecucao(ctxRegerar, (t) =>
          setEstado((e) => ({ ...e, promptExecucao: e.promptExecucao + t })),
        )
        const reuniao = estado.reuniao ? { ...estado.reuniao, promptExecucao } : undefined
        if (reuniao) gravaReuniao(reuniao)
        setEstado((e) => ({
          ...e,
          promptExecucao,
          reuniao: reuniao ?? e.reuniao,
          regerando: undefined,
        }))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setEstado((e) =>
        tipo === 'plano'
          ? { ...e, erroPlano: msg, regerando: undefined }
          : { ...e, erroPrompt: msg, regerando: undefined },
      )
    }
  }

  const participantes = MEMBROS_VOTANTES.filter((m) => config.membrosIds.includes(m.id))
  const placar = calculaPlacar(estado.membros)
  const totalVotos = placar.aprovar + placar.aprovar_com_ressalvas + placar.rejeitar
  const emAndamento = !existente && estado.fase !== 'concluida' && estado.fase !== 'erro'

  return (
    <div className="sala">
      <div className="sala-topo">
        <div className="sala-ideia">
          <span className="sala-ideia-rotulo">
            {config.demo && <span className="selo-demo">DEMO</span>}{' '}
            {config.pauta ? 'Acompanhamento — pauta da reunião' : 'Ideia em análise'}
          </span>
          <p>{config.pauta ?? config.ideia}</p>
          {config.pauta && projeto && <small className="sala-projeto-nome">Projeto: {projeto.nome}</small>}
        </div>
        <Timeline
          fase={estado.fase}
          rodadaDebate={estado.rodadaDebate}
          totalDebates={config.rodadasDebate}
          ateConsenso={config.ateConsenso ?? false}
          gerarPlano={config.gerarPlano ?? false}
          gerarPrompt={config.gerarPrompt ?? false}
        />
      </div>

      {estado.erro && (
        <div className="aviso aviso-erro">
          <strong>A reunião foi interrompida:</strong> {estado.erro}
        </div>
      )}

      {estado.consensoNaRodada !== undefined &&
        (estado.consensoVoto === 'aprovar' ? (
          <div className="aviso aviso-consenso">
            🤝 <strong>Consenso pleno alcançado!</strong> Todos os conselheiros votaram{' '}
            <strong>Aprovar</strong>
            {estado.consensoNaRodada === 0
              ? ' já nas análises iniciais — não houve necessidade de debate.'
              : ` — as ressalvas foram debatidas e resolvidas em ${estado.consensoNaRodada} rodada${estado.consensoNaRodada > 1 ? 's' : ''} de debate.`}
          </div>
        ) : estado.consensoVoto === 'rejeitar' ? (
          <div className="aviso aviso-consenso-rejeicao">
            🛑 <strong>Consenso pleno: rejeição unânime.</strong> Todos os conselheiros votaram{' '}
            <strong>Rejeitar</strong>
            {estado.consensoNaRodada === 0
              ? ' já nas análises iniciais.'
              : ` após ${estado.consensoNaRodada} rodada${estado.consensoNaRodada > 1 ? 's' : ''} de debate.`}{' '}
            A síntese da Presidente registra o que faria o conselho mudar de posição.
          </div>
        ) : (
          // Registro antigo: a regra anterior aceitava unanimidade de ressalvas.
          <div className="aviso aviso-consenso">
            🤝 <strong>Consenso alcançado</strong> (reunião anterior à regra do consenso pleno):
            todos convergiram para o mesmo voto
            {estado.consensoNaRodada > 0
              ? ` após ${estado.consensoNaRodada} rodada${estado.consensoNaRodada > 1 ? 's' : ''} de debate.`
              : ' nas análises iniciais.'}
          </div>
        ))}

      {config.ateConsenso &&
        estado.consensoNaRodada === undefined &&
        ['sintese', 'plano', 'prompt', 'concluida'].includes(estado.fase) && (
          <div className="aviso aviso-sem-consenso">
            ⚖️ <strong>Consenso pleno não alcançado</strong> após {MAX_RODADAS_CONSENSO} rodadas de
            debate — ressalvas e divergências permanecem. A síntese da Presidente mapeia o que
            destravaria cada uma.
          </div>
        )}

      <div className="sala-corpo">
        <section className="grade-membros" aria-label="Conselheiros">
          {participantes.map((m) => (
            <MemberCard
              key={m.id}
              membro={m}
              estado={estado.membros[m.id]}
              aoClicar={() => setMembroAberto(m.id)}
            />
          ))}
          <MemberCard
            membro={PRESIDENTE}
            estado={{ membroId: PRESIDENTE.id, status: estado.statusPresidente }}
            presidente
          />
        </section>

        <aside className="painel-lateral">
          <VoteTally placar={placar} total={participantes.length} votaram={totalVotos} />
          <VerdictPanel
            veredito={estado.veredito}
            streamando={estado.fase === 'sintese'}
            reuniao={estado.reuniao}
          />
          {(estado.plano || estado.fase === 'plano' || estado.erroPlano) && (
            <section className="painel-plano">
              <h3>📄 Plano detalhado</h3>
              {estado.erroPlano ? (
                <>
                  <p className="painel-plano-nota painel-erro-nota">
                    ⚠️ A geração do plano falhou ({estado.erroPlano}). O restante da reunião foi
                    salvo normalmente.
                  </p>
                  <button
                    className="botao-principal botao-compacto"
                    onClick={() => regerarEntregavel('plano')}
                    disabled={estado.regerando === 'plano'}
                  >
                    {estado.regerando === 'plano' ? 'Gerando…' : '↻ Gerar novamente'}
                  </button>
                </>
              ) : estado.plano ? (
                <>
                  <p className="painel-plano-nota">
                    Documento completo com análise de mercado, SWOT, cronograma, orçamento e
                    riscos — para você avaliar antes de executar.
                  </p>
                  <button className="botao-principal botao-compacto" onClick={() => setPlanoAberto(true)}>
                    Ver plano completo
                  </button>
                </>
              ) : (
                <p className="painel-plano-nota">
                  <span className="cursor-piscando" /> A Presidente está elaborando o plano…
                </p>
              )}
            </section>
          )}
          <PromptPanel
            prompt={estado.promptExecucao}
            streamando={estado.fase === 'prompt' || estado.regerando === 'prompt'}
            erro={estado.erroPrompt}
            aoRegerar={() => regerarEntregavel('prompt')}
          />
          {!emAndamento && (
            <div className="sala-acoes-finais">
              {config.projetoId && aoVerProjeto && (
                <button
                  className="botao-principal"
                  onClick={() => aoVerProjeto(config.projetoId!)}
                  title="Continuar trabalhando neste projeto com a equipe"
                >
                  📁 Ver projeto
                </button>
              )}
              <button className="botao-principal" onClick={aoNovaReuniao}>
                ✨ Nova reunião
              </button>
            </div>
          )}
        </aside>
      </div>

      {membroAberto && (
        <MemberDrawer
          membro={membroPorId(membroAberto)!}
          estado={estado.membros[membroAberto]}
          demo={config.demo}
          aoFechar={() => setMembroAberto(null)}
        />
      )}

      {planoAberto && estado.plano && (
        <PlanDocument plano={estado.plano} demo={config.demo} aoFechar={() => setPlanoAberto(false)} />
      )}
    </div>
  )
}
