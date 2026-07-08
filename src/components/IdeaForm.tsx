import { useState } from 'react'
import type { ConfigReuniao } from '../types'
import { MEMBROS_VOTANTES } from '../board/members'
import { infoProvedor } from '../api'
import {
  gravaRascunho,
  leBaseUrlDe,
  leChave,
  leModeloDe,
  leModelosDescobertos,
  leProvedor,
  leRascunho,
} from '../lib/storage'

interface Props {
  aoConvocar: (config: ConfigReuniao) => void
  aoAbrirConfiguracoes: () => void
}

type ModoDebate = '1' | '2' | '3' | 'consenso'

export function IdeaForm({ aoConvocar, aoAbrirConfiguracoes }: Props) {
  const provedor = leProvedor()
  const info = infoProvedor(provedor)
  // Provedor personalizado: o que define "configurado" é a Base URL (chave é opcional)
  const configurado =
    info.baseUrl === 'obrigatoria' ? leBaseUrlDe(provedor).length > 0 : leChave(provedor).length > 0

  const modeloSalvo = leModeloDe(provedor)
  // Para o provedor personalizado, oferece os modelos descobertos via "Buscar modelos"
  const modelosDisponiveis =
    info.modelos.length > 0
      ? info.modelos
      : leModelosDescobertos(provedor)
          .slice(0, 6)
          .map((id) => ({ id, rotulo: id, detalhe: 'modelo da sua API' }))
  const modeloNaLista = modelosDisponiveis.some((m) => m.id === modeloSalvo)

  const [ideia, setIdeia] = useState(() => leRascunho())
  const [modelo, setModelo] = useState(
    modeloNaLista ? modeloSalvo : 'personalizado',
  )
  const [modeloCustom, setModeloCustom] = useState(modeloNaLista ? '' : modeloSalvo)
  const [selecionados, setSelecionados] = useState<Set<string>>(
    new Set(MEMBROS_VOTANTES.map((m) => m.id)),
  )
  const [modoDebate, setModoDebate] = useState<ModoDebate>('1')
  const [gerarPlano, setGerarPlano] = useState(true)
  const [gerarPrompt, setGerarPrompt] = useState(true)
  const [demo, setDemo] = useState(!configurado)

  const escreveIdeia = (texto: string) => {
    setIdeia(texto)
    gravaRascunho(texto)
  }

  const alterna = (id: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const modeloFinal = modelo === 'personalizado' ? modeloCustom.trim() : modelo
  const faltaIdeia = ideia.trim().length < 10
  const faltaMembros = selecionados.size < 2
  // No modo demonstração nenhuma API é chamada — o modelo não bloqueia o botão.
  const faltaModelo = !demo && modeloFinal.length === 0
  const pronto = !faltaIdeia && !faltaMembros && !faltaModelo
  const motivoBloqueio = faltaIdeia
    ? 'Para começar, escreva sua ideia acima (mínimo de 10 caracteres).'
    : faltaMembros
      ? 'Selecione ao menos 2 conselheiros.'
      : faltaModelo
        ? 'Digite o ID do modelo personalizado — ou escolha um da lista.'
        : null

  // Estimativa de chamadas: N análises + N por rodada de debate + síntese + entregáveis
  const entregaveis = (gerarPlano ? 1 : 0) + (gerarPrompt ? 1 : 0)
  const chamadas = (rodadas: number) => selecionados.size * (1 + rodadas) + 1 + entregaveis
  const estimativa = demo
    ? 'Modo demonstração: nenhuma chamada de IA será feita — tudo é simulado, sem custo.'
    : modoDebate === 'consenso'
      ? `Esta configuração fará entre ${chamadas(0)} e ${chamadas(5)} chamadas de IA — o consenso pode vir logo ou levar até 5 rodadas.`
      : `Esta configuração fará ~${chamadas(Number(modoDebate))} chamadas de IA.`

  const convocar = () => {
    gravaRascunho('')
    aoConvocar({
      ideia: ideia.trim(),
      provedor,
      modelo: modeloFinal,
      membrosIds: [...selecionados],
      rodadasDebate: modoDebate === 'consenso' ? 1 : Number(modoDebate),
      ateConsenso: modoDebate === 'consenso',
      gerarPrompt,
      gerarPlano,
      demo,
    })
  }

  return (
    <div className="tela-inicio">
      <section className="hero">
        <h1>Apresente sua ideia ao conselho</h1>
        <p>
          Doze conselheiros especialistas — finanças, marketing, tecnologia, produto, design,
          vendas, jurídico e mais — analisam sua ideia, debatem entre si e votam. A Presidente do
          Conselho consolida tudo em um veredito, um plano detalhado e um prompt pronto para
          executar.
        </p>
      </section>

      <label className="campo">
        <span className="campo-rotulo">Sua ideia</span>
        <textarea
          value={ideia}
          onChange={(e) => escreveIdeia(e.target.value)}
          rows={5}
          placeholder="Descreva sua ideia com o máximo de contexto: o que é, para quem, como imagina ganhar dinheiro, o que já tem pronto…"
        />
        <span className="campo-dica">
          Quanto mais contexto você der, melhores serão as análises. O rascunho fica salvo neste
          navegador até você convocar o conselho.
        </span>
      </label>

      <fieldset className="campo">
        <legend className="campo-rotulo">Conselheiros convocados ({selecionados.size})</legend>
        <div className="chips-membros">
          {MEMBROS_VOTANTES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`chip ${selecionados.has(m.id) ? 'chip-ativo' : ''}`}
              style={{ ['--cor' as string]: m.cor }}
              onClick={() => alterna(m.id)}
              title={m.descricao}
              aria-pressed={selecionados.has(m.id)}
            >
              <span>{m.emoji}</span> {m.cargo}
            </button>
          ))}
        </div>
        <span className="campo-dica">
          A Presidente Helena Vasquez sempre participa: ela conduz a síntese final. Selecione ao
          menos 2 conselheiros.
        </span>
      </fieldset>

      <div className="linha-opcoes">
        {configurado ? (
          <fieldset className="campo campo-metade">
            <legend className="campo-rotulo">
              Modelo · {info.rotulo}{' '}
              <button className="link link-sutil" onClick={aoAbrirConfiguracoes} type="button">
                trocar provedor
              </button>
            </legend>
            <div className="opcoes-modelo">
              {modelosDisponiveis.map((m) => (
                <label key={m.id} className={`opcao-modelo ${modelo === m.id ? 'selecionada' : ''}`}>
                  <input
                    type="radio"
                    name="modelo"
                    checked={modelo === m.id}
                    onChange={() => setModelo(m.id)}
                  />
                  <strong>{m.rotulo}</strong>
                  <small>{m.detalhe}</small>
                </label>
              ))}
              <label
                className={`opcao-modelo ${modelo === 'personalizado' ? 'selecionada' : ''}`}
              >
                <input
                  type="radio"
                  name="modelo"
                  checked={modelo === 'personalizado'}
                  onChange={() => setModelo('personalizado')}
                />
                <strong>Personalizado…</strong>
                <small>digite o ID exato de qualquer modelo do provedor</small>
              </label>
            </div>
            {modelo === 'personalizado' && (
              <input
                type="text"
                className="entrada-modelo-custom"
                aria-label="ID do modelo personalizado"
                value={modeloCustom}
                onChange={(e) => setModeloCustom(e.target.value)}
                placeholder={
                  provedor === 'anthropic'
                    ? 'ex.: claude-sonnet-4-5'
                    : provedor === 'openai'
                      ? 'ex.: gpt-5.4-nano'
                      : 'ex.: llama3.3, qwen2.5-coder…'
                }
                spellCheck={false}
                autoFocus
              />
            )}
          </fieldset>
        ) : (
          <div className="campo campo-metade cartao-conectar">
            <span className="campo-rotulo">Inteligência artificial</span>
            <p className="conectar-texto">
              <strong>Nenhuma API de IA conectada.</strong> Por enquanto a reunião roda em{' '}
              <em>modo demonstração</em>: respostas simuladas, sem custo, para você conhecer a
              interface.
            </p>
            <button
              type="button"
              className="botao-principal botao-conectar"
              onClick={aoAbrirConfiguracoes}
            >
              🔌 Conectar uma API de IA
            </button>
            <span className="campo-dica">
              Funciona com Anthropic, OpenAI ou qualquer API compatível (Ollama local, LM Studio,
              OpenRouter…). Sua chave fica somente neste navegador.
            </span>
          </div>
        )}

        <div className="campo campo-metade">
          <fieldset className="campo">
            <legend className="campo-rotulo">Rodadas de debate</legend>
            <div className="opcoes-debate">
              {(['1', '2', '3'] as const).map((n) => (
                <label key={n} className={`opcao-debate ${modoDebate === n ? 'selecionada' : ''}`}>
                  <input
                    type="radio"
                    name="debate"
                    checked={modoDebate === n}
                    onChange={() => setModoDebate(n)}
                  />
                  {n}
                </label>
              ))}
              <label className={`opcao-debate ${modoDebate === 'consenso' ? 'selecionada' : ''}`}>
                <input
                  type="radio"
                  name="debate"
                  checked={modoDebate === 'consenso'}
                  onChange={() => setModoDebate('consenso')}
                />
                🤝 Até consenso
              </label>
            </div>
            <span className="campo-dica">
              {modoDebate === 'consenso'
                ? 'O debate se repete até TODOS votarem Aprovar ou TODOS votarem Rejeitar. Ressalvas não encerram: viram condições debatidas até serem resolvidas (máximo de 5 rodadas — atenção ao custo).'
                : 'No debate, os conselheiros leem as posições uns dos outros, rebatem e podem mudar de voto.'}
            </span>
          </fieldset>

          <fieldset className="campo">
            <legend className="campo-rotulo">Entregáveis ao final</legend>
            <label className="alternador">
              <input
                type="checkbox"
                checked={gerarPlano}
                onChange={(e) => setGerarPlano(e.target.checked)}
              />
              <span>
                📄 Plano detalhado (documento com PDF)
                <small>
                  Pesquisa de mercado, SWOT, cronograma, orçamento com gráficos e riscos — para
                  avaliar a ideia antes de executar qualquer coisa.
                </small>
              </span>
            </label>
            <label className="alternador">
              <input
                type="checkbox"
                checked={gerarPrompt}
                onChange={(e) => setGerarPrompt(e.target.checked)}
              />
              <span>
                🚀 Prompt de execução
                <small>
                  A decisão vira um prompt detalhado para colar no seu agente de programação
                  preferido (Claude Code, Codex, Cursor…).
                </small>
              </span>
            </label>
          </fieldset>

          {configurado && (
            <label className="alternador">
              <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
              <span>
                Modo demonstração
                <small>Respostas simuladas para conhecer a interface, sem custo.</small>
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="acao-convocar">
        <button className="botao-principal" disabled={!pronto} onClick={convocar}>
          🔔 Convocar o Conselho
        </button>
        {motivoBloqueio ? (
          <span className="motivo-bloqueio">{motivoBloqueio}</span>
        ) : (
          <span className="estimativa-chamadas">{estimativa}</span>
        )}
      </div>
    </div>
  )
}
