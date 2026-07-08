import type { Anexo } from '../types'

// Limites pensados para o localStorage (~5MB no total do site): imagens são
// redimensionadas/comprimidas; PDFs e textos têm teto rígido.
export const MAX_ANEXOS = 5
export const MAX_TOTAL_BYTES = 3 * 1024 * 1024
const MAX_PDF_BYTES = 2 * 1024 * 1024
const MAX_TEXTO_BYTES = 60 * 1024
/** Lado maior das imagens — resolução ótima para os modelos de visão. */
const MAX_LADO_IMAGEM = 1568

const MIMES_IMAGEM = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const EXTENSOES_TEXTO = ['.txt', '.md', '.csv', '.json']

export function formataTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function tamanhoTotal(anexos: Anexo[]): number {
  return anexos.reduce((soma, a) => soma + a.tamanho, 0)
}

function novoId(): string {
  return `anexo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function leComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onload = () => resolve(leitor.result as string)
    leitor.onerror = () => reject(new Error(`Não consegui ler o arquivo "${arquivo.name}".`))
    leitor.readAsDataURL(arquivo)
  })
}

function base64DeDataUrl(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}

/** Redimensiona (máx. 1568px no lado maior) e re-encoda como JPEG — fotos e
 *  mockups grandes viram ~100-400KB sem perder o que importa para a análise. */
async function comprimeImagem(arquivo: File): Promise<{ dados: string; mime: string }> {
  const dataUrl = await leComoDataUrl(arquivo)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(`"${arquivo.name}" não parece ser uma imagem válida.`))
    img.src = dataUrl
  })

  const escala = Math.min(1, MAX_LADO_IMAGEM / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * escala))
  canvas.height = Math.max(1, Math.round(img.height * escala))
  const ctx = canvas.getContext('2d')
  if (!ctx) return { dados: base64DeDataUrl(dataUrl), mime: arquivo.type }
  // Fundo branco: transparência de PNG viraria preto no JPEG
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const jpeg = canvas.toDataURL('image/jpeg', 0.85)
  // Se a recompressão não ajudou (ex.: PNG pequeno e nítido), mantém o original
  if (escala === 1 && jpeg.length >= dataUrl.length) {
    return { dados: base64DeDataUrl(dataUrl), mime: arquivo.type }
  }
  return { dados: base64DeDataUrl(jpeg), mime: 'image/jpeg' }
}

/** Converte um arquivo do usuário em Anexo, validando tipo e tamanho. */
export async function processaArquivo(arquivo: File): Promise<Anexo> {
  const nome = arquivo.name
  const ehTexto =
    arquivo.type.startsWith('text/') || EXTENSOES_TEXTO.some((ext) => nome.toLowerCase().endsWith(ext))

  if (MIMES_IMAGEM.includes(arquivo.type)) {
    const { dados, mime } = await comprimeImagem(arquivo)
    const tamanho = Math.round(dados.length * 0.75)
    if (tamanho > MAX_TOTAL_BYTES) {
      throw new Error(`A imagem "${nome}" ficou grande demais mesmo comprimida.`)
    }
    return { id: novoId(), nome, tipo: 'imagem', mime, dados, tamanho }
  }

  if (arquivo.type === 'application/pdf' || nome.toLowerCase().endsWith('.pdf')) {
    if (arquivo.size > MAX_PDF_BYTES) {
      throw new Error(
        `O PDF "${nome}" tem ${formataTamanho(arquivo.size)} — o limite é ${formataTamanho(MAX_PDF_BYTES)}. Exporte uma versão menor ou envie as páginas como imagens.`,
      )
    }
    const dados = base64DeDataUrl(await leComoDataUrl(arquivo))
    return { id: novoId(), nome, tipo: 'pdf', mime: 'application/pdf', dados, tamanho: arquivo.size }
  }

  if (ehTexto) {
    if (arquivo.size > MAX_TEXTO_BYTES) {
      throw new Error(
        `O arquivo de texto "${nome}" tem ${formataTamanho(arquivo.size)} — o limite é ${formataTamanho(MAX_TEXTO_BYTES)}.`,
      )
    }
    const texto = await arquivo.text()
    return { id: novoId(), nome, tipo: 'texto', mime: 'text/plain', dados: texto, tamanho: arquivo.size }
  }

  throw new Error(
    `Tipo de arquivo não suportado: "${nome}". Envie imagens (PNG, JPG, WebP, GIF), PDF ou texto (.txt, .md, .csv, .json).`,
  )
}

/** Bloco de texto com o conteúdo dos anexos textuais (inline no prompt). */
export function anexosTextuais(anexos: Anexo[]): string {
  const textos = anexos.filter((a) => a.tipo === 'texto')
  if (textos.length === 0) return ''
  return textos
    .map((a) => `<anexo nome="${a.nome}">\n${a.dados}\n</anexo>`)
    .join('\n\n')
}

/** Nota curta listando os anexos, para os agentes saberem o que receberam. */
export function descreveAnexos(anexos: Anexo[]): string {
  if (anexos.length === 0) return ''
  const rotulo: Record<Anexo['tipo'], string> = { imagem: 'imagem', pdf: 'PDF', texto: 'texto' }
  return anexos.map((a) => `${a.nome} (${rotulo[a.tipo]})`).join(', ')
}
