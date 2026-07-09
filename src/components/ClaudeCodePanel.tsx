import { useRef, useState } from 'react'
import { usarFocusTrap } from '../lib/focusTrap'

interface Props {
  prompt: string
  aoFechar: () => void
}

/** Modal com o prompt pronto para colar em qualquer chat de IA, para rodar o
 *  conselho no plano do usuário (sem gastar API). */
export function ClaudeCodePanel({ prompt, aoFechar }: Props) {
  const [copiado, setCopiado] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  // Gestão de foco unificada: prende o Tab, fecha no Esc e trava o scroll.
  const modalRef = usarFocusTrap<HTMLDivElement>(true, aoFechar)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      const selecao = window.getSelection()
      if (preRef.current && selecao) {
        const alcance = document.createRange()
        alcance.selectNodeContents(preRef.current)
        selecao.removeAllRanges()
        selecao.addRange(alcance)
      }
    }
  }

  return (
    <div className="cc-overlay" onClick={aoFechar}>
      <div
        ref={modalRef}
        className="cc-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Rodar de graça no seu chat de IA"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cc-cabecalho">
          <h2>🖥 Rodar de graça no seu chat de IA</h2>
          <button className="documento-fechar" onClick={aoFechar}>
            ✕ Fechar
          </button>
        </header>

        <p className="cc-intro">
          Roda <strong>no plano que você já usa</strong>, <strong>sem custo</strong>. Copie o texto
          abaixo e cole no seu chat de IA (ChatGPT, Claude, Gemini, Copilot ou outro). Ele convoca os
          13 conselheiros, faz o debate, a votação e entrega o veredito, o plano e o prompt de
          execução. Bônus: em assistentes que mexem em código (como o Claude Code ou o Cursor), ele
          ainda lê o seu projeto e pode até criar as coisas por você.
        </p>
        <p className="campo-dica">
          Funciona em qualquer chat de IA. Um exemplo que também mexe em código é o Claude Code (
          <a href="https://claude.com/claude-code" target="_blank" rel="noreferrer">
            claude.com/claude-code
          </a>
          ). As reuniões feitas fora do app não aparecem no seu Histórico aqui.
        </p>

        <div className="cc-acoes">
          <button className="botao-principal" onClick={copiar}>
            {copiado ? '✓ Copiado!' : '⧉ Copiar o prompt'}
          </button>
        </div>

        <pre className="cc-texto" ref={preRef}>
          {prompt}
        </pre>
      </div>
    </div>
  )
}
