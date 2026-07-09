import { useState } from 'react'
import type { Provedor } from '../types'
import { MEMBROS } from '../board/members'
import { PROVEDORES, PRESETS_BASE_URL, infoProvedor, listaModelos } from '../api'
import {
  gravaBaseUrlDe,
  gravaChave,
  gravaModeloDe,
  gravaModelosDescobertos,
  gravaProvedor,
  leBaseUrlDe,
  leChave,
  leModeloDe,
  leModelosDescobertos,
  lePersonas,
  leProvedor,
  leTetoGastoUsd,
  gravaTetoGastoUsd,
  limpaChaves,
  limpaTudo,
} from '../lib/storage'
import { PersonaForm } from './PersonaForm'

export function Settings() {
  const inicial = leProvedor()
  const [provedor, setProvedor] = useState<Provedor>(inicial)
  const [chave, setChave] = useState(leChave(inicial))
  const [mostraChave, setMostraChave] = useState(false)
  const [baseUrl, setBaseUrl] = useState(leBaseUrlDe(inicial))
  const [modelo, setModelo] = useState(leModeloDe(inicial))
  const [descobertos, setDescobertos] = useState<string[]>(leModelosDescobertos(inicial))
  const [buscando, setBuscando] = useState(false)
  const [erroBusca, setErroBusca] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)
  const [teto, setTeto] = useState(() => String(leTetoGastoUsd()))
  const [salvo, setSalvo] = useState(false)
  // força rerender quando uma persona é salva/restaurada dentro do PersonaForm
  const [, setVersaoPersonas] = useState(0)

  const info = infoProvedor(provedor)

  const confirmaSalvo = () => {
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  const trocaProvedor = (novo: Provedor) => {
    setProvedor(novo)
    gravaProvedor(novo)
    setChave(leChave(novo))
    setBaseUrl(leBaseUrlDe(novo))
    setModelo(leModeloDe(novo))
    setDescobertos(leModelosDescobertos(novo))
    setMostraChave(false)
    setErroBusca('')
    confirmaSalvo()
  }

  const limparCredenciais = () => {
    const confirmado = window.confirm(
      'Remover as chaves de API e o token do GitHub salvos neste navegador? ' +
        'Projetos, reuniões e demais dados não são afetados.',
    )
    if (!confirmado) return
    limpaChaves()
    setChave('')
    confirmaSalvo()
  }

  const salvarTeto = () => {
    const n = Number(teto.replace(',', '.'))
    const valido = isFinite(n) && n >= 0 ? n : leTetoGastoUsd()
    gravaTetoGastoUsd(valido)
    setTeto(String(valido))
    confirmaSalvo()
  }

  const apagarTudo = () => {
    const confirmado = window.confirm(
      'Apagar TODOS os dados deste app neste navegador (projetos, reuniões, feedback, ' +
        'personas e chaves de API)? Esta ação não pode ser desfeita.',
    )
    if (!confirmado) return
    limpaTudo()
    location.reload()
  }

  const buscarModelos = async () => {
    setBuscando(true)
    setErroBusca('')
    try {
      // usa os valores atuais dos campos (mesmo sem clicar em Salvar)
      gravaChave(provedor, chave.trim())
      gravaBaseUrlDe(provedor, baseUrl.trim())
      const ids = await listaModelos(provedor, { apiKey: chave.trim(), baseUrl: baseUrl.trim() })
      setDescobertos(ids)
      gravaModelosDescobertos(provedor, ids)
      if (ids.length > 0 && !ids.includes(modelo)) {
        setModelo(ids[0])
        gravaModeloDe(provedor, ids[0])
      }
      confirmaSalvo()
    } catch (err) {
      setErroBusca(err instanceof Error ? err.message : String(err))
    } finally {
      setBuscando(false)
    }
  }

  return (
    <div className="tela-config">
      <h1>Configurações</h1>

      <section className="cartao-config">
        <h2>🤖 Provedor de IA</h2>
        <p>
          Escolha de qual API vêm os conselheiros, incluindo APIs no seu próprio computador, como o
          Ollama. Os modelos disponíveis na tela inicial mudam conforme o provedor (a empresa que
          roda a IA).
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
        <h2>🔑 Conexão · {info.rotulo}</h2>
        {provedor === 'anthropic' && (
          <div className="aviso aviso-atencao">
            <strong>Plano do chat de IA ≠ chave de API.</strong> A chave de API é um caminho à parte
            e pago: usa <em>créditos próprios</em>, comprados em console.anthropic.com, que{' '}
            <strong>não saem do seu plano do Claude</strong> (Pro/Max). Dica: compre um valor pequeno
            (ex.: US$5), defina um limite de gasto e use Sonnet ou Haiku. Rende dezenas de reuniões.
            <br />
            <br />
            <strong>Quer usar o plano que você já paga, sem custo extra?</strong> Use o botão{' '}
            <strong>🖥 Rodar de graça no seu chat de IA</strong> na tela inicial: o app gera um
            prompt para você colar no seu chat (ChatGPT, Claude, Gemini e outros) e o conselho roda
            ali, no plano que você já usa.
          </div>
        )}
        {info.urlChave ? (
          <p>
            Crie uma chave em{' '}
            <a href={info.urlChave} target="_blank" rel="noreferrer">
              {info.urlChave.replace('https://', '')}
            </a>{' '}
            (uso pago por consumo). Recomendamos definir um <strong>limite de gasto</strong> na
            conta.
          </p>
        ) : (
          <p>
            Conecte qualquer API que fale o protocolo da OpenAI. Para serviços na nuvem
            (OpenRouter, Groq…), crie a chave no site do serviço; APIs locais como Ollama e LM
            Studio geralmente não exigem chave.
          </p>
        )}

        {info.baseUrl !== 'nao' && (
          <label className="campo campo-base-url">
            <span className="campo-rotulo">
              Base URL {info.baseUrl === 'obrigatoria' ? '(obrigatória)' : '(opcional)'}
            </span>
            {info.baseUrl === 'obrigatoria' && (
              <div className="presets-base-url">
                {PRESETS_BASE_URL.map((p) => (
                  <button
                    key={p.rotulo}
                    type="button"
                    className={`chip ${baseUrl === p.url ? 'chip-ativo' : ''}`}
                    title={p.dica ? `${p.url} · ${p.dica}` : p.url}
                    onClick={() => setBaseUrl(p.url)}
                  >
                    {p.rotulo}
                  </button>
                ))}
              </div>
            )}
            <div className="linha-chave">
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder={
                  info.baseUrl === 'obrigatoria'
                    ? 'http://localhost:11434/v1'
                    : 'vazio = api.openai.com'
                }
                autoComplete="off"
                spellCheck={false}
              />
              <button
                className="botao-principal botao-compacto"
                onClick={() => {
                  gravaBaseUrlDe(provedor, baseUrl.trim())
                  confirmaSalvo()
                }}
              >
                Salvar
              </button>
            </div>
            <span className="campo-dica">
              A API precisa aceitar chamadas do navegador (CORS). Para <strong>Ollama local</strong>
              : inicie com <code>OLLAMA_ORIGINS='https://movits.github.io' ollama serve</code> e use{' '}
              <code>http://localhost:11434/v1</code> (o curinga <code>'*'</code> funciona, mas
              libera para qualquer site; use só em testes).
            </span>
          </label>
        )}

        <label className="campo campo-base-url">
          <span className="campo-rotulo">
            Chave de API {info.chaveOpcional ? '(opcional para APIs locais)' : ''}
          </span>
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
        </label>

        <div className="aviso aviso-atencao">
          <strong>Sobre segurança:</strong> as chaves ficam salvas apenas no <em>localStorage</em>{' '}
          deste navegador e são enviadas diretamente à API do provedor, nunca a outros servidores.
          Ainda assim, não use este site em computadores compartilhados e prefira chaves dedicadas
          com limite de gasto.
        </div>
      </section>

      <section className="cartao-config">
        <h2>🧠 Modelo padrão · {info.rotulo}</h2>
        {info.modelos.length > 0 && (
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
        )}

        {provedor !== 'anthropic' && (
          <div className="descoberta-modelos">
            <div className="linha-chave">
              <button className="botao-principal botao-compacto" onClick={buscarModelos} disabled={buscando}>
                {buscando ? 'Buscando…' : '🔎 Buscar modelos desta API'}
              </button>
              {descobertos.length > 0 && (
                <select
                  className="seletor-modelos"
                  value={descobertos.includes(modelo) ? modelo : ''}
                  onChange={(e) => {
                    setModelo(e.target.value)
                    gravaModeloDe(provedor, e.target.value)
                    confirmaSalvo()
                  }}
                >
                  <option value="" disabled>
                    escolha um modelo ({descobertos.length})
                  </option>
                  {descobertos.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {erroBusca && <div className="aviso aviso-erro">{erroBusca}</div>}
            <label className="campo">
              <span className="campo-dica">…ou digite o ID do modelo manualmente:</span>
              <div className="linha-chave">
                <input
                  type="text"
                  className="entrada-modelo-custom"
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                  placeholder="ex.: llama3.3, qwen2.5-coder, gpt-5.4-nano…"
                  spellCheck={false}
                />
                <button
                  className="botao-principal botao-compacto"
                  onClick={() => {
                    gravaModeloDe(provedor, modelo.trim())
                    confirmaSalvo()
                  }}
                >
                  Salvar
                </button>
              </div>
            </label>
          </div>
        )}
        <p className="campo-dica">
          O modelo padrão selecionado aqui aparece na tela inicial, onde também dá para trocar por
          reunião.
        </p>
      </section>

      <section className="cartao-config">
        <h2>💰 Teto de gasto por reunião</h2>
        <p>
          Um limite de custo estimado por reunião. Quando a estimativa <strong>máxima</strong> de
          uma reunião paga passar deste valor, o app pede uma confirmação antes de convocar. Ele
          nunca bloqueia. Ajuda sobretudo no modo <strong>🤝 até consenso</strong>, que pode render
          várias rodadas e encarecer a conta.
        </p>
        <label className="campo campo-base-url">
          <span className="campo-rotulo">Teto de gasto por reunião (US$)</span>
          <div className="linha-chave">
            <input
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={teto}
              onChange={(e) => setTeto(e.target.value)}
              onBlur={salvarTeto}
              aria-label="Teto de gasto por reunião em dólares"
            />
            <button className="botao-principal botao-compacto" onClick={salvarTeto}>
              Salvar
            </button>
          </div>
          <span className="campo-dica">
            A confirmação só aparece em reuniões <strong>pagas</strong> (com API conectada). O modo
            de teste e o <strong>🖥 Rodar de graça no seu chat de IA</strong> são sempre gratuitos e
            não contam. Padrão: US$ 5,00.
          </span>
        </label>
      </section>

      <section className="cartao-config">
        <h2>🎭 Personas dos conselheiros</h2>
        <p>
          Cada conselheiro é definido por um <em>system prompt</em> (o texto que define o papel
          dele). Edite para ajustar o tom, o foco ou a especialidade de cada um. As mudanças valem
          para as próximas reuniões.
        </p>
        <ul className="lista-personas">
          {MEMBROS.map((m) => {
            const customizado = lePersonas()[m.id] !== undefined
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
                  <div className="persona-corpo">
                    <PersonaForm
                      membro={m}
                      onSalvo={() => {
                        setVersaoPersonas((v) => v + 1)
                        confirmaSalvo()
                      }}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section className="cartao-config">
        <h2>🧹 Dados deste navegador</h2>
        <p>
          Tudo que o app guarda (chaves, projetos, reuniões, feedback e personas) fica apenas no{' '}
          <em>localStorage</em> deste navegador. Use os botões abaixo para limpar antes de sair de
          um computador compartilhado.
        </p>
        <div className="linha-chave">
          <button onClick={limparCredenciais}>Limpar chaves de API e token</button>
          <button onClick={apagarTudo}>Apagar TODOS os dados deste navegador</button>
        </div>
        <span className="campo-dica">
          O segundo botão apaga também projetos e reuniões, e é irreversível. A tela recarrega em
          seguida.
        </span>
      </section>

      {salvo && <div className="brinde">✓ Salvo</div>}
    </div>
  )
}
