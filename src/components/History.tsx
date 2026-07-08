import { useState } from 'react'
import type { Reuniao } from '../types'
import { leHistorico, removeReuniao } from '../lib/storage'
import { exportaMarkdown, exportaObsidian } from '../lib/exportar'

interface Props {
  aoAbrir: (reuniao: Reuniao) => void
}

export function History({ aoAbrir }: Props) {
  const [reunioes, setReunioes] = useState<Reuniao[]>(leHistorico())

  if (reunioes.length === 0) {
    return (
      <div className="tela-historico">
        <h1>Histórico de reuniões</h1>
        <p className="historico-vazio">
          Nenhuma reunião realizada ainda. As últimas 20 reuniões ficam salvas neste navegador.
        </p>
      </div>
    )
  }

  return (
    <div className="tela-historico">
      <h1>Histórico de reuniões</h1>
      <ul className="lista-historico">
        {reunioes.map((r) => (
          <li key={r.id} className="item-historico">
            <button className="historico-principal" onClick={() => aoAbrir(r)}>
              <span className="historico-data">
                {new Date(r.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                {r.config.demo && <span className="selo-demo">DEMO</span>}
              </span>
              <span className="historico-ideia">{r.config.ideia}</span>
              <span className="historico-placar">
                ✅ {r.placar.aprovar} · ⚠️ {r.placar.aprovar_com_ressalvas} · ❌ {r.placar.rejeitar}
              </span>
            </button>
            <div className="historico-acoes">
              <button onClick={() => exportaObsidian(r)} title="Exportar ata (Obsidian)">
                🧠
              </button>
              <button onClick={() => exportaMarkdown(r)} title="Exportar Markdown">
                ⬇︎
              </button>
              <button
                onClick={() => {
                  removeReuniao(r.id)
                  setReunioes(leHistorico())
                }}
                title="Excluir"
              >
                🗑
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
