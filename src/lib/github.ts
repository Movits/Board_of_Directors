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

// Compartilhados com a leitura de pasta local (src/lib/pastaLocal.ts).
export const IGNORAR =
  /(^|\/)(node_modules|dist|build|out|vendor|\.git|coverage|__pycache__|\.next|\.turbo|\.venv|venv|target|\.cache|\.idea|\.vscode)(\/|$)/
export const BINARIO =
  /\.(png|jpe?g|gif|webp|svg|ico|bmp|woff2?|ttf|eot|otf|mp[34]|wav|webm|mov|avi|zip|gz|tar|rar|7z|jar|pdf|lock|exe|dll|so|dylib|bin|dat|wasm|class|pyc)$/i

// ---------------------------------------------------------------------------
// Proteção anti-segredo (compartilhada com src/lib/pastaLocal.ts).
// O digest vai ao localStorage e ao provedor de IA — arquivos sensíveis ficam
// FORA da árvore e do conteúdo, e padrões óbvios de credencial são redigidos
// de todo texto incluído.

/** Nomes/caminhos que denunciam segredos — nunca entram no digest.
 *  Ancorada em nome/extensão completos para evitar falsos positivos
 *  (ex.: "keyboard.ts" NÃO casa com *.key). Sem flag `g` de propósito:
 *  é usada com .test() e não pode carregar lastIndex entre chamadas. */
export const SEGREDOS = new RegExp(
  [
    // .env e variantes (.env.local, .env.production, .envrc, prod.env…) —
    // exceto templates sem segredo real (.env.example/sample/template)
    '(^|/)\\.env(rc)?(\\.(?!example$|sample$|template$)[^/]+)?$',
    '(^|/)[^/]+\\.env$',
    // qualquer segmento do caminho contendo secret/credential/keystore
    '(^|/)[^/]*(secret|credential|keystore)[^/]*(/|$)',
    // chaves, certificados e variáveis do Terraform, por extensão completa
    '\\.(pem|key|p12|pfx|tfvars|tfvars\\.json)$',
    // chaves SSH
    '(^|/)id_(rsa|ed25519|ecdsa|dsa)[^/]*$',
    // arquivos clássicos de credenciais
    '(^|/)(\\.npmrc|\\.netrc|\\.git-credentials|\\.htpasswd)$',
    // diretórios sensíveis
    '(^|/)\\.(aws|kube)(/|$)',
  ].join('|'),
  'i',
)

/** Fichas de API com prefixo reconhecível (OpenAI/Anthropic, Stripe, AWS,
 *  GitHub, GitLab, Google, Slack) — mesmo soltas, sem nome de chave à frente. */
const FICHA_OBVIA = new RegExp(
  [
    'sk-[A-Za-z0-9_-]{8,}', // OpenAI/Anthropic
    'sk_(?:live|test)_[A-Za-z0-9]{10,}', // Stripe secreta
    'rk_(?:live|test)_[A-Za-z0-9]{10,}', // Stripe restrita
    'whsec_[A-Za-z0-9]{10,}', // Stripe webhook
    'AKIA[A-Z0-9]{16}', // AWS access key id
    'ghp_[A-Za-z0-9]{20,}', // GitHub PAT clássico
    'github_pat_[A-Za-z0-9_]{20,}', // GitHub fine-grained PAT
    'glpat-[A-Za-z0-9_-]{20,}', // GitLab PAT
    'AIza[0-9A-Za-z_-]{35}', // Google API key
    'xox[baprs]-[A-Za-z0-9-]{10,}', // Slack
    'xapp-[A-Za-z0-9-]{10,}', // Slack app-level
  ].join('|'),
  'g',
)

/** Blocos PEM de chave privada (inclusive truncados no fim do texto). */
const BLOCO_CHAVE_PRIVADA =
  /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z0-9 ]*PRIVATE KEY-----|$)/g

/** Pares chave/valor cujo nome denuncia credencial (password: "…", TOKEN=…). */
const PAR_SENSIVEL =
  /([A-Za-z0-9_.-]*(?:password|passwd|senha|token|secret|api[_-]?key)[A-Za-z0-9_-]*["']?\s*[:=]\s*)("[^"\r\n]{1,256}"|'[^'\r\n]{1,256}'|[^\s"'`,;]{1,256})/gi

/** Valores que não são segredo (anotações de tipo, referências a env etc.) —
 *  evita mutilar código-fonte comum como `token: string`. */
const VALOR_INOFENSIVO =
  /^(string|number|boolean|object|any|unknown|bytes|str|int|float|bool|null|none|nil|undefined|true|false|await|new|this|self|\$.*|process\.env\.[A-Za-z0-9_]+|os\.environ.*|\[REDIGIDO\])$/i

/** Redige padrões óbvios de segredo de um texto ANTES de ele entrar no
 *  digest (que é persistido no localStorage e enviado ao provedor de IA).
 *  Redação leve: preserva a chave e substitui só o valor por [REDIGIDO]. */
export function redigirSegredos(texto: string): string {
  return texto
    .replace(BLOCO_CHAVE_PRIVADA, '[CHAVE PRIVADA REDIGIDA]')
    .replace(FICHA_OBVIA, '[REDIGIDO]')
    .replace(PAR_SENSIVEL, (tudo, chave: string, valor: string) => {
      const aspas = valor[0] === '"' || valor[0] === "'" ? valor[0] : ''
      const bruto = aspas ? valor.slice(1, -1) : valor
      if (VALOR_INOFENSIVO.test(bruto)) return tudo
      return `${chave}${aspas}[REDIGIDO]${aspas}`
    })
}

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
  let omitidosSeguranca = 0
  try {
    const arvore = (await (
      await gh(`/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, token)
    ).json()) as { tree: ItemArvore[]; truncated: boolean }
    const candidatos = arvore.tree.filter(
      (i) => i.type === 'blob' && !IGNORAR.test(i.path) && !BINARIO.test(i.path),
    )
    // Arquivos sensíveis (.env, chaves, credenciais…) ficam fora da árvore e
    // do conteúdo — e o cabeçalho avisa quantos foram omitidos.
    const arquivos = candidatos.filter((i) => {
      if (SEGREDOS.test(i.path)) {
        omitidosSeguranca += 1
        return false
      }
      return true
    })
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

  // 3. README (com redação de segredos ANTES do truncamento)
  let readme = ''
  try {
    readme = redigirSegredos(
      await (
        await gh(`/repos/${owner}/${repo}/readme`, token, 'application/vnd.github.raw+json')
      ).text(),
    )
    if (readme.length > MAX_README) readme = readme.slice(0, MAX_README) + '\n… (README truncado)'
  } catch {
    readme = '(sem README)'
  }

  // 4. Arquivos-chave (manifestos de dependências) — redação uniforme: barato
  // e garante que nenhum segredo colado ali por engano vaze no digest.
  const chaves: string[] = []
  for (const nome of ARQUIVOS_CHAVE) {
    try {
      const conteudo = redigirSegredos(
        await (
          await gh(`/repos/${owner}/${repo}/contents/${nome}`, token, 'application/vnd.github.raw+json')
        ).text(),
      )
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
    meta.description ? `Descrição: ${redigirSegredos(meta.description)}` : '',
    meta.language ? `Linguagem principal: ${meta.language}` : '',
    `Último push: ${meta.pushed_at?.slice(0, 10) ?? '?'} · Estrelas: ${meta.stargazers_count}`,
    estatistica ? `Arquivos por tipo: ${estatistica}` : '',
    omitidosSeguranca > 0
      ? `${omitidosSeguranca} arquivo(s) sensível(is) omitido(s) por segurança (.env, chaves, credenciais…)`
      : '',
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
