import { useEffect, useRef, useState } from 'react'

interface Props {
  prompt: string
  streamando: boolean
}

export function PromptPanel({ prompt, streamando }: Props) {
  const [copiado, setCopiado] = useState(false)
  const fimRef = useRef<HTMLSpanElement>(null)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    if (streamando) fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [prompt, streamando])

  if (!prompt && !streamando) return null

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
      <p className="painel-prompt-nota">
        O conselho decide, mas não executa: cole este prompt no <strong>Claude Code</strong> (ou
        outro agente de programação) para tirar o plano do papel.
      </p>
      <pre className="prompt-texto" ref={preRef}>
        {prompt}
        {streamando && <span className="cursor-piscando" aria-hidden />}
        <span ref={fimRef} />
      </pre>
    </section>
  )
}
