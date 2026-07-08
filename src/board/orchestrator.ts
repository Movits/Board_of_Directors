import type {
  AnaliseDebate,
  AnaliseRodada1,
  Anexo,
  ConfigReuniao,
  ContextoProjeto,
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
import type { ExtrasRodada1 } from './prompts'
import { anexosTextuais, descreveAnexos } from '../lib/anexos'

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

/** Voto do consenso de uma reunião salva. Registros antigos (regra anterior
 *  aceitava unanimidade de ressalvas) não têm consensoVoto: deriva do placar. */
export function votoDoConsenso(reuniao: Reuniao): Voto | undefined {
  if (reuniao.consensoNaRodada === undefined) return undefined
  if (reuniao.consensoVoto) return reuniao.consensoVoto
  const entradas = (Object.entries(reuniao.placar) as [Voto, number][]).filter(([, n]) => n > 0)
  return entradas.length === 1 ? entradas[0][0] : undefined
}

export interface OpcoesReuniao {
  config: ConfigReuniao
  transporte: Transporte
  /** systemPrompt efetivo por membro (com overrides do usuário aplicados). */
  personas: Record<string, string>
  eventos: EventosReuniao
  abortar?: AbortSignal
  /** Anexos do projeto (imagens/PDF vão nas chamadas; textos entram no prompt). */
  anexos?: Anexo[]
  /** Contexto do projeto: digest do repositório e resumo da reunião anterior. */
  contexto?: ContextoProjeto
}

/** Contexto mínimo para gerar (ou regerar) um entregável após a síntese. */
export interface ContextoEntregavel {
  config: ConfigReuniao
  transporte: Transporte
  personas: Record<string, string>
  participantes: { membro: Membro; estado: EstadoMembro }[]
  veredito: string
  abortar?: AbortSignal
  anexos?: Anexo[]
}

export async function gerarPlano(ctx: ContextoEntregavel): Promise<Plano> {
  const texto = await ctx.transporte.estruturada({
    system: ctx.personas[PRESIDENTE.id] ?? PRESIDENTE.systemPrompt,
    user: promptPlano(ctx.config.ideia, ctx.participantes, ctx.veredito),
    schema: SCHEMA_PLANO as unknown as Record<string, unknown>,
    membroId: PRESIDENTE.id,
    signal: ctx.abortar,
    anexos: ctx.anexos,
  })
  return parseJson<Plano>(texto, 'plano')
}

export async function gerarPromptExecucao(
  ctx: ContextoEntregavel,
  onDelta: (texto: string) => void,
): Promise<string> {
  return ctx.transporte.streamada({
    system: ctx.personas[PRESIDENTE.id] ?? PRESIDENTE.systemPrompt,
    user: promptExecucao(ctx.config.ideia, ctx.participantes, ctx.veredito),
    proposito: 'prompt',
    onDelta,
    signal: ctx.abortar,
    anexos: ctx.anexos,
  })
}

export async function conduzirReuniao(opcoes: OpcoesReuniao): Promise<Reuniao | null> {
  const { config, transporte, personas, eventos, abortar, anexos = [], contexto } = opcoes
  const participantes: Membro[] = MEMBROS_VOTANTES.filter((m) => config.membrosIds.includes(m.id))
  const membros: Record<string, EstadoMembro> = {}
  for (const m of participantes) {
    membros[m.id] = { membroId: m.id, status: 'aguardando' }
  }

  const cancelado = () => abortar?.aborted === true
  const persona = (m: Membro) => personas[m.id] ?? m.systemPrompt

  // Materiais do projeto que acompanham o pitch na rodada de análises
  const extras: ExtrasRodada1 = {
    repo: contexto?.repo,
    reuniaoAnterior: contexto?.reuniaoAnterior,
    pauta: config.pauta,
    anexosTexto: anexosTextuais(anexos) || undefined,
    listaAnexos: descreveAnexos(anexos) || undefined,
  }

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
            user: promptRodada1(config.ideia, extras),
            schema: SCHEMA_RODADA1 as unknown as Record<string, unknown>,
            membroId: m.id,
            signal: abortar,
            anexos,
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
    // Consenso PLENO: todos 'aprovar' ou todos 'rejeitar'. Unanimidade de
    // "aprovar com ressalvas" NÃO encerra — ressalva é pendência a debater.
    const consensoPleno = (): 'aprovar' | 'rejeitar' | null => {
      const votos = ativos.map((m) => votoFinalDe(membros[m.id])).filter((v): v is Voto => Boolean(v))
      if (votos.length < ativos.length) return null
      const primeiro = votos[0]
      if (primeiro === 'aprovar_com_ressalvas') return null
      return votos.every((v) => v === primeiro) ? primeiro : null
    }

    const maxRodadas = config.ateConsenso ? MAX_RODADAS_CONSENSO : config.rodadasDebate
    let consensoNaRodada: number | undefined
    let consensoVoto: Voto | undefined

    for (let rodada = 1; rodada <= maxRodadas; rodada++) {
      if (cancelado()) return null
      // No modo consenso, se o pleno já foi atingido não há o que debater.
      const votoConsenso = config.ateConsenso ? consensoPleno() : null
      if (votoConsenso) {
        consensoNaRodada = rodada - 1
        consensoVoto = votoConsenso
        eventos.onConsenso(rodada - 1, votoConsenso)
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
                config.ateConsenso,
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
            if (cancelado()) return
            // Falha no debate não derruba o membro: mantém posição da rodada anterior.
            membros[m.id].falhasDebate = [...(membros[m.id].falhasDebate ?? []), rodada]
            membros[m.id].status = 'pronto'
            eventos.onDebateFalhou(m.id, rodada)
            eventos.onStatusMembro(m.id, 'pronto')
          }
        }),
        CONCORRENCIA,
      )
    }
    // Consenso alcançado na última rodada possível: registra também.
    if (config.ateConsenso && consensoNaRodada === undefined) {
      const votoConsenso = consensoPleno()
      if (votoConsenso) {
        consensoNaRodada = maxRodadas
        consensoVoto = votoConsenso
        eventos.onConsenso(maxRodadas, votoConsenso)
      }
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
        config.ateConsenso
          ? {
              alcancado: consensoNaRodada !== undefined,
              rodada: consensoNaRodada,
              voto: consensoVoto,
              maxRodadas: MAX_RODADAS_CONSENSO,
            }
          : undefined,
      ),
      proposito: 'sintese',
      onDelta: (t) => {
        if (!cancelado()) eventos.onVereditoDelta(t)
      },
      signal: abortar,
    })
    if (cancelado()) return null
    eventos.onStatusMembro(PRESIDENTE.id, 'pronto')

    // ── Entregáveis (opcionais e NÃO-fatais: falha aqui não perde a reunião) ─
    const ctxEntregavel: ContextoEntregavel = {
      config,
      transporte,
      personas,
      participantes: ativos.map((m) => ({ membro: m, estado: membros[m.id] })),
      veredito,
      abortar,
      anexos,
    }

    // Plano detalhado (documento visual/PDF — estruturado)
    let plano: Plano | undefined
    if (config.gerarPlano) {
      eventos.onFase('plano')
      eventos.onStatusMembro(PRESIDENTE.id, 'analisando')
      try {
        plano = await gerarPlano(ctxEntregavel)
        if (cancelado()) return null
        eventos.onPlano(plano)
      } catch (err) {
        if (cancelado()) return null
        eventos.onEntregavelErro('plano', err instanceof Error ? err.message : String(err))
      }
      eventos.onStatusMembro(PRESIDENTE.id, 'pronto')
    }

    // Prompt de execução para agentes de programação (streamado)
    let promptExec: string | undefined
    if (config.gerarPrompt) {
      eventos.onFase('prompt')
      eventos.onStatusMembro(PRESIDENTE.id, 'analisando')
      try {
        promptExec = await gerarPromptExecucao(ctxEntregavel, (t) => {
          if (!cancelado()) eventos.onPromptDelta(t)
        })
        if (cancelado()) return null
      } catch (err) {
        if (cancelado()) return null
        eventos.onEntregavelErro('prompt', err instanceof Error ? err.message : String(err))
      }
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
      consensoVoto,
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
