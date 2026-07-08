import { useEffect, useRef, useState } from 'react'

interface Props {
  prompt: string
  streamando: boolean
  /** Mensagem de falha na geração — mostra o botão de tentar de novo. */
  erro?: string
  aoRegerar?: () => void
}

export function PromptPanel({ prompt, streamando, erro, aoRegerar }: Props) {
  const [copiado, setCopiado] = useState(false)
  const fimRef = useRef<HTMLSpanElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (streamando) fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [prompt, streamando])

  if (!prompt && !streamando && !erro) return null

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // clipboard indisponível (permissão): seleciona o texto como alternativa
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
    <section className="painel-prompt">
      <div className="painel-prompt-topo">
        <h3>🚀 Prompt de execução</h3>
        {prompt && !streamando && (
          <button className="botao-copiar" onClick={copiar}>
            {copiado ? '✓ Copiado' : '⧉ Copiar prompt'}
          </button>
        )}
      </div>
      {erro && !streamando ? (
        <>
          <p className="painel-prompt-nota painel-erro-nota">
            ⚠️ A geração do prompt falhou ({erro}). O restante da reunião foi salvo normalmente.
          </p>
          {aoRegerar && (
            <button className="botao-principal botao-compacto" onClick={aoRegerar}>
              ↻ Gerar novamente
            </button>
          )}
        </>
      ) : (
        <>
          <p className="painel-prompt-nota">
            O conselho decide, mas não executa: cole este prompt no seu{' '}
            <strong>agente de programação</strong> preferido (Claude Code, Codex, Cursor…) para
            tirar o plano do papel.
          </p>
          <pre className="prompt-texto" ref={preRef}>
            {prompt}
            {streamando && <span className="cursor-piscando" aria-hidden />}
            <span ref={fimRef} />
          </pre>
        </>
      )}
    </section>
  )
}
