import { useMemo, useState } from 'react'
import type { Voto } from '../types'
import { MEMBROS, MEMBROS_VOTANTES } from '../board/members'
import { leFeedback, leHistorico, leProjetos } from '../lib/storage'
import { votoDoConsenso, votoFinalDe } from '../board/orchestrator'
import { custoUsd, formataTokens, formataUsd } from '../api/precos'

// Cores dos votos — inline para o gráfico renderizar antes de qualquer CSS novo.
const COR_VOTO: Record<Voto, string> = {
  aprovar: '#2e8b57',
  aprovar_com_ressalvas: '#c9a227',
  rejeitar: '#e2574c',
}

interface TalliesConselheiro {
  id: string
  nome: string
  cargo: string
  emoji: string
  aprovar: number
  aprovar_com_ressalvas: number
  rejeitar: number
  total: number
}

interface FeedbackConselheiro {
  id: string
  nome: string
  cargo: string
  emoji: string
  positivos: number
  negativos: number
}

interface Metricas {
  totalReunioes: number
  // M1
  concluidas: number
  m1: number | null
  // M2 (aproximada)
  ativadas: number
  m2: number | null
  // M3
  totalProjetos: number
  projetosRetidos: number
  m3: number | null
  // Votos
  votosPorConselheiro: TalliesConselheiro[]
  votosAgregados: { aprovar: number; aprovar_com_ressalvas: number; rejeitar: number }
  // Debate
  debatesTotal: number
  debatesMudou: number
  taxaMudou: number | null
  // Consenso
  consensoReunioes: number
  mediaConsenso: number | null
  consensoResultado: { aprovar: number; rejeitar: number }
  // Custo (aproximado)
  reunioesComCusto: number
  custoTotal: number
  custoMedia: number | null
  tokensTotal: number
  // Feedback
  feedbackPorConselheiro: FeedbackConselheiro[]
  // Enums de configuração usados
  provedores: { anthropic: number; openai: number; custom: number }
  modos: { ateConsenso: number; rodadasFixas: number }
}

function pctNum(num: number, den: number): number | null {
  return den === 0 ? null : Math.round((num / den) * 100)
}

function mostraPct(v: number | null): string {
  return v === null ? '—' : `${v}%`
}

/** Percorre o localStorage já salvo e deriva TODAS as métricas. Read-only.
 *  Exclui reuniões de DEMONSTRAÇÃO: os votos do demo são simulados/aleatórios;
 *  incluí-los faria o Painel apresentar ruído como se fosse o histórico real. */
function calculaMetricas(): Metricas {
  const historico = leHistorico().filter((r) => !r.config.demo)
  const idsReais = new Set(historico.map((r) => r.id))
  // Projetos "reais": os que têm ao menos uma reunião não-demo.
  const projetos = leProjetos().filter((p) => p.reunioesIds.some((id) => idsReais.has(id)))

  // Reuniões que pertencem a um projeto com ≥2 reuniões REAIS (acompanhamento).
  const idsEmProjetoRetido = new Set<string>()
  let projetosRetidos = 0
  for (const p of projetos) {
    const reaisNoProjeto = p.reunioesIds.filter((id) => idsReais.has(id))
    if (reaisNoProjeto.length >= 2) {
      projetosRetidos++
      for (const rid of reaisNoProjeto) idsEmProjetoRetido.add(rid)
    }
  }

  // ── M1 Conclusão ────────────────────────────────────────────────────────────
  const concluidas = historico.filter((r) => r.fase === 'concluida')
  const m1 = pctNum(concluidas.length, historico.length)

  // ── M2 Ativação (aproximada) ────────────────────────────────────────────────
  // "Ativada" = concluída que gerou valor: promptExecucao OU plano presente OU
  // faz parte de um projeto com ≥2 reuniões (voltou para acompanhar).
  const ativadas = concluidas.filter(
    (r) => Boolean(r.promptExecucao) || Boolean(r.plano) || idsEmProjetoRetido.has(r.id),
  ).length
  const m2 = pctNum(ativadas, concluidas.length)

  // ── M3 Retenção ─────────────────────────────────────────────────────────────
  const m3 = pctNum(projetosRetidos, projetos.length)

  // ── Distribuição de votos por conselheiro (via votoFinalDe) ─────────────────
  const votosAgregados = { aprovar: 0, aprovar_com_ressalvas: 0, rejeitar: 0 }
  const votosPorConselheiro: TalliesConselheiro[] = MEMBROS_VOTANTES.map((m) => {
    const t: TalliesConselheiro = {
      id: m.id,
      nome: m.nome,
      cargo: m.cargo,
      emoji: m.emoji,
      aprovar: 0,
      aprovar_com_ressalvas: 0,
      rejeitar: 0,
      total: 0,
    }
    for (const r of historico) {
      const estado = r.membros[m.id]
      if (!estado) continue
      const voto = votoFinalDe(estado)
      if (!voto) continue
      t[voto]++
      t.total++
      votosAgregados[voto]++
    }
    return t
  })

  // ── Taxa de mudança de voto (mudou_voto nos debates) ────────────────────────
  let debatesTotal = 0
  let debatesMudou = 0
  for (const r of historico) {
    for (const estado of Object.values(r.membros)) {
      for (const d of estado.debate ?? []) {
        debatesTotal++
        if (d.mudou_voto) debatesMudou++
      }
    }
  }
  const taxaMudou = pctNum(debatesMudou, debatesTotal)

  // ── Rodada média até consenso (modo consenso que alcançou) ──────────────────
  const consensoAtingido = historico.filter(
    (r) => r.config.ateConsenso && r.consensoNaRodada !== undefined,
  )
  const mediaConsenso =
    consensoAtingido.length === 0
      ? null
      : Number(
          (
            consensoAtingido.reduce((s, r) => s + (r.consensoNaRodada as number), 0) /
            consensoAtingido.length
          ).toFixed(1),
        )
  const consensoResultado = { aprovar: 0, rejeitar: 0 }
  for (const r of consensoAtingido) {
    const v = votoDoConsenso(r)
    if (v === 'aprovar') consensoResultado.aprovar++
    else if (v === 'rejeitar') consensoResultado.rejeitar++
  }

  // ── Custo (aproximado — ignora demo/sem preço) ──────────────────────────────
  let custoTotal = 0
  let reunioesComCusto = 0
  let tokensTotal = 0
  for (const r of historico) {
    if (!r.usoTokens) continue
    tokensTotal += r.usoTokens.entrada + r.usoTokens.saida
    const c = custoUsd(r.config.modelo, r.usoTokens)
    if (c !== undefined) {
      custoTotal += c
      reunioesComCusto++
    }
  }
  const custoMedia =
    reunioesComCusto === 0 ? null : Number((custoTotal / reunioesComCusto).toFixed(4))
  custoTotal = Number(custoTotal.toFixed(4))

  // ── Feedback 👍/👎 por conselheiro (onde o dono mais corrige) ────────────────
  const feedbackPorConselheiro: FeedbackConselheiro[] = MEMBROS.map((m) => {
    const itens = leFeedback(m.id)
    return {
      id: m.id,
      nome: m.nome,
      cargo: m.cargo,
      emoji: m.emoji,
      positivos: itens.filter((f) => f.gostou).length,
      negativos: itens.filter((f) => !f.gostou).length,
    }
  })

  // ── Enums de configuração usados ────────────────────────────────────────────
  const provedores = { anthropic: 0, openai: 0, custom: 0 }
  const modos = { ateConsenso: 0, rodadasFixas: 0 }
  for (const r of historico) {
    provedores[r.config.provedor]++
    if (r.config.ateConsenso) modos.ateConsenso++
    else modos.rodadasFixas++
  }

  return {
    totalReunioes: historico.length,
    concluidas: concluidas.length,
    m1,
    ativadas,
    m2,
    totalProjetos: projetos.length,
    projetosRetidos,
    m3,
    votosPorConselheiro,
    votosAgregados,
    debatesTotal,
    debatesMudou,
    taxaMudou,
    consensoReunioes: consensoAtingido.length,
    mediaConsenso,
    consensoResultado,
    reunioesComCusto,
    custoTotal,
    custoMedia,
    tokensTotal,
    feedbackPorConselheiro,
    provedores,
    modos,
  }
}

/** Payload ANÔNIMO (opt-in): SÓ números e enums. Zero texto livre — nada de
 *  ideia, veredito, pauta, nome de projeto, anexo ou modelo custom. */
function montaDiagnostico(m: Metricas) {
  const votosPorConselheiro: Record<
    string,
    { aprovar: number; aprovar_com_ressalvas: number; rejeitar: number }
  > = {}
  for (const t of m.votosPorConselheiro) {
    votosPorConselheiro[t.id] = {
      aprovar: t.aprovar,
      aprovar_com_ressalvas: t.aprovar_com_ressalvas,
      rejeitar: t.rejeitar,
    }
  }
  const feedbackPorConselheiro: Record<string, { positivos: number; negativos: number }> = {}
  for (const f of m.feedbackPorConselheiro) {
    // Só inclui quem tem algum feedback (mantém o payload enxuto).
    if (f.positivos > 0 || f.negativos > 0) {
      feedbackPorConselheiro[f.id] = { positivos: f.positivos, negativos: f.negativos }
    }
  }
  const provedoresUsados = (Object.keys(m.provedores) as (keyof typeof m.provedores)[]).filter(
    (p) => m.provedores[p] > 0,
  )
  return {
    esquema: 'bod-diagnostico-anonimo',
    versao: 1,
    gerado_em: new Date().toISOString().slice(0, 10),
    reunioes: m.totalReunioes,
    m1_conclusao_pct: m.m1,
    m2_ativacao_aprox_pct: m.m2,
    m3_retencao_pct: m.m3,
    votos_agregados: m.votosAgregados,
    votos_por_conselheiro: votosPorConselheiro,
    taxa_mudou_voto_pct: m.taxaMudou,
    debates_avaliados: m.debatesTotal,
    rodada_media_ate_consenso: m.mediaConsenso,
    consenso_reunioes: m.consensoReunioes,
    consenso_resultado: m.consensoResultado,
    custo_total_usd_aprox: m.custoTotal,
    custo_medio_usd_aprox: m.custoMedia,
    reunioes_com_custo: m.reunioesComCusto,
    tokens_total: m.tokensTotal,
    feedback_por_conselheiro: feedbackPorConselheiro,
    provedores_usados: provedoresUsados,
    modos: m.modos,
  }
}

export function Painel() {
  // Lê uma vez ao montar; o botão "Atualizar" recalcula sob demanda.
  const [versao, setVersao] = useState(0)
  const metricas = useMemo(() => calculaMetricas(), [versao])
  const [copiado, setCopiado] = useState(false)
  const [erroCopia, setErroCopia] = useState(false)
  const [mostraPreview, setMostraPreview] = useState(false)

  const diagnostico = useMemo(() => montaDiagnostico(metricas), [metricas])
  const diagnosticoJson = useMemo(() => JSON.stringify(diagnostico, null, 2), [diagnostico])

  async function copiarDiagnostico() {
    try {
      await navigator.clipboard.writeText(diagnosticoJson)
      setCopiado(true)
      setErroCopia(false)
      window.setTimeout(() => setCopiado(false), 2500)
    } catch {
      setErroCopia(true)
      setCopiado(false)
      setMostraPreview(true)
    }
  }

  // ── Estado vazio amigável ────────────────────────────────────────────────────
  if (metricas.totalReunioes === 0) {
    return (
      <div className="tela-historico painel-conselho">
        <h1>Painel do Conselho</h1>
        <p className="historico-vazio">
          Rode algumas reuniões para ver seus números aqui. Tudo é calculado 100% no seu
          navegador — nada sai daqui.
        </p>
      </div>
    )
  }

  const maxVotos = Math.max(1, ...metricas.votosPorConselheiro.map((t) => t.total))
  const feedbackComItens = [...metricas.feedbackPorConselheiro]
    .filter((f) => f.positivos > 0 || f.negativos > 0)
    .sort((a, b) => b.negativos - a.negativos || b.positivos - a.positivos)

  return (
    <div className="tela-historico painel-conselho">
      <header className="painel-cabecalho">
        <h1>Painel do Conselho</h1>
        <button className="link" onClick={() => setVersao((v) => v + 1)} title="Recalcular a partir do que está salvo">
          ↻ Atualizar
        </button>
      </header>
      <p className="campo-dica">
        Analytics 100% local: derivado apenas das reuniões e projetos salvos neste navegador.
        Nenhum texto de ideia, veredito ou anexo aparece aqui — e nada vai para a rede.
      </p>

      {/* ── Métricas de funil (M1/M2/M3) ─────────────────────────────────────── */}
      <section aria-labelledby="painel-funil">
        <h2 id="painel-funil">Funil</h2>
        <div className="painel-metricas">
          <div className="painel-metrica cartao">
            <span className="painel-metrica-numero">{mostraPct(metricas.m1)}</span>
            <span className="painel-metrica-titulo">Conclusão</span>
            <span className="painel-metrica-sub">
              {metricas.concluidas} de {metricas.totalReunioes} reuniões chegaram ao veredito
            </span>
          </div>
          <div className="painel-metrica cartao">
            <span className="painel-metrica-numero">{mostraPct(metricas.m2)}</span>
            <span className="painel-metrica-titulo">
              Ativação <em className="painel-aprox">≈ aproximação</em>
            </span>
            <span className="painel-metrica-sub">
              {metricas.ativadas} de {metricas.concluidas} concluídas geraram valor (prompt, plano
              ou acompanhamento). Sem evento instrumentado — estimado pelo que ficou salvo.
            </span>
          </div>
          <div className="painel-metrica cartao">
            <span className="painel-metrica-numero">{mostraPct(metricas.m3)}</span>
            <span className="painel-metrica-titulo">Retenção</span>
            <span className="painel-metrica-sub">
              {metricas.projetosRetidos} de {metricas.totalProjetos} projetos voltaram para uma 2ª
              reunião
            </span>
          </div>
        </div>
      </section>

      {/* ── Distribuição de votos por conselheiro ────────────────────────────── */}
      <section aria-labelledby="painel-votos">
        <h2 id="painel-votos">Como cada conselheiro vota</h2>
        <p className="campo-dica">
          Votos finais ao longo do histórico — quem é mais duro (rejeita/ressalva) e quem é mais
          otimista (aprova). É o spread real do seu conselho.
        </p>
        <ul className="painel-lista-barras">
          {metricas.votosPorConselheiro.map((t) => (
            <li key={t.id} className="painel-barra-linha">
              <span className="painel-barra-rotulo" title={t.cargo}>
                {t.emoji} {t.nome}
              </span>
              <span
                className="painel-barra"
                role="img"
                aria-label={`${t.nome}: aprovar ${t.aprovar}, com ressalvas ${t.aprovar_com_ressalvas}, rejeitar ${t.rejeitar}`}
                style={{
                  display: 'flex',
                  height: 18,
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.06)',
                  // largura proporcional ao conselheiro mais votante (comparável)
                  width: `${(t.total / maxVotos) * 100}%`,
                  minWidth: t.total > 0 ? 6 : 0,
                }}
              >
                {t.aprovar > 0 && (
                  <span
                    style={{ width: `${(t.aprovar / t.total) * 100}%`, background: COR_VOTO.aprovar }}
                  />
                )}
                {t.aprovar_com_ressalvas > 0 && (
                  <span
                    style={{
                      width: `${(t.aprovar_com_ressalvas / t.total) * 100}%`,
                      background: COR_VOTO.aprovar_com_ressalvas,
                    }}
                  />
                )}
                {t.rejeitar > 0 && (
                  <span
                    style={{ width: `${(t.rejeitar / t.total) * 100}%`, background: COR_VOTO.rejeitar }}
                  />
                )}
              </span>
              <span className="painel-barra-numero">
                {t.total === 0 ? (
                  <em>sem votos</em>
                ) : (
                  <>
                    ✅ {t.aprovar} · ⚠️ {t.aprovar_com_ressalvas} · ❌ {t.rejeitar}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        <p className="painel-legenda-inline">
          <span style={{ color: COR_VOTO.aprovar }}>■</span> aprovar{'  '}
          <span style={{ color: COR_VOTO.aprovar_com_ressalvas }}>■</span> com ressalvas{'  '}
          <span style={{ color: COR_VOTO.rejeitar }}>■</span> rejeitar · barra proporcional ao
          conselheiro com mais votos
        </p>
      </section>

      {/* ── Efeito do debate + consenso ──────────────────────────────────────── */}
      <section aria-labelledby="painel-debate">
        <h2 id="painel-debate">Debate e consenso</h2>
        <div className="painel-metricas">
          <div className="painel-metrica cartao">
            <span className="painel-metrica-numero">{mostraPct(metricas.taxaMudou)}</span>
            <span className="painel-metrica-titulo">Mudança de voto</span>
            <span className="painel-metrica-sub">
              {metricas.debatesMudou} de {metricas.debatesTotal} falas de debate mudaram o voto —
              mede se o dissenso estrutural move alguém.
            </span>
          </div>
          <div className="painel-metrica cartao">
            <span className="painel-metrica-numero">
              {metricas.mediaConsenso === null ? '—' : metricas.mediaConsenso}
            </span>
            <span className="painel-metrica-titulo">Rodada média até consenso</span>
            <span className="painel-metrica-sub">
              {metricas.consensoReunioes === 0
                ? 'Nenhuma reunião em modo consenso alcançou o pleno ainda.'
                : `Em ${metricas.consensoReunioes} reuni${
                    metricas.consensoReunioes === 1 ? 'ão' : 'ões'
                  } no modo consenso · ✅ ${metricas.consensoResultado.aprovar} aprovaram · ❌ ${
                    metricas.consensoResultado.rejeitar
                  } rejeitaram`}
            </span>
          </div>
        </div>
      </section>

      {/* ── Custo estimado ───────────────────────────────────────────────────── */}
      <section aria-labelledby="painel-custo">
        <h2 id="painel-custo">Custo</h2>
        <div className="painel-metricas">
          <div className="painel-metrica cartao">
            <span className="painel-metrica-numero">≈ {formataUsd(metricas.custoTotal)}</span>
            <span className="painel-metrica-titulo">Total estimado</span>
            <span className="painel-metrica-sub">
              Somando {metricas.reunioesComCusto} reuni
              {metricas.reunioesComCusto === 1 ? 'ão' : 'ões'} com preço conhecido (demo e modelos
              sem tabela ficam de fora).
            </span>
          </div>
          <div className="painel-metrica cartao">
            <span className="painel-metrica-numero">
              {metricas.custoMedia === null ? '—' : `≈ ${formataUsd(metricas.custoMedia)}`}
            </span>
            <span className="painel-metrica-titulo">Média por reunião</span>
            <span className="painel-metrica-sub">
              {formataTokens(metricas.tokensTotal)} tokens no total. Valores aproximados (“≈”) — a
              conta real depende do provedor.
            </span>
          </div>
        </div>
      </section>

      {/* ── Feedback por conselheiro ─────────────────────────────────────────── */}
      <section aria-labelledby="painel-feedback">
        <h2 id="painel-feedback">Onde você mais corrige o conselho</h2>
        {feedbackComItens.length === 0 ? (
          <p className="campo-dica">
            Você ainda não avaliou nenhuma resposta com 👍/👎. Os polegares dentro da reunião ficam
            registrados aqui — mostram por cargo onde o conselho mais precisa de ajuste.
          </p>
        ) : (
          <ul className="painel-lista-barras">
            {feedbackComItens.map((f) => (
              <li key={f.id} className="painel-barra-linha">
                <span className="painel-barra-rotulo" title={f.cargo}>
                  {f.emoji} {f.nome}
                </span>
                <span className="painel-barra-numero painel-feedback-numero">
                  👍 {f.positivos} · 👎 {f.negativos}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Diagnóstico anônimo (opt-in, pull) ───────────────────────────────── */}
      <section aria-labelledby="painel-diag" className="painel-diagnostico">
        <h2 id="painel-diag">Diagnóstico anônimo</h2>
        <p className="campo-dica">
          Opcional. Gera um JSON só com <strong>números e categorias</strong> (as métricas acima):
          nenhuma ideia, veredito, pauta, nome de projeto, anexo ou chave de API entra nele. Nada é
          enviado automaticamente — você confere o conteúdo e copia se quiser compartilhar.
        </p>
        <div className="painel-diag-acoes">
          <button className="botao-principal" onClick={copiarDiagnostico}>
            {copiado ? '✓ Copiado!' : 'Copiar diagnóstico anônimo (JSON)'}
          </button>
          <button className="link" onClick={() => setMostraPreview((v) => !v)}>
            {mostraPreview ? 'Ocultar prévia' : 'Ver o que seria copiado'}
          </button>
        </div>
        {erroCopia && (
          <p className="campo-dica" role="alert">
            Não foi possível acessar a área de transferência. Copie manualmente o JSON abaixo.
          </p>
        )}
        {mostraPreview && (
          <pre className="painel-diag-preview" aria-label="Prévia do diagnóstico anônimo">
            {diagnosticoJson}
          </pre>
        )}
      </section>
    </div>
  )
}
