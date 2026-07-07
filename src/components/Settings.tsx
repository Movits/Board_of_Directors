import { useState } from 'react'
import type { Provedor } from '../types'
import { MEMBROS } from '../board/members'
import { PROVEDORES, infoProvedor } from '../api'
import {
  gravaBaseUrl,
  gravaChave,
  gravaModeloDe,
  gravaPersona,
  gravaProvedor,
  leBaseUrl,
  leChave,
  leModeloDe,
  lePersonas,
  leProvedor,
} from '../lib/storage'

export function Settings() {
  const [provedor, setProvedor] = useState<Provedor>(leProvedor())
  const [chave, setChave] = useState(leChave(leProvedor()))
  const [mostraChave, setMostraChave] = useState(false)
  const [baseUrl, setBaseUrl] = useState(leBaseUrl())
  const [modelo, setModelo] = useState(leModeloDe(leProvedor()))
  const [personas, setPersonas] = useState<Record<string, string>>(lePersonas())
  const [aberto, setAberto] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)

  const info = infoProvedor(provedor)

  const confirmaSalvo = () => {
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  const trocaProvedor = (novo: Provedor) => {
    setProvedor(novo)
    gravaProvedor(novo)
    setChave(leChave(novo))
    setModelo(leModeloDe(novo))
    setMostraChave(false)
    confirmaSalvo()
  }

  return (
    <div className="tela-config">
      <h1>Configurações</h1>

      <section className="cartao-config">
        <h2>🤖 Provedor de IA</h2>
        <p>
          Escolha de qual API vêm os conselheiros. Os modelos disponíveis na tela inicial mudam
          conforme o provedor.
        </p>
        <div className="opcoes-modelo">
          {PROVEDORES.map((p) => (
            <label key={p.id} className={`opcao-modelo ${provedor === p.id ? 'selecionada' : ''}`}>
              <input
                type="radio"
                name="provedor"
                checked={provedor === p.id}
                onChange={() => trocaProvedor(p.id)}
              />
              <strong>{p.rotulo}</strong>
              <small>{p.descricao}</small>
            </label>
          ))}
        </div>
      </section>

      <section className="cartao-config">
        <h2>🔑 Chave de API — {info.rotulo}</h2>
        <p>
          Crie uma chave em{' '}
          <a href={info.urlChave} target="_blank" rel="noreferrer">
            {info.urlChave.replace('https://', '')}
          </a>{' '}
          (uso pago por consumo). Recomendamos definir um <strong>limite de gasto</strong> na conta.
        </p>
        <div className="linha-chave">
          <input
            type={mostraChave ? 'text' : 'password'}
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            placeholder={info.placeholderChave}
            autoComplete="off"
            spellCheck={false}
          />
          <button onClick={() => setMostraChave((v) => !v)} title={mostraChave ? 'Ocultar' : 'Mostrar'}>
            {mostraChave ? '🙈' : '👁️'}
          </button>
          <button
            className="botao-principal botao-compacto"
            onClick={() => {
              gravaChave(provedor, chave.trim())
              confirmaSalvo()
            }}
          >
            Salvar
          </button>
        </div>

        {info.suportaBaseUrl && (
          <label className="campo campo-base-url">
            <span className="campo-rotulo">Base URL personalizada (opcional)</span>
            <div className="linha-chave">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://openrouter.ai/api/v1 (vazio = api.openai.com)"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="botao-principal botao-compacto"
                onClick={() => {
                  gravaBaseUrl(baseUrl.trim())
                  confirmaSalvo()
                }}
              >
                Salvar
              </button>
            </div>
            <span className="campo-dica">
              Para APIs compatíveis com OpenAI: OpenRouter, Groq, Gemini, Ollama etc. Use com um
              modelo "Personalizado" na tela inicial. A API precisa aceitar chamadas do navegador
              (CORS).
            </span>
          </label>
        )}

        <div className="aviso aviso-atencao">
          <strong>Sobre segurança:</strong> as chaves ficam salvas apenas no <em>localStorage</em>{' '}
          deste navegador e são enviadas diretamente à API do provedor — nunca a outros servidores.
          Ainda assim, não use este site em computadores compartilhados e prefira chaves dedicadas
          com limite de gasto.
        </div>
      </section>

      <section className="cartao-config">
        <h2>🧠 Modelo padrão — {info.rotulo}</h2>
        <div className="opcoes-modelo">
          {info.modelos.map((m) => (
            <label key={m.id} className={`opcao-modelo ${modelo === m.id ? 'selecionada' : ''}`}>
              <input
                type="radio"
                name="modelo-config"
                checked={modelo === m.id}
                onChange={() => {
                  setModelo(m.id)
                  gravaModeloDe(provedor, m.id)
                  confirmaSalvo()
                }}
              />
              <strong>{m.rotulo}</strong>
              <small>{m.detalhe}</small>
            </label>
          ))}
        </div>
        <p className="campo-dica">
          Também dá para digitar um modelo personalizado na tela inicial, na opção
          "Personalizado…".
        </p>
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
