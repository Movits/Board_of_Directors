import { useState } from 'react'
import type { ConfigReuniao, Reuniao } from './types'
import { IdeaForm } from './components/IdeaForm'
import { MeetingRoom } from './components/MeetingRoom'
import { Settings } from './components/Settings'
import { Projects } from './components/Projects'
import { ProjectPage } from './components/ProjectPage'
import { About } from './components/About'

type Tela =
  | { tipo: 'inicio' }
  | { tipo: 'reuniao'; config: ConfigReuniao; existente?: Reuniao }
  | { tipo: 'configuracoes' }
  | { tipo: 'projetos' }
  | { tipo: 'projeto'; id: string }
  | { tipo: 'sobre' }

export function App() {
  const [tela, setTela] = useState<Tela>({ tipo: 'inicio' })

  return (
    <div className="app">
      <header className="cabecalho">
        <button className="logo" onClick={() => setTela({ tipo: 'inicio' })} title="Início">
          <span className="logo-emoji">🏛️</span>
          <span className="logo-texto">
            Board of Directors
            <small>Conselho de Administração de IA</small>
          </span>
        </button>
        <nav className="navegacao">
          <button
            className={tela.tipo === 'inicio' ? 'ativo' : ''}
            onClick={() => setTela({ tipo: 'inicio' })}
          >
            Nova reunião
          </button>
          <button
            className={tela.tipo === 'projetos' || tela.tipo === 'projeto' ? 'ativo' : ''}
            onClick={() => setTela({ tipo: 'projetos' })}
          >
            Projetos
          </button>
          <button
            className={tela.tipo === 'configuracoes' ? 'ativo' : ''}
            onClick={() => setTela({ tipo: 'configuracoes' })}
          >
            Configurações
          </button>
        </nav>
      </header>

      <main className="conteudo">
        {tela.tipo === 'inicio' && (
          <IdeaForm
            aoConvocar={(config) => setTela({ tipo: 'reuniao', config })}
            aoAbrirConfiguracoes={() => setTela({ tipo: 'configuracoes' })}
          />
        )}
        {tela.tipo === 'reuniao' && (
          <MeetingRoom
            config={tela.config}
            existente={tela.existente}
            aoNovaReuniao={() => setTela({ tipo: 'inicio' })}
            aoVerProjeto={(id) => setTela({ tipo: 'projeto', id })}
          />
        )}
        {tela.tipo === 'configuracoes' && <Settings />}
        {tela.tipo === 'projetos' && (
          <Projects
            aoAbrirProjeto={(id) => setTela({ tipo: 'projeto', id })}
            aoNovoProjeto={() => setTela({ tipo: 'inicio' })}
          />
        )}
        {tela.tipo === 'projeto' && (
          <ProjectPage
            projetoId={tela.id}
            aoAbrirReuniao={(config, existente) => setTela({ tipo: 'reuniao', config, existente })}
            aoConvocar={(config) => setTela({ tipo: 'reuniao', config })}
            aoVoltar={() => setTela({ tipo: 'projetos' })}
          />
        )}
        {tela.tipo === 'sobre' && <About />}
      </main>

      <footer className="rodape">
        Conecte a API de IA que preferir · sua chave fica apenas no seu navegador ·{' '}
        <button className="link link-rodape" onClick={() => setTela({ tipo: 'sobre' })}>
          sobre & privacidade
        </button>{' '}
        ·{' '}
        <a href="https://github.com/Movits/Board_of_Directors" target="_blank" rel="noreferrer">
          código-fonte
        </a>
      </footer>
    </div>
  )
}
