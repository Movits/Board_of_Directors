import { useRef, useState } from 'react'
import type { ConfigReuniao, Projeto, Reuniao } from '../types'
import { MEMBROS_VOTANTES } from '../board/members'
import { infoProvedor } from '../api'
import { exportaObsidian } from '../lib/exportar'
import {
  gravaProjeto,
  leBaseUrlDe,
  leChave,
  leGithubToken,
  leHistorico,
  leModeloDe,
  leProjeto,
  leProvedor,
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
  projetoId: string
  aoAbrirReuniao: (config: ConfigReuniao, existente: Reuniao) => void
  aoConvocar: (config: ConfigReuniao) => void
  aoVoltar: () => void
}

type ModoDebate = '1' | '2' | '3' | 'consenso'

export function ProjectPage({ projetoId, aoAbrirReuniao, aoConvocar, aoVoltar }: Props) {
  const [projeto, setProjeto] = useState<Projeto | undefined>(() => leProjeto(projetoId))
  const [erro, setErro] = useState('')
  const [lendoRepo, setLendoRepo] = useState(false)
  const [repoEntrada, setRepoEntrada] = useState('')
  const arquivoRef = useRef<HTMLInputElement>(null)

  // Reunião de acompanhamento
  const [pauta, setPauta] = useState('')
  const [modoDebate, setModoDebate] = useState<ModoDebate>('1')
  const [gerarPlano, setGerarPlano] = useState(false)
  const [gerarPrompt, setGerarPrompt] = useState(true)
  const [briefingCC, setBriefingCC] = useState<string | null>(null)

  const provedor = leProvedor()
  const info = infoProvedor(provedor)
  const configurado =
    info.baseUrl === 'obrigatoria' ? leBaseUrlDe(provedor).length > 0 : leChave(provedor).length > 0
  const demo = !configurado

  if (!projeto) {
    return (
      <div className="tela-historico">
        <h1>Projeto não encontrado</h1>
        <button className="botao-principal" onClick={aoVoltar}>
          ← Voltar aos projetos
        </button>
      </div>
    )
  }

  const historico = leHistorico()
  const reunioes = projeto.reunioesIds
    .map((id) => historico.find((r) => r.id === id))
    .filter((r): r is Reuniao => Boolean(r))

  const atualiza = (mudancas: Partial<Projeto>) => {
    const novo = { ...projeto, ...mudancas, atualizadoEm: new Date().toISOString() }
    if (!gravaProjeto(novo)) {
      setErro('O armazenamento do navegador está cheio — remova anexos ou exclua projetos antigos.')
      return
    }
    setErro('')
    setProjeto(novo)
  }

  const adicionaArquivos = async (lista: FileList | null) => {
    if (!lista) return
    setErro('')
    const novos = [...projeto.anexos]
    for (const arquivo of Array.from(lista)) {
      if (novos.length >= MAX_ANEXOS) {
        setErro(`Máximo de ${MAX_ANEXOS} anexos por projeto.`)
        break
      }
      try {
        const anexo = await processaArquivo(arquivo)
        if (tamanhoTotal(novos) + anexo.tamanho > MAX_TOTAL_BYTES) {
          setErro(`Limite total de ${formataTamanho(MAX_TOTAL_BYTES)} em anexos atingido.`)
          break
        }
        novos.push(anexo)
      } catch (err) {
        setErro(err instanceof Error ? err.message : String(err))
      }
    }
    atualiza({ anexos: novos })
    if (arquivoRef.current) arquivoRef.current.value = ''
  }

  const conectaOuAtualizaRepo = async (entrada?: string) => {
    const alvo = entrada ? parseRepo(entrada) : projeto.repo
    if (!alvo) {
      setErro('Endereço inválido. Use https://github.com/dono/repositorio ou dono/repositorio.')
      return
    }
    setLendoRepo(true)
    setErro('')
    try {
      const repo = await lerRepositorio(alvo.owner, alvo.repo, leGithubToken() || undefined)
      atualiza({ repo })
      setRepoEntrada('')
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setLendoRepo(false)
    }
  }

  const pdfSemSuporte =
    !demo && provedor !== 'anthropic' && projeto.anexos.some((a) => a.tipo === 'pdf')
  const pautaCurta = pauta.trim().length < 10
  const motivoBloqueio = pautaCurta
    ? 'Escreva a pauta: o que mudou desde a última reunião e o que você quer da equipe agora (mín. 10 caracteres).'
    : pdfSemSuporte
      ? 'Há PDF anexado e só o provedor Claude lê PDFs — troque o provedor ou remova o PDF.'
      : null

  const convocarAcompanhamento = () => {
    aoConvocar({
      ideia: projeto.ideia,
      provedor,
      modelo: leModeloDe(provedor),
      membrosIds: MEMBROS_VOTANTES.map((m) => m.id),
      rodadasDebate: modoDebate === 'consenso' ? 1 : Number(modoDebate),
      ateConsenso: modoDebate === 'consenso',
      gerarPrompt,
      gerarPlano,
      demo,
      projetoId: projeto.id,
      pauta: pauta.trim(),
    })
  }

  return (
    <div className="tela-projeto">
      <button className="link link-sutil" onClick={aoVoltar}>
        ← Projetos
      </button>
      <h1>📁 {projeto.nome}</h1>
      <p className="projeto-meta">
        Criado em {new Date(projeto.criadoEm).toLocaleDateString('pt-BR')} ·{' '}
        {reunioes.length} reuni{reunioes.length === 1 ? 'ão' : 'ões'} do conselho
      </p>

      <section className="cartao-config">
        <h2>💡 A ideia</h2>
        <blockquote className="projeto-ideia">{projeto.ideia}</blockquote>
      </section>

      <section className="cartao-config">
        <h2>📎 Materiais do projeto</h2>
        <input
          ref={arquivoRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif,application/pdf,.txt,.md,.csv,.json"
          style={{ display: 'none' }}
          onChange={(e) => adicionaArquivos(e.target.files)}
        />
        {projeto.anexos.length > 0 ? (
          <ul className="lista-anexos">
            {projeto.anexos.map((a) => (
              <li key={a.id} className="chip-anexo">
                <span>
                  {a.tipo === 'imagem' ? '🖼' : a.tipo === 'pdf' ? '📄' : '📝'} {a.nome}{' '}
                  <small>({formataTamanho(a.tamanho)})</small>
                </span>
                <button
                  type="button"
                  title="Remover anexo"
                  onClick={() => atualiza({ anexos: projeto.anexos.filter((x) => x.id !== a.id) })}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="campo-dica">Nenhum anexo ainda — identidade visual, mockups, pesquisa…</p>
        )}
        <button type="button" className="botao-secundario" onClick={() => arquivoRef.current?.click()}>
          📎 Anexar arquivos
        </button>

        <div className="linha-repo">
          {projeto.repo ? (
            <div className="repo-conectado">
              <span>
                🔗 <strong>{projeto.repo.owner}/{projeto.repo.repo}</strong>{' '}
                <small>
                  (branch {projeto.repo.branch} · lido em{' '}
                  {new Date(projeto.repo.atualizadoEm).toLocaleDateString('pt-BR')})
                </small>
              </span>
              <button
                type="button"
                className="botao-secundario"
                onClick={() => conectaOuAtualizaRepo()}
                disabled={lendoRepo}
              >
                {lendoRepo ? 'Lendo…' : '↻ Atualizar leitura'}
              </button>
              <button type="button" title="Desconectar" onClick={() => atualiza({ repo: undefined })}>
                ✕
              </button>
            </div>
          ) : (
            <div className="linha-chave">
              <input
                type="text"
                value={repoEntrada}
                onChange={(e) => setRepoEntrada(e.target.value)}
                placeholder="Conectar repositório do GitHub (https://github.com/dono/repo)"
                spellCheck={false}
              />
              <button
                type="button"
                className="botao-principal botao-compacto"
                onClick={() => conectaOuAtualizaRepo(repoEntrada)}
                disabled={lendoRepo || repoEntrada.trim().length === 0}
              >
                {lendoRepo ? 'Lendo…' : '🔗 Conectar'}
              </button>
            </div>
          )}
        </div>
        {erro && <div className="aviso aviso-erro">{erro}</div>}
      </section>

      <section className="cartao-config">
        <h2>🗓 Reuniões do conselho</h2>
        {reunioes.length === 0 && <p className="campo-dica">Nenhuma reunião concluída ainda.</p>}
        <ul className="lista-historico">
          {reunioes.map((r, i) => (
            <li key={r.id} className="item-historico">
              <button
                className="historico-principal"
                onClick={() => aoAbrirReuniao(r.config, r)}
                title="Rever esta reunião"
              >
                <span className="historico-data">
                  {new Date(r.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  {r.config.demo && <span className="selo-demo">DEMO</span>}
                </span>
                <span className="historico-ideia">
                  {i === 0 && !r.config.pauta ? '🚀 Pitch inicial' : `🔄 ${r.config.pauta ?? 'Acompanhamento'}`}
                </span>
                <span className="historico-placar">
                  ✅ {r.placar.aprovar} · ⚠️ {r.placar.aprovar_com_ressalvas} · ❌ {r.placar.rejeitar}
                  {r.consensoNaRodada !== undefined && ' · 🤝 consenso'}
                </span>
              </button>
              <div className="historico-acoes">
                <button onClick={() => exportaObsidian(r)} title="Exportar ata (Obsidian)">
                  🧠
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="cartao-config cartao-acompanhamento">
        <h2>🔔 Nova reunião de acompanhamento</h2>
        <p className="campo-dica">
          A equipe já conhece o projeto: os conselheiros recebem a ideia, os materiais, o
          repositório e o resumo da última reunião — e focam em aperfeiçoar e orientar o próximo
          passo.
        </p>
        <label className="campo">
          <span className="campo-rotulo">Pauta</span>
          <textarea
            value={pauta}
            onChange={(e) => setPauta(e.target.value)}
            rows={4}
            placeholder="O que mudou desde a última reunião? O que você construiu, aprendeu ou travou? O que você quer da equipe agora?"
          />
        </label>

        <div className="linha-opcoes">
          <fieldset className="campo campo-metade">
            <legend className="campo-rotulo">Rodadas de debate</legend>
            <div className="opcoes-debate">
              {(['1', '2', '3'] as const).map((n) => (
                <label key={n} className={`opcao-debate ${modoDebate === n ? 'selecionada' : ''}`}>
                  <input
                    type="radio"
                    name="debate-projeto"
                    checked={modoDebate === n}
                    onChange={() => setModoDebate(n)}
                  />
                  {n}
                </label>
              ))}
              <label className={`opcao-debate ${modoDebate === 'consenso' ? 'selecionada' : ''}`}>
                <input
                  type="radio"
                  name="debate-projeto"
                  checked={modoDebate === 'consenso'}
                  onChange={() => setModoDebate('consenso')}
                />
                🤝 Até consenso
              </label>
            </div>
          </fieldset>

          <fieldset className="campo campo-metade">
            <legend className="campo-rotulo">Entregáveis</legend>
            <label className="alternador">
              <input
                type="checkbox"
                checked={gerarPlano}
                onChange={(e) => setGerarPlano(e.target.checked)}
              />
              <span>
                📄 Plano detalhado atualizado
                <small>Refaz o documento com o estado atual do projeto.</small>
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
                <small>Os próximos passos viram um prompt para seu agente de programação.</small>
              </span>
            </label>
          </fieldset>
        </div>

        <div className="acao-convocar">
          <div className="botoes-convocar">
            <button className="botao-principal" disabled={motivoBloqueio !== null} onClick={convocarAcompanhamento}>
              🔔 Convocar acompanhamento
            </button>
            <button
              className="botao-secundario botao-cc"
              disabled={pautaCurta}
              title="Roda o acompanhamento dentro do Claude Code, no seu plano — sem gastar API"
              onClick={() =>
                setBriefingCC(
                  promptParaClaudeCode({
                    ideia: projeto.ideia,
                    anexos: projeto.anexos,
                    repoResumo: projeto.repo?.resumo,
                    repoUrl: projeto.repo?.url,
                    rodadasDebate: modoDebate === 'consenso' ? 1 : Number(modoDebate),
                    ateConsenso: modoDebate === 'consenso',
                    pauta: pauta.trim(),
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
            <span className="estimativa-chamadas">
              {demo
                ? 'Sem API conectada: a reunião rodará em modo demonstração (simulada, sem custo).'
                : `Todos os 12 conselheiros participam, com ${info.rotulo} (${leModeloDe(provedor)}).`}
            </span>
          )}
        </div>
      </section>

      {briefingCC && <ClaudeCodePanel prompt={briefingCC} aoFechar={() => setBriefingCC(null)} />}
    </div>
  )
}
