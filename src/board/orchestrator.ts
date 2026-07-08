import type {
  AnaliseDebate,
  AnaliseRodada1,
  ConfigReuniao,
  EstadoMembro,
  EventosReuniao,
  Membro,
  Placar,
  Reuniao,
  Transporte,
  Voto,
} from '../types'
import type { Plano } from '../types'
import { MEMBROS_VOTANTES, PRESIDENTE, membroPorId } from './members'
import { SCHEMA_DEBATE, SCHEMA_PLANO, SCHEMA_RODADA1 } from './schemas'
import { promptDebate, promptExecucao, promptPlano, promptRodada1, promptSintese } from './prompts'

const CONCORRENCIA = 4
/** Teto de rodadas no modo "até consenso" — evita reuniões (e custos) infinitos. */
export const MAX_RODADAS_CONSENSO = 5

/** Executa tarefas em paralelo com limite de concorrência (respeita rate limits da API). */
async function emFila<T>(tarefas: (() => Promise<T>)[], limite: number): Promise<void> {
  const pendentes = [...tarefas]
  const executores = Array.from({ length: Math.min(limite, pendentes.length) }, async () => {
    while (pendentes.length > 0) {
      const tarefa = pendentes.shift()!
      await tarefa()
    }
  })
  await Promise.all(executores)
}

function parseJson<T>(texto: string, contexto: string): T {
  try {
    return JSON.parse(texto) as T
  } catch {
    throw new Error(`Resposta inválida (${contexto}): não foi possível interpretar o JSON.`)
  }
}

export function votoFinalDe(estado: EstadoMembro): Voto | undefined {
  if (estado.debate && estado.debate.length > 0) return estado.debate[estado.debate.length - 1].voto
  return estado.rodada1?.voto
}

export function calculaPlacar(membros: Record<string, EstadoMembro>): Placar {
  const placar: Placar = { aprovar: 0, aprovar_com_ressalvas: 0, rejeitar: 0 }
  for (const estado of Object.values(membros)) {
    const voto = votoFinalDe(estado)
    if (voto) placar[voto]++
  }
  return placar
}

export interface OpcoesReuniao {
  config: ConfigReuniao
  transporte: Transporte
  /** systemPrompt efetivo por membro (com overrides do usuário aplicados). */
  personas: Record<string, string>
  eventos: EventosReuniao
  abortar?: AbortSignal
}

export async function conduzirReuniao(opcoes: OpcoesReuniao): Promise<Reuniao | null> {
  const { config, transporte, personas, eventos, abortar } = opcoes
  const participantes: Membro[] = MEMBROS_VOTANTES.filter((m) => config.membrosIds.includes(m.id))
  const membros: Record<string, EstadoMembro> = {}
  for (const m of participantes) {
    membros[m.id] = { membroId: m.id, status: 'aguardando' }
  }

  const cancelado = () => abortar?.aborted === true
  const persona = (m: Membro) => personas[m.id] ?? m.systemPrompt

  try {
    // ── Rodada 1: análises independentes em paralelo ─────────────────────────
    eventos.onFase('rodada1')
    await emFila(
      participantes.map((m) => async () => {
        if (cancelado()) return
        eventos.onStatusMembro(m.id, 'analisando')
        try {
          const texto = await transporte.estruturada({
            system: persona(m),
            user: promptRodada1(config.ideia),
            schema: SCHEMA_RODADA1 as unknown as Record<string, unknown>,
            membroId: m.id,
            signal: abortar,
          })
          const resultado = parseJson<AnaliseRodada1>(texto, m.nome)
          membros[m.id].rodada1 = resultado
          membros[m.id].status = 'pronto'
          eventos.onRodada1(m.id, resultado)
          eventos.onStatusMembro(m.id, 'pronto')
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          membros[m.id].status = 'erro'
          membros[m.id].erro = msg
          eventos.onStatusMembro(m.id, 'erro', msg)
        }
      }),
      CONCORRENCIA,
    )
    if (cancelado()) return null

    const ativos = participantes.filter((m) => membros[m.id].rodada1)
    if (ativos.length === 0) {
      eventos.onErro('Nenhum conselheiro conseguiu analisar a ideia. Verifique sua chave de API em Configurações.')
      eventos.onFase('erro')
      return null
    }

    // ── Rodadas de debate ────────────────────────────────────────────────────
    const unanimidade = (): Voto | null => {
      const votos = ativos.map((m) => votoFinalDe(membros[m.id])).filter((v): v is Voto => Boolean(v))
      if (votos.length < ativos.length) return null
      return votos.every((v) => v === votos[0]) ? votos[0] : null
    }

    const maxRodadas = config.ateConsenso ? MAX_RODADAS_CONSENSO : config.rodadasDebate
    let consensoNaRodada: number | undefined

    for (let rodada = 1; rodada <= maxRodadas; rodada++) {
      if (cancelado()) return null
      // No modo consenso, se todos já concordam não há o que debater.
      if (config.ateConsenso && unanimidade()) {
        consensoNaRodada = rodada - 1
        eventos.onConsenso(rodada - 1)
        break
      }
      eventos.onFase('debate', rodada)
      await emFila(
        ativos.map((m) => async () => {
          if (cancelado()) return
          eventos.onStatusMembro(m.id, 'analisando')
          try {
            const colegas = ativos
              .filter((c) => c.id !== m.id)
              .map((c) => ({ membro: c, estado: membros[c.id] }))
            const texto = await transporte.estruturada({
              system: persona(m),
              user: promptDebate(
                config.ideia,
                membros[m.id].rodada1!,
                membros[m.id].debate ?? [],
                colegas,
                rodada,
              ),
              schema: SCHEMA_DEBATE as unknown as Record<string, unknown>,
              membroId: m.id,
              signal: abortar,
            })
            const resultado = parseJson<AnaliseDebate>(texto, m.nome)
            membros[m.id].debate = [...(membros[m.id].debate ?? []), resultado]
            membros[m.id].status = 'pronto'
            eventos.onDebate(m.id, rodada, resultado)
            eventos.onStatusMembro(m.id, 'pronto')
          } catch {
            // Falha no debate não derruba o membro: mantém posição da rodada anterior.
            membros[m.id].status = 'pronto'
            eventos.onStatusMembro(m.id, 'pronto')
          }
        }),
        CONCORRENCIA,
      )
    }
    // Consenso alcançado na última rodada possível: registra também.
    if (config.ateConsenso && consensoNaRodada === undefined && unanimidade()) {
      consensoNaRodada = maxRodadas
      eventos.onConsenso(maxRodadas)
    }
    if (cancelado()) return null

    // ── Síntese do Presidente (streamada) ────────────────────────────────────
    eventos.onFase('sintese')
    eventos.onStatusMembro(PRESIDENTE.id, 'analisando')
    const veredito = await transporte.streamada({
      system: personas[PRESIDENTE.id] ?? PRESIDENTE.systemPrompt,
      user: promptSintese(
        config.ideia,
        ativos.map((m) => ({ membro: m, estado: membros[m.id] })),
      ),
      proposito: 'sintese',
      onDelta: (t) => {
        if (!cancelado()) eventos.onVereditoDelta(t)
      },
      signal: abortar,
    })
    if (cancelado()) return null
    eventos.onStatusMembro(PRESIDENTE.id, 'pronto')

    // ── Plano detalhado (documento visual/PDF — opcional, estruturado) ──────
    let plano: Plano | undefined
    if (config.gerarPlano) {
      eventos.onFase('plano')
      eventos.onStatusMembro(PRESIDENTE.id, 'analisando')
      const textoPlano = await transporte.estruturada({
        system: personas[PRESIDENTE.id] ?? PRESIDENTE.systemPrompt,
        user: promptPlano(
          config.ideia,
          ativos.map((m) => ({ membro: m, estado: membros[m.id] })),
          veredito,
        ),
        schema: SCHEMA_PLANO as unknown as Record<string, unknown>,
        membroId: PRESIDENTE.id,
        signal: abortar,
      })
      if (cancelado()) return null
      plano = parseJson<Plano>(textoPlano, 'plano')
      eventos.onPlano(plano)
      eventos.onStatusMembro(PRESIDENTE.id, 'pronto')
    }

    // ── Prompt de execução para agentes de programação (opcional, streamado) ─
    let promptExec: string | undefined
    if (config.gerarPrompt) {
      eventos.onFase('prompt')
      eventos.onStatusMembro(PRESIDENTE.id, 'analisando')
      promptExec = await transporte.streamada({
        system: personas[PRESIDENTE.id] ?? PRESIDENTE.systemPrompt,
        user: promptExecucao(
          config.ideia,
          ativos.map((m) => ({ membro: m, estado: membros[m.id] })),
          veredito,
        ),
        proposito: 'prompt',
        onDelta: (t) => {
          if (!cancelado()) eventos.onPromptDelta(t)
        },
        signal: abortar,
      })
      if (cancelado()) return null
      eventos.onStatusMembro(PRESIDENTE.id, 'pronto')
    }

    const reuniao: Reuniao = {
      id: `reuniao-${Date.now()}`,
      data: new Date().toISOString(),
      config,
      membros,
      veredito,
      promptExecucao: promptExec,
      plano,
      placar: calculaPlacar(membros),
      fase: 'concluida',
      consensoNaRodada,
    }
    eventos.onFase('concluida')
    eventos.onConcluida(reuniao)
    return reuniao
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    eventos.onErro(msg)
    eventos.onFase('erro')
    return null
  }
}

export { membroPorId }
