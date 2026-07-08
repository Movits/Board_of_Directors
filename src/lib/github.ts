import type { RepoConectado } from '../types'

// Leitura de repositórios direto do navegador via api.github.com (a API do
// GitHub aceita CORS). Sem token: só repositórios públicos, 60 req/h por IP.

const API = 'https://api.github.com'
const MAX_ARVORE = 350
const MAX_README = 9000
const MAX_ARQUIVO_CHAVE = 2500
const MAX_RESUMO = 24000

const ARQUIVOS_CHAVE = [
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'go.mod',
  'Cargo.toml',
  'composer.json',
  'Gemfile',
  'pom.xml',
]

const IGNORAR = /(^|\/)(node_modules|dist|build|out|vendor|\.git|coverage|__pycache__|\.next|target)(\/|$)/
const BINARIO = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp[34]|webm|zip|gz|jar|pdf|lock)$/i

/** Aceita URL completa ou "dono/repo". */
export function parseRepo(entrada: string): { owner: string; repo: string } | null {
  const limpa = entrada.trim().replace(/\.git$/, '').replace(/\/+$/, '')
  const porUrl = limpa.match(/github\.com[/:]([^/\s]+)\/([^/\s]+)/i)
  if (porUrl) return { owner: porUrl[1], repo: porUrl[2] }
  const direto = limpa.match(/^([\w.-]+)\/([\w.-]+)$/)
  if (direto) return { owner: direto[1], repo: direto[2] }
  return null
}

async function gh(caminho: string, token: string | undefined, aceita?: string): Promise<Response> {
  const resposta = await fetch(`${API}${caminho}`, {
    headers: {
      Accept: aceita ?? 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (resposta.status === 404) {
    throw new Error(
      'Repositório não encontrado. Confira o endereço — e, se for privado, informe um token de acesso do GitHub.',
    )
  }
  if (resposta.status === 401) {
    throw new Error('Token do GitHub inválido ou expirado.')
  }
  if (resposta.status === 403 || resposta.status === 429) {
    throw new Error(
      'Limite de requisições da API do GitHub atingido. Aguarde alguns minutos — ou informe um token para ampliar o limite.',
    )
  }
  if (!resposta.ok) {
    throw new Error(`Erro da API do GitHub (${resposta.status}).`)
  }
  return resposta
}

interface ItemArvore {
  path: string
  type: 'blob' | 'tree'
  size?: number
}

/** Lê o repositório e monta um digest textual para os conselheiros analisarem. */
export async function lerRepositorio(
  owner: string,
  repo: string,
  token?: string,
): Promise<RepoConectado> {
  // 1. Metadados (nome, descrição, branch padrão, linguagem)
  const meta = (await (await gh(`/repos/${owner}/${repo}`, token)).json()) as {
    full_name: string
    description: string | null
    default_branch: string
    language: string | null
    stargazers_count: number
    pushed_at: string
  }
  const branch = meta.default_branch

  // 2. Árvore de arquivos (recursiva) — filtra ruído e limita o tamanho
  let arvoreTexto = '(não foi possível ler a árvore de arquivos)'
  let estatistica = ''
  try {
    const arvore = (await (
      await gh(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, token)
    ).json()) as { tree: ItemArvore[]; truncated: boolean }
    const arquivos = arvore.tree.filter(
      (i) => i.type === 'blob' && !IGNORAR.test(i.path) && !BINARIO.test(i.path),
    )
    const porExtensao = new Map<string, number>()
    for (const a of arquivos) {
      const ext = a.path.includes('.') ? a.path.slice(a.path.lastIndexOf('.')) : '(sem extensão)'
      porExtensao.set(ext, (porExtensao.get(ext) ?? 0) + 1)
    }
    estatistica = [...porExtensao.entries()]
      .sort((x, y) => y[1] - x[1])
      .slice(0, 10)
      .map(([ext, n]) => `${ext}: ${n}`)
      .join(' · ')
    const listados = arquivos.slice(0, MAX_ARVORE).map((a) => a.path)
    arvoreTexto =
      listados.join('\n') +
      (arquivos.length > MAX_ARVORE ? `\n… e mais ${arquivos.length - MAX_ARVORE} arquivos` : '') +
      (arvore.truncated ? '\n(árvore truncada pela API)' : '')
  } catch {
    // árvore é opcional — segue com o resto
  }

  // 3. README
  let readme = ''
  try {
    readme = await (
      await gh(`/repos/${owner}/${repo}/readme`, token, 'application/vnd.github.raw+json')
    ).text()
    if (readme.length > MAX_README) readme = readme.slice(0, MAX_README) + '\n… (README truncado)'
  } catch {
    readme = '(sem README)'
  }

  // 4. Arquivos-chave (manifestos de dependências)
  const chaves: string[] = []
  for (const nome of ARQUIVOS_CHAVE) {
    try {
      const conteudo = await (
        await gh(`/repos/${owner}/${repo}/contents/${nome}`, token, 'application/vnd.github.raw+json')
      ).text()
      chaves.push(
        `### ${nome}\n${conteudo.length > MAX_ARQUIVO_CHAVE ? conteudo.slice(0, MAX_ARQUIVO_CHAVE) + '\n…' : conteudo}`,
      )
    } catch {
      // arquivo não existe — normal
    }
    if (chaves.length >= 2) break
  }

  let resumo = [
    `Repositório: ${meta.full_name} (branch ${branch})`,
    meta.description ? `Descrição: ${meta.description}` : '',
    meta.language ? `Linguagem principal: ${meta.language}` : '',
    `Último push: ${meta.pushed_at?.slice(0, 10) ?? '?'} · Estrelas: ${meta.stargazers_count}`,
    estatistica ? `Arquivos por tipo: ${estatistica}` : '',
    '',
    '## Árvore de arquivos',
    arvoreTexto,
    '',
    '## README',
    readme,
    ...(chaves.length > 0 ? ['', '## Arquivos-chave', ...chaves] : []),
  ]
    .filter((linha, i, arr) => !(linha === '' && arr[i - 1] === ''))
    .join('\n')
  if (resumo.length > MAX_RESUMO) resumo = resumo.slice(0, MAX_RESUMO) + '\n… (digest truncado)'

  return {
    url: `https://github.com/${owner}/${repo}`,
    owner,
    repo,
    branch,
    resumo,
    atualizadoEm: new Date().toISOString(),
  }
}
