import { useEffect, useRef, useState } from 'react'
import type { ConfigReuniao, Projeto, Reuniao } from '../types'
import { MEMBROS_VOTANTES } from '../board/members'
import { infoProvedor } from '../api'
import { estimaCustoUsd, formataFaixaUsd } from '../api/precos'
import { LINKS_USO_DADOS } from '../api/usoDados'
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
  leTetoGastoUsd,
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
  const pastaRef = useRef<HTMLInputElement>(null)
  const [lendoPasta, setLendoPasta] = useState(false)

  useEffect(() => {
    if (pastaRef.current) pastaRef.current.setAttribute('webkitdirectory', '')
  }, [])

  // Reunião de acompanhamento
  const [pauta, setPauta] = useState('')
  const [modoDebate, setModoDebate] = useState<ModoDebate>('1')
  const [gerarPlano, setGerarPlano] = useState(false)
  const [gerarPrompt, setGerarPrompt] = useState(true)
  const [briefingCC, setBriefingCC] = useState<string | null>(null)
  // Quando o gate de teto dispara, guardamos aqui o texto da estimativa; o
  // ModalTeto fica aberto até o usuário confirmar ou cancelar.
  const [gateTeto, setGateTeto] = useState<string | null>(null)

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

  const analisaPasta = async (lista: FileList | null) => {
    if (!lista || lista.length === 0) return
    setLendoPasta(true)
    setErro('')
    await new Promise((r) => setTimeout(r, 20))
    try {
      atualiza({ pastaLocal: await lerPastaLocal(Array.from(lista)) })
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setLendoPasta(false)
      if (pastaRef.current) pastaRef.current.value = ''
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

  // Estimativa de custo do acompanhamento — mesma fórmula da tela inicial:
  // N análises + N por rodada de debate + síntese + entregáveis.
  const modeloAtual = leModeloDe(provedor)
  const entregaveis = (gerarPlano ? 1 : 0) + (gerarPrompt ? 1 : 0)
  const chamadasCom = (rodadas: number) => MEMBROS_VOTANTES.length * (1 + rodadas) + 1 + entregaveis
  // Para o gate usamos o PIOR caso: "até consenso" pode ir a 5 rodadas.
  const rodadasTeto = modoDebate === 'consenso' ? 5 : Number(modoDebate)
  const anexosPesados = projeto.anexos.filter((a) => a.tipo !== 'texto').length
  const estimativaCusto = estimaCustoUsd({
    modelo: modeloAtual,
    chamadas: chamadasCom(rodadasTeto),
    anexos: anexosPesados,
  })

  // Link para a política de uso de dados do provedor (aviso de egresso, #17).
  // Shape assumido do outro agente: Record<Provedor, string | { url }>; acesso
  // defensivo para não quebrar se a forma final vier diferente.
  const linkUsoDados = ((): string => {
    const v = (LINKS_USO_DADOS as unknown as Record<string, unknown> | undefined)?.[provedor]
    if (typeof v === 'string') return v
    if (v && typeof v === 'object' && typeof (v as { url?: unknown }).url === 'string') {
      return (v as { url: string }).url
    }
    return ''
  })()

  const enviaConvocacao = () => {
    aoConvocar({
      ideia: projeto.ideia,
      provedor,
      modelo: modeloAtual,
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

  const convocarAcompanhamento = () => {
    // Gate de teto (#24): só em reunião paga e quando o PIOR caso passa do teto.
    if (!demo && estimativaCusto && estimativaCusto.max > leTetoGastoUsd()) {
      setGateTeto(formataFaixaUsd(estimativaCusto))
      return
    }
    enviaConvocacao()
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
      <p className="campo-dica">
        🔄 A equipe acompanha este projeto <strong>reunião após reunião</strong>: cada
        acompanhamento parte da ideia, dos materiais e da decisão da última reunião — como um
        conselho que se reúne de novo para levar o projeto adiante.
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

        <div className="linha-repo">
          <input
            ref={pastaRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => analisaPasta(e.target.files)}
          />
          {projeto.pastaLocal ? (
            <div className="repo-conectado">
              <span>
                📁 <strong>{projeto.pastaLocal.nome}</strong>{' '}
                <small>
                  ({projeto.pastaLocal.arquivos} arquivos · lido em{' '}
                  {new Date(projeto.pastaLocal.atualizadoEm).toLocaleDateString('pt-BR')})
                </small>
              </span>
              <button
                type="button"
                className="botao-secundario"
                onClick={() => pastaRef.current?.click()}
                disabled={lendoPasta}
              >
                {lendoPasta ? 'Lendo…' : '↻ Reler pasta'}
              </button>
              <button
                type="button"
                title="Remover pasta local"
                onClick={() => atualiza({ pastaLocal: undefined })}
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="botao-secundario"
              onClick={() => pastaRef.current?.click()}
              disabled={lendoPasta}
              title="Projeto ainda não publicado no GitHub? Analise a pasta local"
            >
              {lendoPasta ? 'Lendo a pasta…' : '📁 Analisar uma pasta do computador'}
            </button>
          )}
        </div>
        {erro && <div className="aviso aviso-erro">{erro}</div>}
        <p className="campo-dica">
          🔒 Anexos, repositório e pasta ficam no seu navegador. Numa reunião <strong>paga</strong>,
          o conteúdo é enviado ao provedor de IA ({info.rotulo}) apenas para a análise — nunca a
          outros servidores. Com <strong>🖥 Rodar no Claude Code</strong>, nem isso: fica tudo
          local.
          {linkUsoDados && (
            <>
              {' '}
              Veja como {info.rotulo} trata os dados:{' '}
              <a href={linkUsoDados} target="_blank" rel="noreferrer">
                política de uso de dados
              </a>
              .
            </>
          )}
        </p>
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
            <button
              className="botao-principal"
              disabled={motivoBloqueio !== null}
              title={
                demo
                  ? 'Modo demonstração: reunião simulada, sem custo.'
                  : 'Usa a sua chave de API — o consumo é cobrado pelo provedor.'
              }
              onClick={convocarAcompanhamento}
            >
              🔔 Convocar acompanhamento
            </button>
            <button
              className="botao-secundario botao-cc"
              disabled={pautaCurta}
              title="Roda o acompanhamento dentro do Claude Code, no seu plano Pro/Max — sem gastar API"
              onClick={() =>
                setBriefingCC(
                  promptParaClaudeCode({
                    ideia: projeto.ideia,
                    anexos: projeto.anexos,
                    repoResumo: projeto.repo?.resumo,
                    repoUrl: projeto.repo?.url,
                    pastaLocal: projeto.pastaLocal,
                    rodadasDebate: modoDebate === 'consenso' ? 1 : Number(modoDebate),
                    ateConsenso: modoDebate === 'consenso',
                    pauta: pauta.trim(),
                  }),
                )
              }
            >
              🖥 Rodar no Claude Code — grátis no seu plano
            </button>
          </div>
          {motivoBloqueio ? (
            <span className="motivo-bloqueio">{motivoBloqueio}</span>
          ) : (
            <span className="estimativa-chamadas">
              {demo
                ? 'Sem API conectada: a reunião rodará em modo demonstração (simulada, sem custo).'
                : `Todos os 12 conselheiros participam, com ${info.rotulo} (${modeloAtual}).` +
                  (estimativaCusto
                    ? ` Estimativa: ${formataFaixaUsd(estimativaCusto)}${
                        modoDebate === 'consenso' ? ' no pior caso (até 5 rodadas)' : ''
                      }.`
                    : '')}
            </span>
          )}
          <span className="campo-dica">
            🔔 <strong>Convocar</strong>{' '}
            {demo ? 'roda em modo demonstração, sem custo' : 'usa a sua chave de API'} · 🖥{' '}
            <strong>Rodar no Claude Code</strong> é grátis no seu plano Pro/Max.
          </span>
        </div>
      </section>

      {briefingCC && <ClaudeCodePanel prompt={briefingCC} aoFechar={() => setBriefingCC(null)} />}
      {gateTeto && (
        <ModalTeto
          estimativaTexto={gateTeto}
          aoConfirmar={() => {
            setGateTeto(null)
            enviaConvocacao()
          }}
          aoCancelar={() => setGateTeto(null)}
        />
      )}
    </div>
  )
}
