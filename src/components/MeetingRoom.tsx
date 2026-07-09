import { useEffect, useMemo, useRef, useState } from 'react'
import type { ConfigReuniao, ContextoProjeto, EstadoMembro, FaseReuniao, Plano, Reuniao, Voto } from '../types'
import { MEMBROS, MEMBROS_VOTANTES, PRESIDENTE, membroPorId } from '../board/members'
import {
  conduzirReuniao,
  calculaPlacar,
  gerarPlano,
  gerarPromptExecucao,
  gerarSintese,
  votoDoConsenso,
  votoFinalDe,
  MAX_RODADAS_CONSENSO,
  type ContextoEntregavel,
  type ContextoSintese,
} from '../board/orchestrator'
import { personaEfetiva, ROTULO_VOTO } from '../board/prompts'
import { criaTransporte } from '../api'
import { custoUsd, formataUsd } from '../api/precos'
import { criaTransporteDemo } from '../board/demo'
import { resumoDeCodigo } from '../lib/pastaLocal'
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
import { ClaudeCodePanel } from './ClaudeCodePanel'
import { Timeline } from './Timeline'
import { promptParaClaudeCode } from '../board/claudeCode'

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
  /** Abre as Configurações (para conectar uma API) — usado no CTA pós-demo. */
  aoAbrirConfiguracoes?: () => void
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
  /** A síntese falhou — análises e debate foram preservados; dá para regerar. */
  erroSintese?: string
  regerando?: 'plano' | 'prompt' | 'sintese'
  /** localStorage estourou ao salvar a reunião concluída — precisa avisar. */
  falhouSalvar?: boolean
  /** Reunião interrompida manualmente pelo usuário. */
  interrompida?: boolean
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
      erroSintese: existente.erroSintese ? 'A síntese não foi gerada nesta reunião.' : undefined,
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

export function MeetingRoom({
  config,
  existente,
  aoNovaReuniao,
  aoVerProjeto,
  aoAbrirConfiguracoes,
}: Props) {
  const [estado, setEstado] = useState<EstadoUI>(() => estadoInicial(config, existente))
  const [membroAberto, setMembroAberto] = useState<string | null>(null)
  const [planoAberto, setPlanoAberto] = useState(false)
  const [briefingCC, setBriefingCC] = useState<string | null>(null)
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
      repo: resumoDeCodigo({ repo: projeto?.repo, pastaLocal: projeto?.pastaLocal }),
      reuniaoAnterior:
        config.pauta && config.projetoId ? resumoReuniaoAnterior(config.projetoId) : undefined,
    }),
    [projeto, config.pauta, config.projetoId],
  )

  // Transporte (real ou demo) — reusado pela reunião e pelas regenerações.
  // O provedor real carrega o SDK sob demanda (import dinâmico), por isso async;
  // o demo é síncrono e não puxa SDK (mantém a amostra instantânea).
  const montaTransporte = async () =>
    config.demo
      ? criaTransporteDemo()
      : await criaTransporte(config.provedor, {
          apiKey: leChave(config.provedor),
          modelo: config.modelo,
          baseUrl: config.provedor === 'anthropic' ? undefined : leBaseUrlDe(config.provedor),
        })

  useEffect(() => {
    if (existente || iniciadaRef.current) return
    iniciadaRef.current = true // evita reexecução no StrictMode do React

    const abort = new AbortController()
    abortRef.current = abort

    montaTransporte().then((transporte) => {
      if (abort.signal.aborted) return
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
        onErroSintese: (mensagem) => setEstado((e) => ({ ...e, erroSintese: mensagem })),
        onPlano: (plano) => setEstado((e) => ({ ...e, plano })),
        onPromptDelta: (texto) =>
          setEstado((e) => ({ ...e, promptExecucao: e.promptExecucao + texto })),
        onEntregavelErro: (tipo, mensagem) =>
          setEstado((e) =>
            tipo === 'plano' ? { ...e, erroPlano: mensagem } : { ...e, erroPrompt: mensagem },
          ),
        onConcluida: (reuniao) => {
          const salvou = gravaReuniao(reuniao)
          if (salvou && config.projetoId) anexaReuniaoAoProjeto(config.projetoId, reuniao.id)
          setEstado((e) => ({ ...e, reuniao, falhouSalvar: !salvou }))
        },
        onErro: (mensagem) => setEstado((e) => ({ ...e, erro: mensagem })),
      },
      })
    }).catch((err) => {
      // Falha ao carregar o SDK do provedor (import dinâmico) ou ao montar o transporte.
      if (abort.signal.aborted) return
      setEstado((e) => ({
        ...e,
        fase: 'erro',
        erro: err instanceof Error ? err.message : String(err),
      }))
    })

    return () => {
      // No StrictMode (dev), o efeito roda 2x: liberamos a guarda para o
      // remonte reiniciar a reunião, e abortamos a execução órfã.
      iniciadaRef.current = false
      abort.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Participantes (com análise) reconstruídos do estado atual — para regerar. */
  const participantesComAnalise = () =>
    MEMBROS_VOTANTES.filter((m) => estado.membros[m.id]?.rodada1).map((m) => ({
      membro: m,
      estado: estado.membros[m.id],
    }))

  /** Regenera a síntese quando ela falhou — as análises e o debate já estavam
   *  salvos, então aqui só refazemos o veredito (e os entregáveis, se pedidos). */
  const regerarSintese = async () => {
    const transporte = await montaTransporte()
    const personas = montaPersonas()
    const participantes = participantesComAnalise()
    const ctxSintese: ContextoSintese = {
      config,
      transporte,
      personas,
      participantes,
      consenso: config.ateConsenso
        ? {
            alcancado: estado.consensoNaRodada !== undefined,
            rodada: estado.consensoNaRodada,
            voto: estado.consensoVoto,
            maxRodadas: MAX_RODADAS_CONSENSO,
          }
        : undefined,
    }
    setEstado((e) => ({ ...e, regerando: 'sintese', erroSintese: undefined, veredito: '' }))
    try {
      const veredito = await gerarSintese(ctxSintese, (t) =>
        setEstado((e) => ({ ...e, veredito: e.veredito + t })),
      )
      let reuniao = estado.reuniao ? { ...estado.reuniao, veredito, erroSintese: undefined } : undefined
      // Gera os entregáveis que haviam sido pulados quando a síntese falhou.
      const ctxEnt: ContextoEntregavel = { config, transporte, personas, participantes, veredito, anexos }
      if (config.gerarPlano) {
        try {
          const plano = await gerarPlano(ctxEnt)
          reuniao = reuniao ? { ...reuniao, plano } : undefined
          setEstado((e) => ({ ...e, plano }))
        } catch (err) {
          setEstado((e) => ({ ...e, erroPlano: err instanceof Error ? err.message : String(err) }))
        }
      }
      if (config.gerarPrompt) {
        try {
          const promptExecucao = await gerarPromptExecucao(ctxEnt, (t) =>
            setEstado((e) => ({ ...e, promptExecucao: e.promptExecucao + t })),
          )
          reuniao = reuniao ? { ...reuniao, promptExecucao } : undefined
        } catch (err) {
          setEstado((e) => ({ ...e, erroPrompt: err instanceof Error ? err.message : String(err) }))
        }
      }
      const falhouSalvar = reuniao ? !gravaReuniao(reuniao) : false
      setEstado((e) => ({
        ...e,
        reuniao: reuniao ?? e.reuniao,
        regerando: undefined,
        erroSintese: undefined,
        falhouSalvar,
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setEstado((e) => ({ ...e, erroSintese: msg, regerando: undefined }))
    }
  }

  /** Interrompe uma reunião em andamento (aborta as chamadas em curso). */
  const interromperReuniao = () => {
    abortRef.current?.abort()
    setEstado((e) => ({ ...e, fase: 'erro', interrompida: true }))
  }

  /** Refaz só a chamada do entregável que falhou e atualiza a reunião salva. */
  const regerarEntregavel = async (tipo: 'plano' | 'prompt') => {
    const transporte = await montaTransporte()
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
        const falhouSalvar = reuniao ? !gravaReuniao(reuniao) : false
        setEstado((e) => ({ ...e, plano, reuniao: reuniao ?? e.reuniao, regerando: undefined, falhouSalvar }))
      } else {
        const promptExecucao = await gerarPromptExecucao(ctxRegerar, (t) =>
          setEstado((e) => ({ ...e, promptExecucao: e.promptExecucao + t })),
        )
        const reuniao = estado.reuniao ? { ...estado.reuniao, promptExecucao } : undefined
        const falhouSalvar = reuniao ? !gravaReuniao(reuniao) : false
        setEstado((e) => ({
          ...e,
          promptExecucao,
          reuniao: reuniao ?? e.reuniao,
          regerando: undefined,
          falhouSalvar,
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
  // Custo real: só quando há tokens medidos E preço conhecido do modelo (nunca no demo).
  const uso = estado.reuniao?.usoTokens
  const custo = uso ? custoUsd(config.modelo, uso) : undefined
  const custoDaReuniao = !config.demo && custo !== undefined ? formataUsd(custo) : undefined

  // Resumo do conselho: 13 vozes agrupadas por voto, cada uma com a frase citável.
  const resumoPorVoto: Record<Voto, { nome: string; emoji: string; frase: string }[]> = {
    aprovar: [],
    aprovar_com_ressalvas: [],
    rejeitar: [],
  }
  for (const m of participantes) {
    const est = estado.membros[m.id]
    if (!est?.rodada1) continue
    const voto = votoFinalDe(est)
    if (!voto) continue
    const ultimo = est.debate && est.debate.length > 0 ? est.debate[est.debate.length - 1] : undefined
    resumoPorVoto[voto].push({
      nome: m.nome,
      emoji: m.emoji,
      frase: ultimo?.justificativa ?? est.rodada1.justificativa,
    })
  }
  const temResumo = Object.values(resumoPorVoto).some((g) => g.length > 0)

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
        {emAndamento && (
          <button
            className="botao-secundario botao-compacto sala-interromper"
            onClick={interromperReuniao}
            title="Parar as chamadas de IA em andamento"
          >
            ⏹ Interromper reunião
          </button>
        )}
      </div>

      {estado.erro && (
        <div className="aviso aviso-erro">
          <strong>A reunião foi interrompida:</strong> {estado.erro}
        </div>
      )}

      {estado.interrompida && (
        <div className="aviso aviso-erro">
          <strong>Reunião interrompida por você.</strong> As chamadas de IA em andamento foram
          canceladas. Comece uma nova reunião quando quiser.
        </div>
      )}

      {estado.falhouSalvar && (
        <div className="aviso aviso-erro">
          <strong>Não foi possível salvar esta reunião</strong> — o armazenamento do navegador está
          cheio. Ela <em>não</em> ficará no histórico do projeto. Use os botões de exportar no
          veredito (Markdown, JSON ou Obsidian) para guardar o resultado agora, e depois exclua
          projetos ou anexos antigos para liberar espaço.
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
          {custoDaReuniao && (
            <p className="sala-custo" title="Estimativa a partir dos tokens realmente consumidos">
              💵 Esta reunião custou <strong>≈ {custoDaReuniao}</strong> em uso de API.
            </p>
          )}
          {estado.erroSintese && !emAndamento ? (
            <section className="painel-plano">
              <h3>📋 Síntese da Presidente</h3>
              <p className="painel-plano-nota painel-erro-nota">
                ⚠️ A síntese falhou ({estado.erroSintese}). As análises e o debate dos conselheiros
                foram <strong>salvos</strong> — nada do que você pagou se perdeu. Gere a síntese
                novamente para concluir o veredito e os entregáveis.
              </p>
              <button
                className="botao-principal botao-compacto"
                onClick={regerarSintese}
                disabled={estado.regerando === 'sintese'}
              >
                {estado.regerando === 'sintese' ? 'Gerando…' : '↻ Gerar síntese novamente'}
              </button>
            </section>
          ) : (
            <VerdictPanel
              veredito={estado.veredito}
              streamando={estado.fase === 'sintese' || estado.regerando === 'sintese'}
              reuniao={estado.reuniao}
            />
          )}
          {estado.fase === 'concluida' && temResumo && (
            <details className="resumo-conselho">
              <summary>🗳️ Resumo do conselho — cada voz em uma frase</summary>
              {(['aprovar', 'aprovar_com_ressalvas', 'rejeitar'] as Voto[]).map((v) =>
                resumoPorVoto[v].length > 0 ? (
                  <div key={v} className="resumo-grupo">
                    <h4>
                      {ROTULO_VOTO[v]} ({resumoPorVoto[v].length})
                    </h4>
                    <ul>
                      {resumoPorVoto[v].map((x, i) => (
                        <li key={i}>
                          {x.emoji} <strong>{x.nome}</strong>: <em>“{x.frase}”</em>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null,
              )}
            </details>
          )}
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
          {!emAndamento && config.demo && (
            // CTA de conversão: o fim da demo é o momento de maior intenção.
            // Os dois caminhos (pago e grátis) têm peso IGUAL.
            <div className="cartao-conversao">
              <h3>Isto foi uma simulação 🎭</h3>
              <p>
                Os votos acima são ilustrativos. Quer a análise <strong>real</strong> do seu
                conselho, com os 13 conselheiros de verdade?
              </p>
              <div className="cartao-conversao-botoes">
                {aoAbrirConfiguracoes && (
                  <button className="botao-principal" onClick={aoAbrirConfiguracoes}>
                    🔌 Conectar API e rodar de verdade
                  </button>
                )}
                <button
                  className="botao-principal"
                  onClick={() =>
                    setBriefingCC(
                      promptParaClaudeCode({
                        ideia: config.ideia,
                        anexos,
                        repoResumo: projeto?.repo?.resumo,
                        repoUrl: projeto?.repo?.url,
                        pastaLocal: projeto?.pastaLocal,
                        rodadasDebate: config.rodadasDebate,
                        ateConsenso: config.ateConsenso,
                      }),
                    )
                  }
                >
                  🖥 Rodar no Claude Code — grátis no seu plano
                </button>
              </div>
              <button className="link link-sutil" onClick={aoNovaReuniao}>
                ✨ Nova simulação
              </button>
            </div>
          )}
          {!emAndamento && !config.demo && (
            <div className="sala-acoes-finais">
              {config.projetoId && aoVerProjeto ? (
                <>
                  <button
                    className="botao-principal"
                    onClick={() => aoVerProjeto(config.projetoId!)}
                    title="Continuar trabalhando neste projeto com a equipe"
                  >
                    📁 Continuar este projeto com a equipe
                  </button>
                  <p className="campo-dica">
                    Este pitch já é um <strong>projeto</strong> — a equipe continua com você reunião
                    após reunião. Volte quando algo mudar e traga a pauta.
                  </p>
                  <button className="link link-sutil" onClick={aoNovaReuniao}>
                    ✨ Nova reunião (outro projeto)
                  </button>
                </>
              ) : (
                <button className="botao-principal" onClick={aoNovaReuniao}>
                  ✨ Nova reunião
                </button>
              )}
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

      {briefingCC && <ClaudeCodePanel prompt={briefingCC} aoFechar={() => setBriefingCC(null)} />}
    </div>
  )
}
