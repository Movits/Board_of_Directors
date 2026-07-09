import { lazy, Suspense, useState } from 'react'
import type { ConfigReuniao, Reuniao } from './types'
import { IdeaForm } from './components/IdeaForm'

// Telas pesadas carregadas sob demanda (code-split): a sala puxa o orquestrador
// e o SDK do provedor só quando uma reunião abre; Painel/Settings/Projetos idem.
// A home (IdeaForm) fica no bundle inicial para o primeiro paint ser rápido.
const MeetingRoom = lazy(() => import('./components/MeetingRoom').then((m) => ({ default: m.MeetingRoom })))
const Settings = lazy(() => import('./components/Settings').then((m) => ({ default: m.Settings })))
const Projects = lazy(() => import('./components/Projects').then((m) => ({ default: m.Projects })))
const ProjectPage = lazy(() => import('./components/ProjectPage').then((m) => ({ default: m.ProjectPage })))
const Painel = lazy(() => import('./components/Painel').then((m) => ({ default: m.Painel })))
const About = lazy(() => import('./components/About').then((m) => ({ default: m.About })))

type Tela =
  | { tipo: 'inicio' }
  | { tipo: 'reuniao'; config: ConfigReuniao; existente?: Reuniao }
  | { tipo: 'configuracoes' }
  | { tipo: 'projetos' }
  | { tipo: 'projeto'; id: string }
  | { tipo: 'painel' }
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
            <small>Um conselho inteiro para a sua ideia</small>
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
            className={tela.tipo === 'painel' ? 'ativo' : ''}
            onClick={() => setTela({ tipo: 'painel' })}
          >
            Painel
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
        <Suspense fallback={<div className="carregando-tela">Carregando…</div>}>
          {tela.tipo === 'reuniao' && (
            <MeetingRoom
              config={tela.config}
              existente={tela.existente}
              aoNovaReuniao={() => setTela({ tipo: 'inicio' })}
              aoVerProjeto={(id) => setTela({ tipo: 'projeto', id })}
              aoAbrirConfiguracoes={() => setTela({ tipo: 'configuracoes' })}
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
          {tela.tipo === 'painel' && <Painel />}
          {tela.tipo === 'sobre' && <About />}
        </Suspense>
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
