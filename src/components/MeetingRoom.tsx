import { useEffect, useRef, useState } from 'react'
import type { ConfigReuniao, EstadoMembro, FaseReuniao, Reuniao } from '../types'
import { MEMBROS_VOTANTES, PRESIDENTE, membroPorId } from '../board/members'
import { conduzirReuniao, calculaPlacar } from '../board/orchestrator'
import { criaTransporte } from '../api'
import { criaTransporteDemo } from '../board/demo'
import { leBaseUrl, leChave, lePersonas, gravaReuniao } from '../lib/storage'
import { MemberCard } from './MemberCard'
import { MemberDrawer } from './MemberDrawer'
import { VoteTally } from './VoteTally'
import { VerdictPanel } from './VerdictPanel'
import { PromptPanel } from './PromptPanel'
import { Timeline } from './Timeline'

interface Props {
  config: ConfigReuniao
  existente?: Reuniao
  aoNovaReuniao: () => void
}

interface EstadoUI {
  fase: FaseReuniao
  rodadaDebate: number
  membros: Record<string, EstadoMembro>
  statusPresidente: EstadoMembro['status']
  veredito: string
  promptExecucao: string
  consensoNaRodada?: number
  erro?: string
  reuniao?: Reuniao
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
      consensoNaRodada: existente.consensoNaRodada,
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

export function MeetingRoom({ config, existente, aoNovaReuniao }: Props) {
  const [estado, setEstado] = useState<EstadoUI>(() => estadoInicial(config, existente))
  const [membroAberto, setMembroAberto] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const iniciadaRef = useRef(false)

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
          baseUrl: config.provedor === 'openai' ? leBaseUrl() : undefined,
        })

    conduzirReuniao({
      config,
      transporte,
      personas: lePersonas(),
      abortar: abort.signal,
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
        onConsenso: (rodada) => setEstado((e) => ({ ...e, consensoNaRodada: rodada })),
        onVereditoDelta: (texto) => setEstado((e) => ({ ...e, veredito: e.veredito + texto })),
        onPromptDelta: (texto) =>
          setEstado((e) => ({ ...e, promptExecucao: e.promptExecucao + texto })),
        onConcluida: (reuniao) => {
          gravaReuniao(reuniao)
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

  const participantes = MEMBROS_VOTANTES.filter((m) => config.membrosIds.includes(m.id))
  const placar = calculaPlacar(estado.membros)
  const totalVotos = placar.aprovar + placar.aprovar_com_ressalvas + placar.rejeitar
  const emAndamento = !existente && estado.fase !== 'concluida' && estado.fase !== 'erro'

  return (
    <div className="sala">
      <div className="sala-topo">
        <div className="sala-ideia">
          <span className="sala-ideia-rotulo">
            {config.demo && <span className="selo-demo">DEMO</span>} Ideia em análise
          </span>
          <p>{config.ideia}</p>
        </div>
        <Timeline
          fase={estado.fase}
          rodadaDebate={estado.rodadaDebate}
          totalDebates={config.rodadasDebate}
          ateConsenso={config.ateConsenso ?? false}
          gerarPrompt={config.gerarPrompt ?? false}
        />
      </div>

      {estado.erro && (
        <div className="aviso aviso-erro">
          <strong>A reunião foi interrompida:</strong> {estado.erro}
        </div>
      )}

      {estado.consensoNaRodada !== undefined && (
        <div className="aviso aviso-consenso">
          🤝 <strong>Consenso alcançado!</strong>{' '}
          {estado.consensoNaRodada === 0
            ? 'Os conselheiros já concordaram nas análises iniciais — não houve necessidade de debate.'
            : `Todos os conselheiros convergiram para o mesmo voto após ${estado.consensoNaRodada} rodada${estado.consensoNaRodada > 1 ? 's' : ''} de debate.`}
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
          <PromptPanel prompt={estado.promptExecucao} streamando={estado.fase === 'prompt'} />
          {!emAndamento && (
            <button className="botao-principal" onClick={aoNovaReuniao}>
              ✨ Nova reunião
            </button>
          )}
        </aside>
      </div>

      {membroAberto && (
        <MemberDrawer
          membro={membroPorId(membroAberto)!}
          estado={estado.membros[membroAberto]}
          aoFechar={() => setMembroAberto(null)}
        />
      )}
    </div>
  )
}
