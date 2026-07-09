import { useEffect, useRef, useState } from 'react'
import type { Anexo, ConfigReuniao, PastaLocal, Provedor, RepoConectado } from '../types'
import { MEMBROS_VOTANTES } from '../board/members'
import { infoProvedor } from '../api'
import { estimaCustoUsd, formataFaixaUsd } from '../api/precos'
import { LINKS_USO_DADOS } from '../api/usoDados'
import {
  gravaGithubToken,
  gravaProjeto,
  gravaRascunho,
  leBaseUrlDe,
  leChave,
  leGithubToken,
  leModeloDe,
  leModelosDescobertos,
  leProvedor,
  leRascunho,
  leTetoGastoUsd,
  nomeDeProjeto,
} from '../lib/storage'
import {
  MAX_ANEXOS,
  MAX_TOTAL_BYTES,
  formataTamanho,
  processaArquivo,
  tamanhoTotal,
} from '../lib/anexos'
import { lerRepositorio, parseRepo } from '../lib/github'
import { lerPastaLocal } from '../lib/pastaLocal'
import { promptParaClaudeCode } from '../board/claudeCode'
import { ClaudeCodePanel } from './ClaudeCodePanel'
import { ModalTeto } from './ModalTeto'

interface Props {
  aoConvocar: (config: ConfigReuniao) => void
  aoAbrirConfiguracoes: () => void
}

type ModoDebate = '1' | '2' | '3' | 'consenso'

/** Ideia curada da "reunião de exemplo": 1 clique → payoff, sem digitar. */
const IDEIA_EXEMPLO =
  'App de assinatura de café artesanal com curadoria mensal e entrega recorrente'

/** Aviso passivo e uniforme de saída de dados — mostrado junto de cada controle
 *  que envia conteúdo à IA (anexos, repositório, pasta local). Não é modal. */
function AvisoEgresso({ provedor }: { provedor: Provedor }) {
  const link = LINKS_USO_DADOS[provedor]
  return (
    <span className="campo-dica aviso-egresso">
      🔒 Na análise, o conteúdo sai do seu navegador direto para o provedor de IA (a empresa que
      roda a IA):{' '}
      {link.url ? (
        <a href={link.url} target="_blank" rel="noreferrer">
          {link.rotulo}
        </a>
      ) : (
        link.rotulo
      )}
      . Com <strong>Rodar de graça no seu chat de IA</strong>, nem isso: fica tudo no seu
      computador.
    </span>
  )
}

export function IdeaForm({ aoConvocar, aoAbrirConfiguracoes }: Props) {
  const provedor = leProvedor()
  const info = infoProvedor(provedor)
  // Provedor personalizado: o que define "configurado" é a Base URL (chave é opcional)
  const configurado =
    info.baseUrl === 'obrigatoria' ? leBaseUrlDe(provedor).length > 0 : leChave(provedor).length > 0

  const modeloSalvo = leModeloDe(provedor)
  // Para o provedor personalizado, oferece os modelos descobertos via "Buscar modelos"
  const modelosDisponiveis =
    info.modelos.length > 0
      ? info.modelos
      : leModelosDescobertos(provedor)
          .slice(0, 6)
          .map((id) => ({ id, rotulo: id, detalhe: 'modelo da sua API' }))
  const modeloNaLista = modelosDisponiveis.some((m) => m.id === modeloSalvo)

  const [ideia, setIdeia] = useState(() => leRascunho())
  const [modelo, setModelo] = useState(
    modeloNaLista ? modeloSalvo : 'personalizado',
  )
  const [modeloCustom, setModeloCustom] = useState(modeloNaLista ? '' : modeloSalvo)
  const [selecionados, setSelecionados] = useState<Set<string>>(
    new Set(MEMBROS_VOTANTES.map((m) => m.id)),
  )
  const [modoDebate, setModoDebate] = useState<ModoDebate>('1')
  const [gerarPlano, setGerarPlano] = useState(true)
  const [gerarPrompt, setGerarPrompt] = useState(true)
  const [demo, setDemo] = useState(!configurado)

  // Materiais de apoio: anexos e repositório do GitHub
  const arquivoRef = useRef<HTMLInputElement>(null)
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [erroAnexo, setErroAnexo] = useState('')
  const [repoEntrada, setRepoEntrada] = useState('')
  const [repo, setRepo] = useState<RepoConectado | null>(null)
  const [lendoRepo, setLendoRepo] = useState(false)
  const [erroRepo, setErroRepo] = useState('')
  const [mostraToken, setMostraToken] = useState(false)
  const [githubToken, setGithubToken] = useState(() => leGithubToken())
  const [briefingCC, setBriefingCC] = useState<string | null>(null)

  // Pasta local (projeto não publicado no GitHub)
  const pastaRef = useRef<HTMLInputElement>(null)
  const [pastaLocal, setPastaLocal] = useState<PastaLocal | null>(null)
  const [lendoPasta, setLendoPasta] = useState(false)
  const [erroPasta, setErroPasta] = useState('')

  // Gate de teto de gasto (só no caminho caro): quando a estimativa máxima em
  // US$ passa do teto, confirma antes de gastar. Guarda o "prosseguir" pendente.
  const [tetoAberto, setTetoAberto] = useState<{ estimativaTexto: string; prosseguir: () => void } | null>(
    null,
  )

  // O atributo webkitdirectory não é tipado no React — setamos via DOM.
  useEffect(() => {
    if (pastaRef.current) pastaRef.current.setAttribute('webkitdirectory', '')
  }, [])

  const analisaPasta = async (lista: FileList | null) => {
    if (!lista || lista.length === 0) return
    setLendoPasta(true)
    setErroPasta('')
    // cede um tick para o React pintar "Lendo a pasta…" antes do trabalho pesado
    await new Promise((r) => setTimeout(r, 20))
    try {
      setPastaLocal(await lerPastaLocal(Array.from(lista)))
    } catch (err) {
      setErroPasta(err instanceof Error ? err.message : String(err))
    } finally {
      setLendoPasta(false)
      if (pastaRef.current) pastaRef.current.value = ''
    }
  }

  const escreveIdeia = (texto: string) => {
    setIdeia(texto)
    gravaRascunho(texto)
  }

  const adicionaArquivos = async (lista: FileList | null) => {
    if (!lista) return
    setErroAnexo('')
    const novos = [...anexos]
    for (const arquivo of Array.from(lista)) {
      if (novos.length >= MAX_ANEXOS) {
        setErroAnexo(`Máximo de ${MAX_ANEXOS} anexos por projeto.`)
        break
      }
      try {
        const anexo = await processaArquivo(arquivo)
        if (tamanhoTotal(novos) + anexo.tamanho > MAX_TOTAL_BYTES) {
          setErroAnexo(
            `Limite total de ${formataTamanho(MAX_TOTAL_BYTES)} em anexos atingido: "${arquivo.name}" ficou de fora.`,
          )
          break
        }
        novos.push(anexo)
      } catch (err) {
        setErroAnexo(err instanceof Error ? err.message : String(err))
      }
    }
    setAnexos(novos)
    if (arquivoRef.current) arquivoRef.current.value = ''
  }

  const conectaRepo = async () => {
    const alvo = parseRepo(repoEntrada)
    if (!alvo) {
      setErroRepo('Endereço inválido. Use https://github.com/dono/repositorio ou dono/repositorio.')
      return
    }
    setLendoRepo(true)
    setErroRepo('')
    try {
      gravaGithubToken(githubToken.trim())
      setRepo(await lerRepositorio(alvo.owner, alvo.repo, githubToken.trim() || undefined))
    } catch (err) {
      setErroRepo(err instanceof Error ? err.message : String(err))
    } finally {
      setLendoRepo(false)
    }
  }

  const alterna = (id: string) => {
    setSelecionados((atual) => {
      const novo = new Set(atual)
      if (novo.has(id)) novo.delete(id)
      else novo.add(id)
      return novo
    })
  }

  const modeloFinal = modelo === 'personalizado' ? modeloCustom.trim() : modelo
  const faltaIdeia = ideia.trim().length < 10
  const faltaMembros = selecionados.size < 2
  // No modo demonstração nenhuma API é chamada — o modelo não bloqueia o botão.
  const faltaModelo = !demo && modeloFinal.length === 0
  const pdfSemSuporte = !demo && provedor !== 'anthropic' && anexos.some((a) => a.tipo === 'pdf')
  const pronto = !faltaIdeia && !faltaMembros && !faltaModelo && !pdfSemSuporte
  const motivoBloqueio = faltaIdeia
    ? 'Para começar, escreva sua ideia acima (mínimo de 10 caracteres).'
    : faltaMembros
      ? 'Selecione ao menos 2 conselheiros.'
      : faltaModelo
        ? 'Digite o ID do modelo personalizado, ou escolha um da lista.'
        : pdfSemSuporte
          ? 'PDF anexado: só o provedor Claude (Anthropic) lê PDFs. Troque o provedor, remova o PDF ou envie as páginas como imagens.'
          : null

  // Estimativa de chamadas: N análises + N por rodada de debate + síntese + entregáveis
  const entregaveis = (gerarPlano ? 1 : 0) + (gerarPrompt ? 1 : 0)
  const chamadas = (rodadas: number) => selecionados.size * (1 + rodadas) + 1 + entregaveis
  const anexosPesados = anexos.filter((a) => a.tipo !== 'texto').length
  const notaAnexos =
    !demo && anexosPesados > 0
      ? ` Cada imagem/PDF vai para os ${selecionados.size} conselheiros em CADA rodada, e é o que mais encarece.`
      : ''
  // Faixa em US$ (passiva — nunca um gate): só no caminho pago e com modelo de
  // preço conhecido. Modelo custom/local sem preço mostra só a contagem.
  const faixaUsdTexto = (() => {
    if (demo) return ''
    if (modoDebate === 'consenso') {
      const fMin = estimaCustoUsd({ modelo: modeloFinal, chamadas: chamadas(0), anexos: anexos.length })
      const fMax = estimaCustoUsd({ modelo: modeloFinal, chamadas: chamadas(5), anexos: anexos.length })
      return fMin && fMax ? ` · ${formataFaixaUsd({ min: fMin.min, max: fMax.max })}` : ''
    }
    const f = estimaCustoUsd({ modelo: modeloFinal, chamadas: chamadas(Number(modoDebate)), anexos: anexos.length })
    return f ? ` · ${formataFaixaUsd(f)}` : ''
  })()
  const estimativa = demo
    ? 'Modo de teste: nenhuma chamada de IA será feita. Tudo é de exemplo, sem custo.'
    : modoDebate === 'consenso'
      ? `≈ entre ${chamadas(0)} e ${chamadas(5)} chamadas de IA${faixaUsdTexto}. O consenso pode vir logo ou levar até 5 rodadas.${notaAnexos}`
      : `≈ ${chamadas(Number(modoDebate))} chamadas de IA${faixaUsdTexto}.${notaAnexos}`

  const executaConvocacao = (ideiaEfetiva: string, demoEfetivo: boolean) => {
    const agora = new Date().toISOString()
    const projetoId = `projeto-${Date.now()}`
    const gravado = gravaProjeto({
      id: projetoId,
      nome: nomeDeProjeto(ideiaEfetiva),
      criadoEm: agora,
      atualizadoEm: agora,
      ideia: ideiaEfetiva,
      anexos,
      repo: repo ?? undefined,
      pastaLocal: pastaLocal ?? undefined,
      reunioesIds: [],
    })
    if (!gravado) {
      setErroAnexo(
        'O armazenamento do navegador está cheio: remova anexos ou exclua projetos antigos e tente de novo.',
      )
      return
    }
    gravaRascunho('')
    aoConvocar({
      ideia: ideiaEfetiva,
      provedor,
      modelo: modeloFinal,
      membrosIds: [...selecionados],
      rodadasDebate: modoDebate === 'consenso' ? 1 : Number(modoDebate),
      ateConsenso: modoDebate === 'consenso',
      gerarPrompt,
      gerarPlano,
      demo: demoEfetivo,
      projetoId,
    })
  }

  // opts permite forçar a ideia e o modo demo (usado pela "reunião de exemplo",
  // que sempre roda em demo mesmo com API conectada — é só uma amostra).
  const convocar = (opts?: { ideiaForcada?: string; demoForcado?: boolean }) => {
    const ideiaEfetiva = (opts?.ideiaForcada ?? ideia).trim()
    const demoEfetivo = opts?.demoForcado ?? demo
    // Gate de teto de gasto: SÓ no caminho pago e com preço conhecido. Na prática
    // só dispara no modo "até consenso" (~muitas chamadas), nunca na 1ª reunião padrão.
    if (!demoEfetivo) {
      const chamadasMax = modoDebate === 'consenso' ? chamadas(5) : chamadas(Number(modoDebate))
      const faixa = estimaCustoUsd({ modelo: modeloFinal, chamadas: chamadasMax, anexos: anexos.length })
      if (faixa && faixa.max > leTetoGastoUsd()) {
        setTetoAberto({
          estimativaTexto: formataFaixaUsd(faixa),
          prosseguir: () => {
            setTetoAberto(null)
            executaConvocacao(ideiaEfetiva, demoEfetivo)
          },
        })
        return
      }
    }
    executaConvocacao(ideiaEfetiva, demoEfetivo)
  }

  // "Ver reunião de exemplo": pré-preenche uma ideia curada e dispara já em DEMO,
  // sem exigir digitar nem o mínimo de 10 caracteres. Um clique → payoff.
  const verExemplo = () => {
    escreveIdeia(IDEIA_EXEMPLO)
    convocar({ ideiaForcada: IDEIA_EXEMPLO, demoForcado: true })
  }

  return (
    <div className="tela-inicio">
      <section className="hero">
        <h1>Um conselho de administração inteiro para a sua ideia, em minutos</h1>
        <p>
          Não é pedir para o ChatGPT "fingir que é um conselho": são <strong>13 conselheiros</strong>{' '}
          com opiniões próprias que <strong>debatem entre si, mudam de voto</strong> e entregam um
          veredito, um <strong>plano detalhado em PDF</strong> e um{' '}
          <strong>prompt de execução</strong> (um texto pronto para pôr a ideia em prática). São doze
          especialistas (finanças, marketing, tecnologia, produto, design, vendas, jurídico e mais)
          que debatem e votam, mais a Presidente que junta tudo numa conclusão. E cada ideia vira um{' '}
          <strong>projeto contínuo</strong>: o conselho acompanha reunião após reunião, como o de uma
          empresa de verdade. Não é uma análise de uma vez só. Rode{' '}
          <strong>de graça no seu chat de IA</strong> (ChatGPT, Claude, Gemini e outros) ou com a API
          que você preferir.
        </p>
      </section>

      <label className="campo">
        <span className="campo-rotulo">Sua ideia</span>
        <textarea
          value={ideia}
          onChange={(e) => escreveIdeia(e.target.value)}
          rows={5}
          placeholder="Descreva sua ideia com o máximo de contexto: o que é, para quem, como imagina ganhar dinheiro, o que já tem pronto…"
        />
        <span className="campo-dica">
          Quanto mais contexto você der, melhores serão as análises. O rascunho fica salvo neste
          navegador até você convocar o conselho.
        </span>
      </label>

      <details className="disclosure disclosure-materiais">
        <summary className="disclosure-summary" style={{ cursor: 'pointer', color: 'var(--ouro-claro)', fontWeight: 600, padding: '6px 0' }}>
          ＋ Adicionar contexto (arquivos, repositório, pasta)
        </summary>
        <fieldset className="campo campo-materiais">
        <legend className="campo-rotulo">Materiais de apoio (opcional)</legend>

        <div className="linha-anexos">
          <input
            ref={arquivoRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.txt,.md,.csv,.json"
            style={{ display: 'none' }}
            onChange={(e) => adicionaArquivos(e.target.files)}
          />
          <button type="button" className="botao-secundario" onClick={() => arquivoRef.current?.click()}>
            📎 Anexar arquivos
          </button>
          <span className="campo-dica">
            Identidade visual, mockups, pesquisa… Imagens, PDF ou texto: os conselheiros analisam
            tudo junto com a ideia.
          </span>
        </div>
        <AvisoEgresso provedor={provedor} />
        {anexos.length > 0 && (
          <ul className="lista-anexos">
            {anexos.map((a) => (
              <li key={a.id} className="chip-anexo">
                <span>
                  {a.tipo === 'imagem' ? '🖼' : a.tipo === 'pdf' ? '📄' : '📝'} {a.nome}{' '}
                  <small>({formataTamanho(a.tamanho)})</small>
                </span>
                <button
                  type="button"
                  title="Remover anexo"
                  onClick={() => setAnexos(anexos.filter((x) => x.id !== a.id))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {erroAnexo && <div className="aviso aviso-erro">{erroAnexo}</div>}

        <div className="linha-repo">
          {repo ? (
            <div className="repo-conectado">
              <span>
                ✅ Repositório conectado: <strong>{repo.owner}/{repo.repo}</strong>{' '}
                <small>(branch {repo.branch} · lido em {new Date(repo.atualizadoEm).toLocaleDateString('pt-BR')})</small>
              </span>
              <button type="button" title="Desconectar repositório" onClick={() => setRepo(null)}>
                ✕
              </button>
            </div>
          ) : (
            <>
              <div className="linha-chave">
                <input
                  type="text"
                  value={repoEntrada}
                  onChange={(e) => setRepoEntrada(e.target.value)}
                  placeholder="https://github.com/dono/repositorio (se o projeto já tem código)"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="botao-principal botao-compacto"
                  onClick={conectaRepo}
                  disabled={lendoRepo || repoEntrada.trim().length === 0}
                >
                  {lendoRepo ? 'Lendo…' : '🔗 Conectar repo'}
                </button>
              </div>
              <span className="campo-dica">
                Os conselheiros leem um resumo do código (árvore de arquivos, README,
                dependências) e levam o estado real do projeto em conta.{' '}
                <button type="button" className="link link-sutil" onClick={() => setMostraToken((v) => !v)}>
                  {mostraToken ? 'ocultar token' : 'repositório privado?'}
                </button>
              </span>
              {mostraToken && (
                <div className="linha-chave">
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="token de acesso do GitHub (fine-grained, só leitura de conteúdo)"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
              )}
              {erroRepo && <div className="aviso aviso-erro">{erroRepo}</div>}
              <AvisoEgresso provedor={provedor} />
            </>
          )}
        </div>

        <div className="linha-repo">
          <input
            ref={pastaRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => analisaPasta(e.target.files)}
          />
          {pastaLocal ? (
            <div className="repo-conectado">
              <span>
                📁 Pasta analisada: <strong>{pastaLocal.nome}</strong>{' '}
                <small>({pastaLocal.arquivos} arquivos · {new Date(pastaLocal.atualizadoEm).toLocaleDateString('pt-BR')})</small>
              </span>
              <button type="button" title="Remover pasta local" onClick={() => setPastaLocal(null)}>
                ✕
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="botao-secundario"
                onClick={() => pastaRef.current?.click()}
                disabled={lendoPasta}
              >
                {lendoPasta ? 'Lendo a pasta…' : '📁 Analisar uma pasta do computador'}
              </button>
              <span className="campo-dica">
                Tem um projeto <strong>ainda não publicado no GitHub</strong>? Escolha a pasta dele:
                o navegador lê o código aí mesmo, monta um resumo (árvore, README, trechos) e o
                conselho analisa.
              </span>
              <AvisoEgresso provedor={provedor} />
              {erroPasta && <div className="aviso aviso-erro">{erroPasta}</div>}
            </>
          )}
        </div>
        </fieldset>
      </details>

      <fieldset className="campo">
        <legend className="campo-rotulo">Conselheiros convocados ({selecionados.size})</legend>
        <div className="chips-membros">
          {MEMBROS_VOTANTES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`chip ${selecionados.has(m.id) ? 'chip-ativo' : ''}`}
              style={{ ['--cor' as string]: m.cor }}
              onClick={() => alterna(m.id)}
              title={m.descricao}
              aria-pressed={selecionados.has(m.id)}
            >
              <span>{m.emoji}</span> {m.cargo}
            </button>
          ))}
        </div>
        <span className="campo-dica">
          A Presidente Helena Vasquez sempre participa: ela conduz a síntese final. Selecione ao
          menos 2 conselheiros.
        </span>
      </fieldset>

      {!configurado && (
        <div className="campo cartao-conectar">
          <span className="campo-rotulo">Inteligência artificial</span>
          <p className="conectar-texto">
            <strong>Nenhuma IA conectada ainda.</strong> Por enquanto a reunião roda em{' '}
            <em>modo de teste</em>: respostas de exemplo, sem custo, só para você conhecer a tela.
          </p>
          <button
            type="button"
            className="botao-principal botao-conectar"
            onClick={aoAbrirConfiguracoes}
          >
            🔌 Conectar uma API de IA
          </button>
          <span className="campo-dica">
            A chave de API é a senha paga que liga o app à IA. Funciona com Anthropic, OpenAI ou
            qualquer serviço parecido (Ollama no seu computador, LM Studio, OpenRouter…). A chave
            fica só neste navegador. Prefere não pagar? Use{' '}
            <strong>Rodar de graça no seu chat de IA</strong>.
          </span>
        </div>
      )}

      <details className="disclosure bloco-avancado">
        <summary
          className="disclosure-summary"
          style={{ cursor: 'pointer', color: 'var(--ouro-claro)', fontWeight: 600, padding: '6px 0' }}
        >
          ⚙ Opções avançadas: modelo, rodadas de debate, entregáveis
        </summary>
        <div className="linha-opcoes">
        {configurado && (
          <fieldset className="campo campo-metade">
            <legend className="campo-rotulo">
              Modelo · {info.rotulo}{' '}
              <button className="link link-sutil" onClick={aoAbrirConfiguracoes} type="button">
                trocar provedor
              </button>
            </legend>
            <div className="opcoes-modelo">
              {modelosDisponiveis.map((m) => (
                <label key={m.id} className={`opcao-modelo ${modelo === m.id ? 'selecionada' : ''}`}>
                  <input
                    type="radio"
                    name="modelo"
                    checked={modelo === m.id}
                    onChange={() => setModelo(m.id)}
                  />
                  <strong>{m.rotulo}</strong>
                  <small>{m.detalhe}</small>
                </label>
              ))}
              <label
                className={`opcao-modelo ${modelo === 'personalizado' ? 'selecionada' : ''}`}
              >
                <input
                  type="radio"
                  name="modelo"
                  checked={modelo === 'personalizado'}
                  onChange={() => setModelo('personalizado')}
                />
                <strong>Personalizado…</strong>
                <small>digite o ID exato de qualquer modelo do provedor</small>
              </label>
            </div>
            {modelo === 'personalizado' && (
              <input
                type="text"
                className="entrada-modelo-custom"
                aria-label="ID do modelo personalizado"
                value={modeloCustom}
                onChange={(e) => setModeloCustom(e.target.value)}
                placeholder={
                  provedor === 'anthropic'
                    ? 'ex.: claude-sonnet-4-5'
                    : provedor === 'openai'
                      ? 'ex.: gpt-5.4-nano'
                      : 'ex.: llama3.3, qwen2.5-coder…'
                }
                spellCheck={false}
                autoFocus
              />
            )}
          </fieldset>
        )}

        <div className="campo campo-metade">
          <fieldset className="campo">
            <legend className="campo-rotulo">Rodadas de debate</legend>
            <div className="opcoes-debate">
              {(['1', '2', '3'] as const).map((n) => (
                <label key={n} className={`opcao-debate ${modoDebate === n ? 'selecionada' : ''}`}>
                  <input
                    type="radio"
                    name="debate"
                    checked={modoDebate === n}
                    onChange={() => setModoDebate(n)}
                  />
                  {n}
                </label>
              ))}
              <label className={`opcao-debate ${modoDebate === 'consenso' ? 'selecionada' : ''}`}>
                <input
                  type="radio"
                  name="debate"
                  checked={modoDebate === 'consenso'}
                  onChange={() => setModoDebate('consenso')}
                />
                🤝 Até consenso
              </label>
            </div>
            <span className="campo-dica">
              {modoDebate === 'consenso'
                ? 'O debate se repete até TODOS votarem Aprovar ou TODOS votarem Rejeitar. Ressalvas não encerram: viram condições debatidas até serem resolvidas (máximo de 5 rodadas; atenção ao custo).'
                : 'No debate, os conselheiros leem as posições uns dos outros, rebatem e podem mudar de voto.'}
            </span>
          </fieldset>

          <fieldset className="campo">
            <legend className="campo-rotulo">Entregáveis ao final</legend>
            <label className="alternador">
              <input
                type="checkbox"
                checked={gerarPlano}
                onChange={(e) => setGerarPlano(e.target.checked)}
              />
              <span>
                📄 Plano detalhado (documento com PDF)
                <small>
                  Pesquisa de mercado, SWOT, cronograma, orçamento com gráficos e riscos: para
                  avaliar a ideia antes de executar qualquer coisa.
                </small>
              </span>
            </label>
            <label className="alternador">
              <input
                type="checkbox"
                checked={gerarPrompt}
                onChange={(e) => setGerarPrompt(e.target.checked)}
              />
              <span>
                🚀 Prompt de execução
                <small>
                  A decisão vira um prompt detalhado para colar no seu agente de programação
                  preferido (Claude Code, Codex, Cursor…).
                </small>
              </span>
            </label>
          </fieldset>

          {configurado && (
            <label className="alternador">
              <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
              <span>
                Modo de teste
                <small>Respostas de exemplo para conhecer a tela, sem custo.</small>
              </span>
            </label>
          )}
        </div>
        </div>
      </details>

      <div className="acao-convocar">
        <button
          type="button"
          className="botao-ver-exemplo"
          onClick={verExemplo}
          title="Roda uma reunião de exemplo já preenchida, sem custo"
          style={{
            alignSelf: 'stretch',
            border: '1px solid var(--ouro)',
            borderRadius: 'var(--raio)',
            background: 'color-mix(in srgb, var(--ouro) 12%, var(--fundo-2))',
            color: 'var(--texto)',
            padding: '12px 18px',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          ▶ Ver reunião de exemplo: 1 clique, sem digitar, sem custo
        </button>

        <div className="botoes-convocar">
          <div
            className="botao-stack"
            style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}
          >
            <button className="botao-principal" disabled={!pronto} onClick={() => convocar()}>
              🔔 Convocar o Conselho
            </button>
            <small className="selo-custo" style={{ fontSize: '0.75rem', color: 'var(--texto-suave)' }}>
              {demo ? '🎭 modo de teste, sem custo' : '🔑 usa sua chave de API'}
            </small>
          </div>
          <div
            className="botao-stack"
            style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}
          >
            <button
              className="botao-secundario botao-cc botao-coprimario"
              disabled={faltaIdeia}
              title="Gera um prompt para colar no ChatGPT, Claude, Gemini ou outro chat de IA. Roda no seu plano, sem custo."
              style={{ borderColor: 'var(--ouro)' }}
              onClick={() =>
                setBriefingCC(
                  promptParaClaudeCode({
                    ideia: ideia.trim(),
                    anexos,
                    repoResumo: repo?.resumo,
                    repoUrl: repo?.url,
                    pastaLocal: pastaLocal ?? undefined,
                    rodadasDebate: modoDebate === 'consenso' ? 1 : Number(modoDebate),
                    ateConsenso: modoDebate === 'consenso',
                  }),
                )
              }
            >
              🖥 Rodar de graça
            </button>
            <small className="selo-custo" style={{ fontSize: '0.75rem', color: 'var(--texto-suave)' }}>
              ✨ Cola num chat de IA (ChatGPT, Claude, Gemini…). Roda no seu plano, sem custo.
            </small>
          </div>
        </div>
        {motivoBloqueio ? (
          <span className="motivo-bloqueio">{motivoBloqueio}</span>
        ) : (
          <span className="estimativa-chamadas">{estimativa}</span>
        )}
        <span className="campo-dica">
          Não quer pagar nada? Use <strong>Rodar de graça no seu chat de IA</strong>: o app gera um
          prompt, você cola no ChatGPT, Claude, Gemini ou outro, e o conselho roda ali, no plano que
          você já usa.
        </span>
      </div>

      {briefingCC && <ClaudeCodePanel prompt={briefingCC} aoFechar={() => setBriefingCC(null)} />}
      {tetoAberto && (
        <ModalTeto
          estimativaTexto={tetoAberto.estimativaTexto}
          aoConfirmar={tetoAberto.prosseguir}
          aoCancelar={() => setTetoAberto(null)}
        />
      )}
    </div>
  )
}
