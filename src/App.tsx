import { useState } from 'react'
import type { ConfigReuniao, Reuniao } from './types'
import { IdeaForm } from './components/IdeaForm'
import { MeetingRoom } from './components/MeetingRoom'
import { Settings } from './components/Settings'
import { History } from './components/History'

type Tela =
  | { tipo: 'inicio' }
  | { tipo: 'reuniao'; config: ConfigReuniao; existente?: Reuniao }
  | { tipo: 'configuracoes' }
  | { tipo: 'historico' }

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
            className={tela.tipo === 'historico' ? 'ativo' : ''}
            onClick={() => setTela({ tipo: 'historico' })}
          >
            Histórico
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
          />
        )}
        {tela.tipo === 'configuracoes' && <Settings />}
        {tela.tipo === 'historico' && (
          <History aoAbrir={(reuniao) => setTela({ tipo: 'reuniao', config: reuniao.config, existente: reuniao })} />
        )}
      </main>

      <footer className="rodape">
        Feito com a API da Anthropic · sua chave fica apenas no seu navegador ·{' '}
        <a href="https://github.com/Movits/Board_of_Directors" target="_blank" rel="noreferrer">
          código-fonte
        </a>
      </footer>
    </div>
  )
}
