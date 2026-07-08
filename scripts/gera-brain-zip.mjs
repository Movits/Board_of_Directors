// Empacota a pasta brain/ (o vault do Obsidian) em public/brain.zip para o
// app oferecer o download em "Sobre & privacidade". Roda antes do vite build.
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import JSZip from 'jszip'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const origem = join(raiz, 'brain')
const destino = join(raiz, 'public', 'brain.zip')

async function arquivos(dir) {
  const entradas = await readdir(dir, { withFileTypes: true })
  const lista = []
  for (const e of entradas) {
    if (e.name === '.obsidian') continue // configuração local, fica de fora
    const caminho = join(dir, e.name)
    if (e.isDirectory()) lista.push(...(await arquivos(caminho)))
    else lista.push(caminho)
  }
  return lista
}

const zip = new JSZip()
for (const caminho of await arquivos(origem)) {
  // dentro do zip tudo vive em brain/ — extrair cria uma única pasta-vault
  zip.file(join('brain', relative(origem, caminho)), await readFile(caminho))
}

await mkdir(join(raiz, 'public'), { recursive: true })
await writeFile(destino, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }))
console.log(`brain.zip gerado (${(await readFile(destino)).length} bytes)`)
