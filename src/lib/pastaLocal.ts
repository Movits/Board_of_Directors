import type { PastaLocal, RepoConectado } from '../types'
import { BINARIO, IGNORAR } from './github'

// Lê uma pasta local escolhida no navegador (<input webkitdirectory>) e monta
// um digest textual do projeto — sem enviar nada a lugar nenhum além do
// provedor de IA na hora da análise. Tudo acontece na máquina do usuário.

const MAX_ARVORE = 400 // arquivos listados na árvore
const MAX_ARQUIVOS_CONTEUDO = 40 // arquivos cujo conteúdo entra no digest
const MAX_POR_ARQUIVO = 4000 // caracteres por arquivo
const MAX_README = 9000
const MAX_RESUMO = 48000 // teto do digest inteiro (protege o localStorage)
const MAX_LER_BYTES = 200 * 1024 // não lê arquivos maiores que isto (minificados etc.)
/** Teto de arquivos ÚTEIS considerados — protege a aba de pastas gigantes
 *  (ex.: escolheram a raiz com node_modules, que gera 100k+ entradas). */
const MAX_UTEIS = 20000

const NOMES_CHAVE = [
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'go.mod',
  'cargo.toml',
  'composer.json',
  'gemfile',
  'pom.xml',
  'tsconfig.json',
  'dockerfile',
]

/** Extensões cujo CONTEÚDO vale a pena incluir (código e config legíveis). */
const EXT_FONTE =
  /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|rb|php|java|kt|kts|swift|c|cc|cpp|h|hpp|cs|vue|svelte|astro|css|scss|less|html|sql|sh|bash|md|markdown|json|ya?ml|toml|ini|env\.example)$/i

interface Entrada {
  f: File
  path: string
}

function relativo(f: File): string {
  return f.webkitRelativePath && f.webkitRelativePath.length > 0 ? f.webkitRelativePath : f.name
}

function ehChave(path: string): boolean {
  const base = path.slice(path.lastIndexOf('/') + 1).toLowerCase()
  return NOMES_CHAVE.includes(base)
}

function ehReadme(path: string): boolean {
  return /^readme(\.md|\.markdown|\.txt)?$/i.test(path)
}

/** Converte a seleção de pasta em um digest para os conselheiros analisarem. */
export async function lerPastaLocal(arquivos: File[]): Promise<PastaLocal> {
  if (arquivos.length === 0) throw new Error('A pasta selecionada está vazia.')

  const primeiroRel = relativo(arquivos[0])
  const raiz = primeiroRel.includes('/') ? primeiroRel.slice(0, primeiroRel.indexOf('/')) : ''
  const nome = raiz || 'pasta local'
  const semRaiz = (rel: string) => (raiz && rel.startsWith(raiz + '/') ? rel.slice(raiz.length + 1) : rel)

  // Passada ÚNICA: filtra enquanto varre (descartando já a referência File dos
  // ignorados/binários) e para no teto — nunca retém 100k+ File objects de um
  // node_modules escolhido por engano. Cede a main thread a cada 5k para o
  // spinner "Lendo…" pintar e a aba não travar.
  const uteis: Entrada[] = []
  let excedeuTeto = false
  for (let i = 0; i < arquivos.length; i++) {
    if (i > 0 && i % 5000 === 0) await new Promise((r) => setTimeout(r, 0))
    const path = semRaiz(relativo(arquivos[i]))
    if (path.length === 0 || IGNORAR.test(path) || BINARIO.test(path)) continue
    if (uteis.length >= MAX_UTEIS) {
      excedeuTeto = true
      break
    }
    uteis.push({ f: arquivos[i], path })
  }

  if (uteis.length === 0) {
    throw new Error(
      `Não encontrei arquivos de código ou texto em "${nome}" (só binários ou pastas ignoradas como node_modules). Se escolheu a raiz de um projeto grande, tente selecionar só a pasta do código-fonte.`,
    )
  }
  // Basenames repetidos quando não há caminho relativo (fallback): desambigua
  // para a árvore e os blocos de conteúdo não colidirem.
  const contagem = new Map<string, number>()
  for (const e of uteis) {
    const n = (contagem.get(e.path) ?? 0) + 1
    contagem.set(e.path, n)
    if (n > 1) e.path = e.path.replace(/(\.[^./]+)?$/, `~${n}$1`)
  }

  // Estatística por extensão
  const porExtensao = new Map<string, number>()
  for (const e of uteis) {
    const ext = e.path.includes('.') ? e.path.slice(e.path.lastIndexOf('.')) : '(sem extensão)'
    porExtensao.set(ext, (porExtensao.get(ext) ?? 0) + 1)
  }
  const estatistica = [...porExtensao.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([ext, n]) => `${ext}: ${n}`)
    .join(' · ')

  // Árvore de arquivos (comparação simples é mais barata que localeCompare)
  const ordenados = [...uteis].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  const arvore =
    ordenados
      .slice(0, MAX_ARVORE)
      .map((e) => e.path)
      .join('\n') + (uteis.length > MAX_ARVORE ? `\n… e mais ${uteis.length - MAX_ARVORE} arquivos` : '')

  // Prioriza conteúdo: README → manifestos → demais fontes (menores primeiro)
  const legiveis = uteis.filter(
    (e) => e.f.size <= MAX_LER_BYTES && (EXT_FONTE.test(e.path) || ehChave(e.path) || ehReadme(e.path)),
  )
  const prioridade = (e: Entrada) => (ehReadme(e.path) ? 0 : ehChave(e.path) ? 1 : 2)
  legiveis.sort((a, b) => prioridade(a) - prioridade(b) || a.f.size - b.f.size)

  const CABECALHO_CONTEUDO = '\n\n## Conteúdo dos principais arquivos\n'
  const partes: string[] = [
    `Pasta local: ${nome}`,
    `${uteis.length} arquivos úteis${excedeuTeto ? ` (limitado a ${MAX_UTEIS} — a pasta é enorme; considere selecionar só o código-fonte)` : ''} · Arquivos por tipo: ${estatistica}`,
    '',
    '## Árvore de arquivos',
    arvore,
  ]
  // Reserva o custo do cabeçalho da seção de conteúdo no orçamento.
  let orcamento = MAX_RESUMO - partes.join('\n').length - CABECALHO_CONTEUDO.length - 200
  let incluidos = 0
  const conteudos: string[] = []

  for (const e of legiveis) {
    if (incluidos >= MAX_ARQUIVOS_CONTEUDO || orcamento < 500) break
    let texto: string
    try {
      texto = await e.f.text()
    } catch {
      continue
    }
    const limite = ehReadme(e.path) ? MAX_README : MAX_POR_ARQUIVO
    if (texto.length > limite) texto = texto.slice(0, limite) + '\n… (arquivo truncado)'
    const bloco = `### ${e.path}\n\`\`\`\n${texto}\n\`\`\``
    if (bloco.length > orcamento) continue
    conteudos.push(bloco)
    orcamento -= bloco.length + 2
    incluidos += 1
  }

  if (conteudos.length > 0) {
    partes.push('', '## Conteúdo dos principais arquivos', ...conteudos)
  }

  let resumo = partes.join('\n')
  // Rede de segurança: se ainda estourar, corta e fecha a cerca de código se
  // tiver ficado aberta (nº ímpar de ```), para não quebrar o markdown.
  if (resumo.length > MAX_RESUMO) {
    resumo = resumo.slice(0, MAX_RESUMO)
    if ((resumo.match(/```/g)?.length ?? 0) % 2 !== 0) resumo += '\n```'
    resumo += '\n… (digest truncado)'
  }

  return { nome, arquivos: uteis.length, resumo, atualizadoEm: new Date().toISOString() }
}

/** Digest de código combinado (repositório do GitHub + pasta local), para
 *  injetar no contexto da reunião e no briefing do Claude Code. */
export function resumoDeCodigo(fontes: {
  repo?: RepoConectado
  pastaLocal?: PastaLocal
}): string | undefined {
  const partes = [fontes.repo?.resumo, fontes.pastaLocal?.resumo].filter(Boolean)
  return partes.length > 0 ? partes.join('\n\n---\n\n') : undefined
}
