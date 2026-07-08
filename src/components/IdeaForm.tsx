import { useState } from 'react'
import type { ConfigReuniao } from '../types'
import { MEMBROS_VOTANTES } from '../board/members'
import { infoProvedor } from '../api'
import { leBaseUrlDe, leChave, leModeloDe, leModelosDescobertos, leProvedor } from '../lib/storage'

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

  const [ideia, setIdeia] = useState('')
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

  const alterna = (id: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const modeloFinal = modelo === 'personalizado' ? modeloCustom.trim() : modelo
  const pronto = ideia.trim().length >= 10 && selecionados.size >= 2 && modeloFinal.length > 0

  return (
    <div className="tela-inicio">
      <section className="hero">
        <h1>Apresente sua ideia ao conselho</h1>
        <p>
          Treze conselheiros com expertises diferentes — finanças, marketing, tecnologia, produto,
          design, vendas, jurídico e mais — analisam sua ideia, debatem entre si, votam e entregam
          o plano detalhado e um prompt pronto para executar.
        </p>
      </section>

      {!configurado && (
        <div className="aviso aviso-info">
          <strong>Nenhuma API de IA conectada.</strong> A reunião rodará em{' '}
          <em>modo demonstração</em> (respostas simuladas, sem custo).{' '}
          <button className="link" onClick={aoAbrirConfiguracoes}>
            Conectar uma API →
          </button>
        </div>
      )}

      <label className="campo">
        <span className="campo-rotulo">Sua ideia</span>
        <textarea
          value={ideia}
          onChange={(e) => setIdeia(e.target.value)}
          rows={5}
          placeholder="Descreva sua ideia com o máximo de contexto: o que é, para quem, como imagina ganhar dinheiro, o que já tem pronto…"
        />
        <span className="campo-dica">
          Quanto mais contexto você der, melhores serão as análises. Mínimo de 10 caracteres.
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
        <fieldset className="campo campo-metade">
          <legend className="campo-rotulo">
            Modelo{configurado ? ` · ${info.rotulo}` : ' — não configurado'}{' '}
            <button className="link link-sutil" onClick={aoAbrirConfiguracoes} type="button">
              {configurado ? 'trocar' : 'configurar'}
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
              {modelo === 'personalizado' && (
                <input
                  type="text"
                  className="entrada-modelo-custom"
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
                />
              )}
            </label>
          </div>
        </fieldset>

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
                ? 'O debate se repete até TODOS os conselheiros votarem igual (máximo de 5 rodadas — atenção ao custo).'
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

          <label className="alternador">
            <input
              type="checkbox"
              checked={demo}
              disabled={!configurado}
              onChange={(e) => setDemo(e.target.checked)}
            />
            <span>
              Modo demonstração {!configurado && '(obrigatório sem API configurada)'}
              <small>Respostas simuladas para conhecer a interface, sem custo.</small>
            </span>
          </label>
        </div>
      </div>

      <button
        className="botao-principal"
        disabled={!pronto}
        onClick={() =>
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
      >
        🔔 Convocar o Conselho
      </button>
    </div>
  )
}
