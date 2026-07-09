import { useState } from 'react'
import type { Projeto, Reuniao } from '../types'
import { leHistorico, leProjetos, removeProjeto } from '../lib/storage'

interface Props {
  aoAbrirProjeto: (projetoId: string) => void
  aoNovoProjeto: () => void
}

function ultimaReuniao(projeto: Projeto, historico: Reuniao[]): Reuniao | undefined {
  const id = projeto.reunioesIds[projeto.reunioesIds.length - 1]
  return historico.find((r) => r.id === id)
}

export function Projects({ aoAbrirProjeto, aoNovoProjeto }: Props) {
  const [projetos, setProjetos] = useState<Projeto[]>(() => leProjetos())
  const historico = leHistorico()

  if (projetos.length === 0) {
    return (
      <div className="tela-historico">
        <h1>Projetos</h1>
        <p className="historico-vazio">
          Nenhum projeto ainda. Apresente uma ideia ao conselho: cada ideia vira um projeto, e
          você pode voltar aqui para continuar trabalhando nele com a equipe (novas reuniões,
          feedback constante), como uma mini empresa.
        </p>
        <button className="botao-principal" onClick={aoNovoProjeto}>
          🔔 Apresentar uma ideia
        </button>
      </div>
    )
  }

  return (
    <div className="tela-historico">
      <h1>Projetos</h1>
      <p className="campo-dica">
        Cada projeto guarda a ideia, os materiais e todas as reuniões do conselho sobre ele.
        Abra um projeto para convocar uma reunião de acompanhamento.
      </p>
      <ul className="lista-historico">
        {projetos.map((p) => {
          const ultima = ultimaReuniao(p, historico)
          return (
            <li key={p.id} className="item-historico">
              <button className="historico-principal" onClick={() => aoAbrirProjeto(p.id)}>
                <span className="historico-data">
                  {new Date(p.atualizadoEm).toLocaleDateString('pt-BR')}
                  {ultima?.config.demo && <span className="selo-demo">DEMO</span>}
                </span>
                <span className="historico-ideia">{p.nome}</span>
                <span className="historico-placar">
                  🗓 {p.reunioesIds.length} reuni{p.reunioesIds.length === 1 ? 'ão' : 'ões'}
                  {p.anexos.length > 0 && <> · 📎 {p.anexos.length}</>}
                  {p.repo && <> · 🔗 {p.repo.owner}/{p.repo.repo}</>}
                  {ultima && (
                    <>
                      {' '}· última: ✅ {ultima.placar.aprovar} ⚠️ {ultima.placar.aprovar_com_ressalvas} ❌{' '}
                      {ultima.placar.rejeitar}
                    </>
                  )}
                </span>
              </button>
              <div className="historico-acoes">
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Excluir o projeto "${p.nome}" e as ${p.reunioesIds.length} reuniões dele? Isso não pode ser desfeito.`,
                      )
                    ) {
                      removeProjeto(p.id)
                      setProjetos(leProjetos())
                    }
                  }}
                  title="Excluir projeto"
                >
                  🗑
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
