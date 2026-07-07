import { useState } from 'react'
import type { ModelId } from '../types'
import { MEMBROS } from '../board/members'
import { MODELOS } from '../api/anthropic'
import {
  gravaApiKey,
  gravaModelo,
  gravaPersona,
  leApiKey,
  leModelo,
  lePersonas,
} from '../lib/storage'

export function Settings() {
  const [apiKey, setApiKey] = useState(leApiKey())
  const [mostraChave, setMostraChave] = useState(false)
  const [modelo, setModelo] = useState<ModelId>(leModelo())
  const [personas, setPersonas] = useState<Record<string, string>>(lePersonas())
  const [aberto, setAberto] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const confirmaSalvo = () => {
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  return (
    <div className="tela-config">
      <h1>Configurações</h1>

      <section className="cartao-config">
        <h2>🔑 Chave de API da Anthropic</h2>
        <p>
          Crie uma chave em{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>{' '}
          (uso pago por consumo). Recomendamos definir um <strong>limite de gasto</strong> na conta.
        </p>
        <div className="linha-chave">
          <input
            type={mostraChave ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-…"
            autoComplete="off"
            spellCheck={false}
          />
          <button onClick={() => setMostraChave((v) => !v)} title={mostraChave ? 'Ocultar' : 'Mostrar'}>
            {mostraChave ? '🙈' : '👁️'}
          </button>
          <button
            className="botao-principal botao-compacto"
            onClick={() => {
              gravaApiKey(apiKey.trim())
              confirmaSalvo()
            }}
          >
            Salvar
          </button>
        </div>
        <div className="aviso aviso-atencao">
          <strong>Sobre segurança:</strong> a chave fica salva apenas no <em>localStorage</em> deste
          navegador e é enviada diretamente à API da Anthropic — nunca a outros servidores. Ainda
          assim, não use este site em computadores compartilhados e prefira uma chave dedicada com
          limite de gasto.
        </div>
      </section>

      <section className="cartao-config">
        <h2>🧠 Modelo padrão</h2>
        <div className="opcoes-modelo">
          {MODELOS.map((m) => (
            <label key={m.id} className={`opcao-modelo ${modelo === m.id ? 'selecionada' : ''}`}>
              <input
                type="radio"
                name="modelo-config"
                checked={modelo === m.id}
                onChange={() => {
                  setModelo(m.id)
                  gravaModelo(m.id)
                  confirmaSalvo()
                }}
              />
              <strong>{m.rotulo}</strong>
              <small>{m.detalhe}</small>
            </label>
          ))}
        </div>
      </section>

      <section className="cartao-config">
        <h2>🎭 Personas dos conselheiros</h2>
        <p>
          Cada conselheiro é definido por um <em>system prompt</em>. Edite para ajustar o tom, o
          foco ou a expertise de cada um — as mudanças valem para as próximas reuniões.
        </p>
        <ul className="lista-personas">
          {MEMBROS.map((m) => {
            const customizado = personas[m.id] !== undefined
            const valor = personas[m.id] ?? m.systemPrompt
            const abertoEste = aberto === m.id
            return (
              <li key={m.id} className="item-persona" style={{ ['--cor' as string]: m.cor }}>
                <button
                  className="persona-topo"
                  onClick={() => setAberto(abertoEste ? null : m.id)}
                  aria-expanded={abertoEste}
                >
                  <span className="persona-avatar">{m.emoji}</span>
                  <span className="persona-nome">
                    {m.nome} <small>{m.cargo}</small>
                  </span>
                  {customizado && <span className="selo-customizado">personalizado</span>}
                  <span className="persona-seta">{abertoEste ? '▴' : '▾'}</span>
                </button>
                {abertoEste && (
                  <div className="persona-editor">
                    <textarea
                      rows={10}
                      value={valor}
                      onChange={(e) => setPersonas((p) => ({ ...p, [m.id]: e.target.value }))}
                      spellCheck={false}
                    />
                    <div className="persona-acoes">
                      <button
                        className="botao-principal botao-compacto"
                        onClick={() => {
                          gravaPersona(m.id, personas[m.id] ?? m.systemPrompt)
                          confirmaSalvo()
                        }}
                      >
                        Salvar persona
                      </button>
                      <button
                        disabled={!customizado}
                        onClick={() => {
                          gravaPersona(m.id, null)
                          setPersonas((p) => {
                            const novo = { ...p }
                            delete novo[m.id]
                            return novo
                          })
                          confirmaSalvo()
                        }}
                      >
                        Restaurar padrão
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {salvo && <div className="brinde">✓ Salvo</div>}
    </div>
  )
}
