import { useState } from 'react'
import type { ConfigReuniao, ModelId } from '../types'
import { MEMBROS_VOTANTES } from '../board/members'
import { MODELOS } from '../api/anthropic'
import { leApiKey, leModelo } from '../lib/storage'

interface Props {
  aoConvocar: (config: ConfigReuniao) => void
  aoAbrirConfiguracoes: () => void
}

export function IdeaForm({ aoConvocar, aoAbrirConfiguracoes }: Props) {
  const temChave = leApiKey().length > 0
  const [ideia, setIdeia] = useState('')
  const [modelo, setModelo] = useState<ModelId>(leModelo())
  const [selecionados, setSelecionados] = useState<Set<string>>(
    new Set(MEMBROS_VOTANTES.map((m) => m.id)),
  )
  const [rodadasDebate, setRodadasDebate] = useState(1)
  const [demo, setDemo] = useState(!temChave)

  const alterna = (id: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const pronto = ideia.trim().length >= 10 && selecionados.size >= 2

  return (
    <div className="tela-inicio">
      <section className="hero">
        <h1>Apresente sua ideia ao conselho</h1>
        <p>
          Treze conselheiros com expertises diferentes — finanças, marketing, tecnologia, produto,
          design, vendas, jurídico e mais — analisam sua ideia, debatem entre si e votam.
        </p>
      </section>

      {!temChave && (
        <div className="aviso aviso-info">
          <strong>Sem chave de API configurada.</strong> A reunião rodará em{' '}
          <em>modo demonstração</em> (respostas simuladas, sem custo).{' '}
          <button className="link" onClick={aoAbrirConfiguracoes}>
            Configurar chave da Anthropic →
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
          <legend className="campo-rotulo">Modelo</legend>
          <div className="opcoes-modelo">
            {MODELOS.map((m) => (
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
          </div>
        </fieldset>

        <div className="campo campo-metade">
          <fieldset className="campo">
            <legend className="campo-rotulo">Rodadas de debate</legend>
            <div className="opcoes-debate">
              {[1, 2].map((n) => (
                <label key={n} className={`opcao-debate ${rodadasDebate === n ? 'selecionada' : ''}`}>
                  <input
                    type="radio"
                    name="debate"
                    checked={rodadasDebate === n}
                    onChange={() => setRodadasDebate(n)}
                  />
                  {n} rodada{n > 1 ? 's' : ''}
                </label>
              ))}
            </div>
            <span className="campo-dica">
              No debate, os conselheiros leem as posições uns dos outros, rebatem e podem mudar de
              voto. Mais rodadas = análise mais rica, custo maior.
            </span>
          </fieldset>

          <label className="alternador">
            <input
              type="checkbox"
              checked={demo}
              disabled={!temChave}
              onChange={(e) => setDemo(e.target.checked)}
            />
            <span>
              Modo demonstração {!temChave && '(obrigatório sem chave de API)'}
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
            modelo,
            membrosIds: [...selecionados],
            rodadasDebate,
            demo,
          })
        }
      >
        🔔 Convocar o Conselho
      </button>
    </div>
  )
}
