import { useRef, useState } from 'react'
import { usarFocusTrap } from '../lib/focusTrap'

interface Props {
  prompt: string
  aoFechar: () => void
}

/** Modal com o briefing pronto para colar no Claude Code — roda o conselho no
 *  plano do usuário (sem gastar API). */
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
        aria-label="Rodar no Claude Code"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cc-cabecalho">
          <h2>🖥 Rodar no Claude Code</h2>
          <button className="documento-fechar" onClick={aoFechar}>
            ✕ Fechar
          </button>
        </header>

        <p className="cc-intro">
          Roda no <strong>seu plano</strong> (Pro/Max) — <strong>sem gastar API</strong>. Copie o
          briefing abaixo e cole numa sessão do <strong>Claude Code</strong> (terminal, VS Code,
          JetBrains ou claude.ai/code). Ele convoca os 13 conselheiros, debate, vota e entrega o
          veredito, o plano e o prompt de execução — e, se for um projeto de código, pode
          implementar na hora.
        </p>
        <p className="campo-dica">
          Não tem o Claude Code? Instale em{' '}
          <a href="https://claude.com/claude-code" target="_blank" rel="noreferrer">
            claude.com/claude-code
          </a>
          . As reuniões feitas lá não aparecem no Histórico do app.
        </p>

        <div className="cc-acoes">
          <button className="botao-principal" onClick={copiar}>
            {copiado ? '✓ Copiado!' : '⧉ Copiar briefing'}
          </button>
        </div>

        <pre className="cc-texto" ref={preRef}>
          {prompt}
        </pre>
      </div>
    </div>
  )
}
