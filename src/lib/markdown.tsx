import type { ReactNode } from 'react'

// Renderizador de markdown minimalista e seguro (sem dangerouslySetInnerHTML):
// suporta títulos, listas, negrito, itálico, código inline e separadores —
// o suficiente para o veredito do Presidente.

function inline(texto: string, chave: number): ReactNode {
  const partes: ReactNode[] = []
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g
  let ultimo = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = regex.exec(texto)) !== null) {
    if (m.index > ultimo) partes.push(texto.slice(ultimo, m.index))
    const bloco = m[0]
    if (bloco.startsWith('**')) partes.push(<strong key={`${chave}-${i++}`}>{bloco.slice(2, -2)}</strong>)
    else if (bloco.startsWith('`')) partes.push(<code key={`${chave}-${i++}`}>{bloco.slice(1, -1)}</code>)
    else partes.push(<em key={`${chave}-${i++}`}>{bloco.slice(1, -1)}</em>)
    ultimo = m.index + bloco.length
  }
  if (ultimo < texto.length) partes.push(texto.slice(ultimo))
  return partes
}

export function Markdown({ texto }: { texto: string }) {
  const linhas = texto.split('\n')
  const blocos: ReactNode[] = []
  let lista: ReactNode[] = []
  let listaOrdenada = false

  const fechaLista = (chave: string) => {
    if (lista.length === 0) return
    blocos.push(listaOrdenada ? <ol key={chave}>{lista}</ol> : <ul key={chave}>{lista}</ul>)
    lista = []
  }

  linhas.forEach((linha, i) => {
    const aparada = linha.trim()
    const itemNaoOrdenado = /^[-*]\s+(.*)/.exec(aparada)
    const itemOrdenado = /^(\d+)[.)]\s+(.*)/.exec(aparada)

    if (itemNaoOrdenado || itemOrdenado) {
      const novaOrdenada = Boolean(itemOrdenado)
      if (lista.length > 0 && novaOrdenada !== listaOrdenada) fechaLista(`l-${i}`)
      listaOrdenada = novaOrdenada
      const conteudo = itemNaoOrdenado ? itemNaoOrdenado[1] : itemOrdenado![2]
      lista.push(<li key={`li-${i}`}>{inline(conteudo, i)}</li>)
      return
    }
    fechaLista(`l-${i}`)

    if (aparada === '') return
    if (aparada === '---') {
      blocos.push(<hr key={`hr-${i}`} />)
      return
    }
    const titulo = /^(#{1,4})\s+(.*)/.exec(aparada)
    if (titulo) {
      const nivel = titulo[1].length
      const conteudo = inline(titulo[2], i)
      if (nivel === 1) blocos.push(<h1 key={`h-${i}`}>{conteudo}</h1>)
      else if (nivel === 2) blocos.push(<h2 key={`h-${i}`}>{conteudo}</h2>)
      else if (nivel === 3) blocos.push(<h3 key={`h-${i}`}>{conteudo}</h3>)
      else blocos.push(<h4 key={`h-${i}`}>{conteudo}</h4>)
      return
    }
    blocos.push(<p key={`p-${i}`}>{inline(aparada, i)}</p>)
  })
  fechaLista('l-fim')

  return <div className="markdown">{blocos}</div>
}
