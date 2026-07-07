import { useEffect, useRef } from 'react'
import type { Reuniao } from '../types'
import { Markdown } from '../lib/markdown'
import { exportaJson, exportaMarkdown } from '../lib/exportar'

interface Props {
  veredito: string
  streamando: boolean
  reuniao?: Reuniao
}

export function VerdictPanel({ veredito, streamando, reuniao }: Props) {
  const fimRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (streamando) fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [veredito, streamando])

  if (!veredito && !streamando) {
    return (
      <section className="veredito veredito-vazio">
        <h3>Veredito do Conselho</h3>
        <p>A síntese da Presidente aparecerá aqui quando o debate terminar.</p>
      </section>
    )
  }

  return (
    <section className="veredito">
      <div className="veredito-conteudo">
        <Markdown texto={veredito} />
        {streamando && <span className="cursor-piscando" aria-hidden />}
        <div ref={fimRef} />
      </div>
      {reuniao && (
        <div className="veredito-acoes">
          <button onClick={() => exportaMarkdown(reuniao)}>⬇︎ Exportar Markdown</button>
          <button onClick={() => exportaJson(reuniao)}>⬇︎ Exportar JSON</button>
        </div>
      )}
    </section>
  )
}
