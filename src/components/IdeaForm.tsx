import { useRef, useState } from 'react'
import type { Anexo, ConfigReuniao, RepoConectado } from '../types'
import { MEMBROS_VOTANTES } from '../board/members'
import { infoProvedor } from '../api'
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
import { promptParaClaudeCode } from '../board/claudeCode'
import { ClaudeCodePanel } from './ClaudeCodePanel'

interface Props {
  aoConvocar: (config: ConfigReuniao) => void
  aoAbrirConfiguracoes: () => void
}

type ModoDebate = '1' | '2' | '3' | 'consenso'

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
            `Limite total de ${formataTamanho(MAX_TOTAL_BYTES)} em anexos atingido — "${arquivo.name}" ficou de fora.`,
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
        ? 'Digite o ID do modelo personalizado — ou escolha um da lista.'
        : pdfSemSuporte
          ? 'PDF anexado: só o provedor Claude (Anthropic) lê PDFs. Troque o provedor, remova o PDF ou envie as páginas como imagens.'
          : null

  // Estimativa de chamadas: N análises + N por rodada de debate + síntese + entregáveis
  const entregaveis = (gerarPlano ? 1 : 0) + (gerarPrompt ? 1 : 0)
  const chamadas = (rodadas: number) => selecionados.size * (1 + rodadas) + 1 + entregaveis
  const notaAnexos =
    !demo && anexos.some((a) => a.tipo !== 'texto')
      ? ' Imagens/PDF anexados encarecem cada análise.'
      : ''
  const estimativa = demo
    ? 'Modo demonstração: nenhuma chamada de IA será feita — tudo é simulado, sem custo.'
    : modoDebate === 'consenso'
      ? `Esta configuração fará entre ${chamadas(0)} e ${chamadas(5)} chamadas de IA — o consenso pode vir logo ou levar até 5 rodadas.${notaAnexos}`
      : `Esta configuração fará ~${chamadas(Number(modoDebate))} chamadas de IA.${notaAnexos}`

  const convocar = () => {
    const agora = new Date().toISOString()
    const projetoId = `projeto-${Date.now()}`
    const gravado = gravaProjeto({
      id: projetoId,
      nome: nomeDeProjeto(ideia),
      criadoEm: agora,
      atualizadoEm: agora,
      ideia: ideia.trim(),
      anexos,
      repo: repo ?? undefined,
      reunioesIds: [],
    })
    if (!gravado) {
      setErroAnexo(
        'O armazenamento do navegador está cheio — remova anexos ou exclua projetos antigos e tente de novo.',
      )
      return
    }
    gravaRascunho('')
    aoConvocar({
      ideia: ideia.trim(),
      provedor,
      modelo: modeloFinal,
      membrosIds: [...selecionados],
      rodadasDebate: modoDebate === 'consenso' ? 1 : Number(modoDebate),
      ateConsenso: modoDebate === 'consenso',
      gerarPrompt,
      gerarPlano,
      demo,
      projetoId,
    })
  }

  return (
    <div className="tela-inicio">
      <section className="hero">
        <h1>Apresente sua ideia ao conselho</h1>
        <p>
          Doze conselheiros especialistas — finanças, marketing, tecnologia, produto, design,
          vendas, jurídico e mais — analisam sua ideia, debatem entre si e votam. A Presidente do
          Conselho consolida tudo em um veredito, um plano detalhado e um prompt pronto para
          executar.
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
            Identidade visual, mockups, pesquisa… Imagens, PDF ou texto — os conselheiros analisam
            tudo junto com a ideia.
          </span>
        </div>
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
                  placeholder="https://github.com/dono/repositorio — se o projeto já tem código"
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
            </>
          )}
        </div>
      </fieldset>

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

      <div className="linha-opcoes">
        {configurado ? (
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
        ) : (
          <div className="campo campo-metade cartao-conectar">
            <span className="campo-rotulo">Inteligência artificial</span>
            <p className="conectar-texto">
              <strong>Nenhuma API de IA conectada.</strong> Por enquanto a reunião roda em{' '}
              <em>modo demonstração</em>: respostas simuladas, sem custo, para você conhecer a
              interface.
            </p>
            <button
              type="button"
              className="botao-principal botao-conectar"
              onClick={aoAbrirConfiguracoes}
            >
              🔌 Conectar uma API de IA
            </button>
            <span className="campo-dica">
              Funciona com Anthropic, OpenAI ou qualquer API compatível (Ollama local, LM Studio,
              OpenRouter…). Sua chave fica somente neste navegador.
            </span>
          </div>
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
                ? 'O debate se repete até TODOS votarem Aprovar ou TODOS votarem Rejeitar. Ressalvas não encerram: viram condições debatidas até serem resolvidas (máximo de 5 rodadas — atenção ao custo).'
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
                  Pesquisa de mercado, SWOT, cronograma, orçamento com gráficos e riscos — para
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
                Modo demonstração
                <small>Respostas simuladas para conhecer a interface, sem custo.</small>
              </span>
            </label>
          )}
        </div>
      </div>

      <div className="acao-convocar">
        <div className="botoes-convocar">
          <button className="botao-principal" disabled={!pronto} onClick={convocar}>
            🔔 Convocar o Conselho
          </button>
          <button
            className="botao-secundario botao-cc"
            disabled={faltaIdeia}
            title="Roda o conselho dentro do Claude Code, no seu plano Pro/Max — sem gastar API"
            onClick={() =>
              setBriefingCC(
                promptParaClaudeCode({
                  ideia: ideia.trim(),
                  anexos,
                  repoResumo: repo?.resumo,
                  repoUrl: repo?.url,
                  rodadasDebate: modoDebate === 'consenso' ? 1 : Number(modoDebate),
                  ateConsenso: modoDebate === 'consenso',
                }),
              )
            }
          >
            🖥 Rodar no Claude Code
          </button>
        </div>
        {motivoBloqueio ? (
          <span className="motivo-bloqueio">{motivoBloqueio}</span>
        ) : (
          <span className="estimativa-chamadas">{estimativa}</span>
        )}
        <span className="campo-dica">
          Já paga o plano do Claude (Pro/Max)? Use <strong>Rodar no Claude Code</strong> — o
          conselho roda no seu plano, sem gastar API.
        </span>
      </div>

      {briefingCC && <ClaudeCodePanel prompt={briefingCC} aoFechar={() => setBriefingCC(null)} />}
    </div>
  )
}
