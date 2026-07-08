import { useState } from 'react'
import type { Membro } from '../types'
import { gravaPersona, lePersonas } from '../lib/storage'

interface Props {
  membro: Membro
  onSalvo?: () => void
}

/** Editor da persona (system prompt) de um conselheiro — usado nas
 *  Configurações e na aba "Configuração" da gaveta do conselheiro. */
export function PersonaForm({ membro, onSalvo }: Props) {
  const [valor, setValor] = useState(() => lePersonas()[membro.id] ?? membro.systemPrompt)
  const [customizado, setCustomizado] = useState(() => lePersonas()[membro.id] !== undefined)

  return (
    <div className="persona-editor">
      <textarea
        rows={10}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        spellCheck={false}
      />
      <div className="persona-acoes">
        <button
          className="botao-principal botao-compacto"
          onClick={() => {
            gravaPersona(membro.id, valor)
            setCustomizado(true)
            onSalvo?.()
          }}
        >
          Salvar persona
        </button>
        <button
          disabled={!customizado}
          onClick={() => {
            gravaPersona(membro.id, null)
            setValor(membro.systemPrompt)
            setCustomizado(false)
            onSalvo?.()
          }}
        >
          Restaurar padrão
        </button>
        {customizado && <span className="selo-customizado">personalizado</span>}
      </div>
    </div>
  )
}
