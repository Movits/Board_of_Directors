import type { Nivel, Plano } from '../types'
import { usarFocusTrap } from '../lib/focusTrap'

const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

const ROTULO_NIVEL: Record<Nivel, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' }

function SeloNivel({ nivel }: { nivel: Nivel }) {
  return <span className={`selo-nivel nivel-${nivel}`}>{ROTULO_NIVEL[nivel]}</span>
}

/** Gráfico de barras horizontais do orçamento (CSS puro — imprime bem). */
function GraficoOrcamento({ itens }: { itens: Plano['orcamento'] }) {
  const maior = Math.max(...itens.map((i) => i.valor_mensal_brl), 1)
  return (
    <div className="grafico-barras" role="img" aria-label="Orçamento mensal por categoria">
      {itens.map((item, i) => (
        <div key={i} className="barra-linha">
          <span className="barra-rotulo">{item.categoria}</span>
          <span className="barra-trilha">
            <span className="barra-valor" style={{ width: `${(item.valor_mensal_brl / maior) * 100}%` }} />
          </span>
          <span className="barra-numero">{moeda.format(item.valor_mensal_brl)}</span>
        </div>
      ))}
    </div>
  )
}

/** Cronograma estilo Gantt (fases sequenciais, escala em semanas). */
function GraficoCronograma({ fases }: { fases: Plano['roadmap'] }) {
  const total = Math.max(
    fases.reduce((soma, f) => soma + f.duracao_semanas, 0),
    1,
  )
  let acumulado = 0
  return (
    <div className="grafico-gantt" role="img" aria-label="Cronograma das fases">
      {fases.map((fase, i) => {
        const inicio = (acumulado / total) * 100
        const largura = (fase.duracao_semanas / total) * 100
        acumulado += fase.duracao_semanas
        return (
          <div key={i} className="gantt-linha">
            <span className="gantt-rotulo">
              {i + 1}. {fase.fase}
            </span>
            <span className="gantt-trilha">
              <span className="gantt-barra" style={{ marginLeft: `${inicio}%`, width: `${largura}%` }}>
                {fase.duracao_semanas} sem
              </span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

interface Props {
  plano: Plano
  demo?: boolean
  aoFechar: () => void
}

export function PlanDocument({ plano, demo, aoFechar }: Props) {
  // Gestão de foco unificada: prende o Tab, fecha no Esc e trava o scroll.
  const overlayRef = usarFocusTrap<HTMLDivElement>(true, aoFechar)

  const totalOrcamento = plano.orcamento.reduce((s, i) => s + i.valor_mensal_brl, 0)
  const totalSemanas = plano.roadmap.reduce((s, f) => s + f.duracao_semanas, 0)
  const data = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div
      ref={overlayRef}
      className="documento-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Plano detalhado: ${plano.titulo}`}
    >
      <div className="documento-barra">
        <span className="documento-barra-titulo">📄 {plano.titulo}</span>
        <div className="documento-barra-acoes">
          <button
            className="botao-principal botao-compacto"
            onClick={() => window.print()}
            title="Abre a impressão do navegador — escolha “Salvar como PDF” como destino"
          >
            🖨 Salvar em PDF
          </button>
          <button className="documento-fechar" onClick={aoFechar}>
            ✕ Fechar
          </button>
        </div>
      </div>

      <article className="documento">
        {/* ── Capa ─────────────────────────────────────────────────────── */}
        <header className="doc-capa doc-secao">
          {demo && <p className="doc-selo-demo">DOCUMENTO DE DEMONSTRAÇÃO</p>}
          <p className="doc-capa-chapeu">Plano elaborado pelo Conselho de Administração de IA</p>
          <h1>{plano.titulo}</h1>
          <p className="doc-capa-sub">{plano.subtitulo}</p>
          <p className="doc-capa-data">{data}</p>
          <p className="doc-capa-disclaimer">
            Conteúdo gerado por inteligência artificial — valide números, prazos e decisões de
            forma independente antes de investir.
          </p>
        </header>

        {/* ── Resumo executivo ─────────────────────────────────────────── */}
        <section className="doc-secao">
          <h2>1. Resumo executivo</h2>
          {plano.resumo_executivo.split('\n').filter(Boolean).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <div className="doc-destaques">
            <div className="doc-destaque">
              <h4>Público-alvo</h4>
              <p>{plano.publico_alvo}</p>
            </div>
            <div className="doc-destaque">
              <h4>Proposta de valor</h4>
              <p>{plano.proposta_valor}</p>
            </div>
          </div>
        </section>

        {/* ── Mercado ──────────────────────────────────────────────────── */}
        <section className="doc-secao">
          <h2>2. Análise de mercado</h2>
          {plano.analise_mercado.visao_geral.split('\n').filter(Boolean).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <table className="doc-tabela">
            <thead>
              <tr>
                <th>Concorrente / alternativa</th>
                <th>Pontos fortes</th>
                <th>Pontos fracos</th>
              </tr>
            </thead>
            <tbody>
              {plano.analise_mercado.concorrentes.map((c, i) => (
                <tr key={i}>
                  <td><strong>{c.nome}</strong></td>
                  <td>{c.pontos_fortes}</td>
                  <td>{c.pontos_fracos}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── SWOT ─────────────────────────────────────────────────────── */}
        <section className="doc-secao">
          <h2>3. Análise SWOT</h2>
          <div className="doc-swot">
            <div className="swot-quadrante swot-forcas">
              <h4>💪 Forças</h4>
              <ul>{plano.swot.forcas.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="swot-quadrante swot-fraquezas">
              <h4>🩹 Fraquezas</h4>
              <ul>{plano.swot.fraquezas.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="swot-quadrante swot-oportunidades">
              <h4>🌱 Oportunidades</h4>
              <ul>{plano.swot.oportunidades.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div className="swot-quadrante swot-ameacas">
              <h4>⚡ Ameaças</h4>
              <ul>{plano.swot.ameacas.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>
        </section>

        {/* ── Estratégia ───────────────────────────────────────────────── */}
        <section className="doc-secao">
          <h2>4. Pilares da estratégia</h2>
          <div className="doc-pilares">
            {plano.pilares_estrategia.map((p, i) => (
              <div key={i} className="doc-pilar">
                <h4>{i + 1}. {p.titulo}</h4>
                <p>{p.descricao}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Roadmap ──────────────────────────────────────────────────── */}
        <section className="doc-secao">
          <h2>5. Roadmap ({totalSemanas} semanas)</h2>
          <GraficoCronograma fases={plano.roadmap} />
          <table className="doc-tabela">
            <thead>
              <tr>
                <th>Fase</th>
                <th>Duração</th>
                <th>Entregas</th>
              </tr>
            </thead>
            <tbody>
              {plano.roadmap.map((f, i) => (
                <tr key={i}>
                  <td><strong>{i + 1}. {f.fase}</strong></td>
                  <td>{f.duracao_semanas} semanas</td>
                  <td>
                    <ul className="doc-lista-compacta">
                      {f.entregas.map((e, j) => <li key={j}>{e}</li>)}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Orçamento ────────────────────────────────────────────────── */}
        <section className="doc-secao">
          <h2>6. Orçamento mensal estimado</h2>
          <GraficoOrcamento itens={plano.orcamento} />
          <table className="doc-tabela">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Valor mensal</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {plano.orcamento.map((o, i) => (
                <tr key={i}>
                  <td><strong>{o.categoria}</strong></td>
                  <td>{moeda.format(o.valor_mensal_brl)}</td>
                  <td>{o.observacao}</td>
                </tr>
              ))}
              <tr className="doc-linha-total">
                <td><strong>Total estimado</strong></td>
                <td><strong>{moeda.format(totalOrcamento)}</strong></td>
                <td>valores aproximados — revisar a cada fase</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ── Métricas ─────────────────────────────────────────────────── */}
        <section className="doc-secao">
          <h2>7. Métricas de sucesso</h2>
          <table className="doc-tabela">
            <thead>
              <tr>
                <th>Métrica</th>
                <th>Meta em 90 dias</th>
                <th>Como medir</th>
              </tr>
            </thead>
            <tbody>
              {plano.metricas.map((m, i) => (
                <tr key={i}>
                  <td><strong>{m.nome}</strong></td>
                  <td>{m.meta_90_dias}</td>
                  <td>{m.como_medir}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Riscos ───────────────────────────────────────────────────── */}
        <section className="doc-secao">
          <h2>8. Riscos e mitigações</h2>
          <table className="doc-tabela">
            <thead>
              <tr>
                <th>Risco</th>
                <th>Prob.</th>
                <th>Impacto</th>
                <th>Mitigação</th>
              </tr>
            </thead>
            <tbody>
              {plano.riscos.map((r, i) => (
                <tr key={i}>
                  <td>{r.risco}</td>
                  <td><SeloNivel nivel={r.probabilidade} /></td>
                  <td><SeloNivel nivel={r.impacto} /></td>
                  <td>{r.mitigacao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ── Próximos passos ──────────────────────────────────────────── */}
        <section className="doc-secao">
          <h2>9. Próximos passos</h2>
          <ol className="doc-passos">
            {plano.proximos_passos.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ol>
        </section>

        <footer className="doc-rodape">
          Documento gerado pelo Board of Directors — conselho de administração de IA. Valores e
          estimativas são aproximados e devem ser validados antes de decisões financeiras.
        </footer>
      </article>
    </div>
  )
}
