import { describe, expect, it } from 'vitest'
import { calculaPlacar, consensoPleno, votoDoConsenso, votoFinalDe } from './orchestrator'
import type {
  AnaliseDebate,
  AnaliseRodada1,
  ConfigReuniao,
  EstadoMembro,
  Membro,
  Reuniao,
  Voto,
} from '../types'

// ── Fixtures mínimos (honestos aos tipos reais) ──────────────────────────────

function analiseRodada1(voto: Voto): AnaliseRodada1 {
  return {
    analise: 'Análise de teste.',
    estrategias: [],
    riscos: [],
    perguntas: [],
    voto,
    justificativa: 'Justificativa de teste.',
    confianca: 3,
  }
}

function analiseDebate(voto: Voto): AnaliseDebate {
  return {
    reacoes: [],
    mudou_voto: false,
    voto,
    justificativa: 'Justificativa de teste.',
  }
}

/** Estado de um membro: voto da rodada 1 e sequência de votos no debate. */
function estadoDe(id: string, votoR1?: Voto, votosDebate: Voto[] = []): EstadoMembro {
  return {
    membroId: id,
    status: votoR1 ? 'pronto' : 'erro',
    ...(votoR1 ? { rodada1: analiseRodada1(votoR1) } : { erro: 'Falha simulada.' }),
    ...(votosDebate.length > 0 ? { debate: votosDebate.map(analiseDebate) } : {}),
  }
}

function membroDe(id: string): Membro {
  return {
    id,
    nome: `Conselheiro ${id}`,
    cargo: 'Conselheiro',
    emoji: '*',
    cor: '#888888',
    descricao: 'Membro de teste.',
    systemPrompt: 'Você é um conselheiro de teste.',
  }
}

/** Mesa do conselho: um membro ativo por voto final informado. */
function mesa(...votos: (Voto | undefined)[]): {
  ativos: Membro[]
  membros: Record<string, EstadoMembro>
} {
  const ativos = votos.map((_, i) => membroDe(`m${i + 1}`))
  const membros: Record<string, EstadoMembro> = {}
  votos.forEach((voto, i) => {
    membros[`m${i + 1}`] = estadoDe(`m${i + 1}`, voto)
  })
  return { ativos, membros }
}

const configBase: ConfigReuniao = {
  ideia: 'Ideia de teste.',
  provedor: 'anthropic',
  modelo: 'modelo-teste',
  membrosIds: ['m1', 'm2'],
  rodadasDebate: 2,
  ateConsenso: true,
  gerarPrompt: false,
  gerarPlano: false,
  demo: true,
}

function reuniaoDe(sobrescreve: Partial<Reuniao>): Reuniao {
  return {
    id: 'reuniao-teste',
    data: '2026-07-09T12:00:00.000Z',
    config: configBase,
    membros: {},
    veredito: 'Veredito de teste.',
    placar: { aprovar: 0, aprovar_com_ressalvas: 0, rejeitar: 0 },
    fase: 'concluida',
    ...sobrescreve,
  }
}

// ── votoFinalDe ──────────────────────────────────────────────────────────────

describe('votoFinalDe', () => {
  it('sem debate, vale o voto da rodada 1', () => {
    expect(votoFinalDe(estadoDe('m1', 'aprovar'))).toBe('aprovar')
  })

  it('o ÚLTIMO voto do debate prevalece sobre a rodada 1', () => {
    const estado = estadoDe('m1', 'rejeitar', ['aprovar_com_ressalvas', 'aprovar'])
    expect(votoFinalDe(estado)).toBe('aprovar')
  })

  it('debate vazio (array sem rodadas) cai no voto da rodada 1', () => {
    const estado: EstadoMembro = { ...estadoDe('m1', 'rejeitar'), debate: [] }
    expect(votoFinalDe(estado)).toBe('rejeitar')
  })

  it('membro sem análise nenhuma retorna undefined', () => {
    expect(votoFinalDe(estadoDe('m1'))).toBeUndefined()
  })
})

// ── calculaPlacar ────────────────────────────────────────────────────────────

describe('calculaPlacar', () => {
  it('conta os votos finais por categoria', () => {
    const { membros } = mesa('aprovar', 'aprovar', 'aprovar_com_ressalvas', 'rejeitar')
    expect(calculaPlacar(membros)).toEqual({ aprovar: 2, aprovar_com_ressalvas: 1, rejeitar: 1 })
  })

  it('ignora membros sem voto (erro na rodada 1) — estado parcial', () => {
    const { membros } = mesa('aprovar', undefined, 'rejeitar')
    expect(calculaPlacar(membros)).toEqual({ aprovar: 1, aprovar_com_ressalvas: 0, rejeitar: 1 })
  })

  it('mesa vazia zera o placar', () => {
    expect(calculaPlacar({})).toEqual({ aprovar: 0, aprovar_com_ressalvas: 0, rejeitar: 0 })
  })

  it('usa o voto final do debate, não o da rodada 1', () => {
    const membros: Record<string, EstadoMembro> = {
      m1: estadoDe('m1', 'rejeitar', ['aprovar']),
      m2: estadoDe('m2', 'aprovar_com_ressalvas', ['rejeitar', 'aprovar']),
    }
    expect(calculaPlacar(membros)).toEqual({ aprovar: 2, aprovar_com_ressalvas: 0, rejeitar: 0 })
  })
})

// ── consensoPleno ────────────────────────────────────────────────────────────

describe('consensoPleno', () => {
  it("todos 'aprovar' fecha consenso em 'aprovar'", () => {
    const { ativos, membros } = mesa('aprovar', 'aprovar', 'aprovar')
    expect(consensoPleno(ativos, membros)).toBe('aprovar')
  })

  it("todos 'rejeitar' fecha consenso em 'rejeitar'", () => {
    const { ativos, membros } = mesa('rejeitar', 'rejeitar')
    expect(consensoPleno(ativos, membros)).toBe('rejeitar')
  })

  it('QUALQUER ressalva presente impede o consenso (ressalva nunca encerra)', () => {
    const umaRessalva = mesa('aprovar', 'aprovar_com_ressalvas', 'aprovar')
    expect(consensoPleno(umaRessalva.ativos, umaRessalva.membros)).toBeNull()
  })

  it('até a UNANIMIDADE de ressalvas não encerra — é pendência a debater', () => {
    const { ativos, membros } = mesa(
      'aprovar_com_ressalvas',
      'aprovar_com_ressalvas',
      'aprovar_com_ressalvas',
    )
    expect(consensoPleno(ativos, membros)).toBeNull()
  })

  it('mesa dividida entre aprovar e rejeitar não tem consenso', () => {
    const { ativos, membros } = mesa('aprovar', 'rejeitar', 'aprovar')
    expect(consensoPleno(ativos, membros)).toBeNull()
  })

  it('membro ativo ainda sem voto bloqueia o consenso', () => {
    const { ativos, membros } = mesa('aprovar', 'aprovar')
    membros.m3 = { membroId: 'm3', status: 'analisando' }
    ativos.push(membroDe('m3'))
    expect(consensoPleno(ativos, membros)).toBeNull()
  })

  it('considera o voto FINAL: debate pode virar a mesa para o consenso', () => {
    const membros: Record<string, EstadoMembro> = {
      m1: estadoDe('m1', 'rejeitar', ['aprovar']),
      m2: estadoDe('m2', 'aprovar_com_ressalvas', ['aprovar']),
      m3: estadoDe('m3', 'aprovar'),
    }
    const ativos = [membroDe('m1'), membroDe('m2'), membroDe('m3')]
    expect(consensoPleno(ativos, membros)).toBe('aprovar')
  })
})

// ── votoDoConsenso ───────────────────────────────────────────────────────────

describe('votoDoConsenso', () => {
  it('usa reuniao.consensoVoto quando presente', () => {
    const reuniao = reuniaoDe({
      consensoNaRodada: 2,
      consensoVoto: 'rejeitar',
      placar: { aprovar: 0, aprovar_com_ressalvas: 0, rejeitar: 3 },
    })
    expect(votoDoConsenso(reuniao)).toBe('rejeitar')
  })

  it('sem consenso registrado (consensoNaRodada ausente) retorna undefined', () => {
    const reuniao = reuniaoDe({ placar: { aprovar: 3, aprovar_com_ressalvas: 0, rejeitar: 0 } })
    expect(votoDoConsenso(reuniao)).toBeUndefined()
  })

  it('registro legado (sem consensoVoto): deriva do placar unânime', () => {
    const reuniao = reuniaoDe({
      consensoNaRodada: 1,
      placar: { aprovar: 5, aprovar_com_ressalvas: 0, rejeitar: 0 },
    })
    expect(votoDoConsenso(reuniao)).toBe('aprovar')
  })

  it('registro legado: regra antiga aceitava unanimidade de ressalvas', () => {
    const reuniao = reuniaoDe({
      consensoNaRodada: 2,
      placar: { aprovar: 0, aprovar_com_ressalvas: 4, rejeitar: 0 },
    })
    expect(votoDoConsenso(reuniao)).toBe('aprovar_com_ressalvas')
  })

  it('registro legado com placar misto não deriva voto (undefined)', () => {
    const reuniao = reuniaoDe({
      consensoNaRodada: 3,
      placar: { aprovar: 2, aprovar_com_ressalvas: 1, rejeitar: 0 },
    })
    expect(votoDoConsenso(reuniao)).toBeUndefined()
  })
})
