import type { AnaliseDebate, AnaliseRodada1, Plano, TipoReacao, Transporte, Voto } from '../types'
import { MEMBROS } from './members'

// Modo demonstração: simula as respostas do conselho sem chamar a API.
// Compartilha o MESMO orquestrador do modo real — só troca a camada de transporte.
//
// Invariante de honestidade: o veredito da Presidente é DERIVADO do placar
// realmente sorteado (lido das âncoras do prompt de síntese) — nunca texto
// fixo que possa contradizer os votos exibidos na tela.

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** PRNG determinístico (mulberry32) — usado quando bod.seedDemo existe,
 *  para testes automatizados reproduzirem a mesma reunião demo. */
function mulberry32(semente: number): () => number {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash FNV-1a — deriva uma semente própria por conselheiro a partir da
 *  semente da reunião, para que o conteúdo de cada membro seja determinístico
 *  mesmo com as chamadas rodando em paralelo (ordem de término varia). */
function hashTexto(texto: string): number {
  let h = 2166136261
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Semente fixa de testes (bod.seedDemo no localStorage), se houver. */
const SEMENTE_FIXA: number | null = (() => {
  try {
    const semente = Number(localStorage.getItem('bod.seedDemo'))
    return Number.isFinite(semente) && semente > 0 ? semente : null
  } catch {
    return null // localStorage indisponível — segue aleatório de verdade
  }
})()

/** Jitter de tempo (esperas e ritmo de digitação) — NUNCA decide conteúdo:
 *  conteúdo sai dos geradores por membro, imunes à ordem de término. */
const rnd: () => number = SEMENTE_FIXA !== null ? mulberry32(SEMENTE_FIXA) : Math.random

const sorteia = <T>(g: () => number, lista: T[]): T => lista[Math.floor(g() * lista.length)]

/** Embaralhamento de Fisher-Yates com gerador explícito (nº de sorteios
 *  estável, ao contrário de sort() com comparador aleatório). */
function embaralha<T>(lista: T[], g: () => number): T[] {
  const copia = [...lista]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(g() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

// ── Perfis de voto: reunião dividida-mas-majoritariamente-positiva ──────────
// A demo padrão (1 rodada de debate) termina com maioria aprovando, ressalvas
// debatidas e resolvidas, e AO MENOS um dissenso persistente: o CFO cético
// (Ricardo Tanaka) segura a ressalva de unit economics — crível num conselho
// de verdade. Rejeições iniciais viram condições já na 1ª rodada, então o
// sorteio NUNCA produz placar negativo nem unanimidade artificial.

type PerfilDemo = 'otimista' | 'ponderado' | 'cetico'

const PERFIS_DEMO: Record<string, PerfilDemo> = {
  cfo: 'cetico',
  cpo: 'ponderado',
  juridico: 'ponderado',
  operacoes: 'ponderado',
  dados: 'ponderado',
  // demais membros: 'otimista' (fallback em perfilDe)
}

const perfilDe = (membroId: string): PerfilDemo => PERFIS_DEMO[membroId] ?? 'otimista'

/** Pesos do voto inicial por perfil de conselheiro. */
const VOTOS_PONDERADOS: Record<PerfilDemo, Voto[]> = {
  otimista: ['aprovar', 'aprovar', 'aprovar', 'aprovar_com_ressalvas', 'aprovar_com_ressalvas'],
  ponderado: ['aprovar', 'aprovar_com_ressalvas', 'aprovar_com_ressalvas', 'aprovar_com_ressalvas', 'rejeitar'],
  cetico: ['aprovar_com_ressalvas'],
}

/** A ressalva-assinatura do CFO cético — o dissenso persistente da demo. */
const RESSALVA_UNIT_ECONOMICS =
  'Validar unit economics em teste real (CAC, ticket médio e payback) antes de qualquer investimento pesado'

interface TemaDemo {
  analise: (ideia: string) => string
  estrategias: string[]
  riscos: string[]
  perguntas: string[]
}

const TEMAS: Record<string, TemaDemo> = {
  cfo: {
    analise: (i) =>
      `Olhando "${resumo(i)}" pela ótica financeira: o modelo de receita precisa ficar explícito antes de qualquer investimento relevante. Estimei três cenários de unit economics e, no cenário-base, o payback de aquisição fica em torno de 8 meses — aceitável, mas sensível ao ticket médio.\n\nA necessidade de capital inicial parece moderada se o MVP for enxuto. Recomendo operar em bootstrapping até validar a primeira receita recorrente.`,
    estrategias: [
      'Modelar unit economics em 3 cenários (pessimista, base, otimista) antes de gastar em mídia',
      'Definir preço de lançamento com margem bruta mínima de 60%',
      'Adiar captação externa até ter 10 clientes pagantes',
    ],
    riscos: ['CAC acima do sustentável no início', 'Ticket médio baixo demais para a operação parar em pé'],
    perguntas: ['Qual é a meta de receita em 12 meses?', 'Quanto do seu próprio capital você pode comprometer?'],
  },
  cmo: {
    analise: (i) =>
      `Sobre "${resumo(i)}": o posicionamento precisa falar com um público específico — recomendo começar por um nicho apaixonado e expandir depois. Há espaço para uma narrativa forte de marca, e o custo de teste em canais orgânicos é baixo.\n\nConteúdo + comunidade me parecem os canais mais eficientes para o estágio atual; mídia paga só depois de encontrar mensagem que converte.`,
    estrategias: [
      'Escolher UM nicho inicial e dominar a conversa nele',
      'Produzir conteúdo semanal focado no problema (não no produto) por 60 dias',
      'Fechar 3 parcerias com quem já tem a audiência-alvo',
    ],
    riscos: ['Mensagem genérica que não gruda', 'Dependência precoce de mídia paga'],
    perguntas: ['Quem é o cliente dos sonhos, com nome e sobrenome?'],
  },
  cto: {
    analise: (i) =>
      `Tecnicamente, "${resumo(i)}" é viável com stack enxuta. A versão de 4 semanas existe: um MVP com ferramentas prontas e integrações via API resolve 80% do escopo inicial sem equipe grande.\n\nO principal risco técnico não é construir — é construir demais. Sugiro congelar escopo por sprint e medir uso real antes de cada nova funcionalidade.`,
    estrategias: [
      'MVP em 4 semanas usando componentes prontos e APIs de mercado',
      'Automatizar deploy e monitoramento desde o dia 1 (barato e evita sustos)',
      'Contratar 1 dev generalista sênior antes de especialistas',
    ],
    riscos: ['Over-engineering atrasar o lançamento', 'Dependência de fornecedor único em integração crítica'],
    perguntas: ['O que ficaria de fora se o prazo fosse 30 dias?'],
  },
  cpo: {
    analise: (i) =>
      `"${resumo(i)}" ataca um problema real, mas a hipótese mais arriscada é a disposição do usuário de mudar de comportamento. Antes de construir, vale rodar 15 entrevistas e uma landing page de intenção.\n\nO MVP deve entregar UMA promessa de valor de ponta a ponta — cortaria tudo que não serve a ela.`,
    estrategias: [
      'Rodar 15 entrevistas com o público-alvo em 2 semanas',
      'Landing page com lista de espera para medir intenção real',
      'Definir métrica de ativação clara antes do lançamento',
    ],
    riscos: ['Resolver um problema "vitamina" (interessante, mas não urgente)', 'Escopo do MVP inchar'],
    perguntas: ['Qual comportamento atual do usuário essa ideia substitui?'],
  },
  design: {
    analise: (i) =>
      `Para "${resumo(i)}", a experiência do primeiro uso decide tudo: o usuário precisa chegar ao valor em menos de 2 minutos, sem tutorial. Vejo oportunidade de diferenciar com uma identidade calorosa num mercado visualmente frio.\n\nSimplicidade radical no fluxo principal; sofisticação fica para os detalhes.`,
    estrategias: [
      'Prototipar o fluxo principal e testar com 5 usuários antes de codar',
      'Criar identidade visual própria (fugir do padrão genérico do setor)',
      'Definir o "momento uau" do primeiro uso e desenhar tudo ao redor dele',
    ],
    riscos: ['Interface pedir esforço demais no onboarding', 'Marca ficar parecida com a dos concorrentes'],
    perguntas: ['O que o usuário precisa sentir no primeiro minuto de uso?'],
  },
  copy: {
    analise: (i) =>
      `A promessa de "${resumo(i)}" cabe em uma frase? Esse é o teste. Trabalharia algo como "o jeito mais simples de X sem Y" e validaria 3 ângulos de mensagem em anúncios de baixo custo.\n\nO nome e a headline certos podem cortar o custo de aquisição pela metade — vale investir tempo nisso agora.`,
    estrategias: [
      'Escrever e testar 3 headlines com promessas diferentes',
      'Criar um manifesto curto da marca para alinhar toda a comunicação',
      'Mapear as 5 objeções mais prováveis e respondê-las na página',
    ],
    riscos: ['Mensagem que precisa de 3 parágrafos para explicar', 'Tom genérico que não gera identificação'],
    perguntas: ['Como o cliente descreveria isso para um amigo, com as palavras dele?'],
  },
  rh: {
    analise: (i) =>
      `Para tirar "${resumo(i)}" do papel, o gargalo é gente: o fundador não vai conseguir cobrir todas as frentes sozinho por muito tempo. Mapearia já as 2 competências mais críticas que faltam e como supri-las sem contratação cara (sócio, freela, mentoria).\n\nAtenção também ao ritmo: fundador queimado é o risco nº 1 de projeto em estágio inicial.`,
    estrategias: [
      'Mapear competências críticas vs. disponíveis e fechar as lacunas com freelas no início',
      'Definir critérios claros para o primeiro sócio ou primeira contratação',
      'Estabelecer rotina sustentável de trabalho com marcos quinzenais',
    ],
    riscos: ['Dependência total de uma pessoa', 'Contratar rápido demais e errado'],
    perguntas: ['Que parte do trabalho você odeia fazer? (essa é a primeira vaga)'],
  },
  vendas: {
    analise: (i) =>
      `Sobre "${resumo(i)}": a pergunta que importa é onde estão os 10 primeiros clientes. Se a resposta não for óbvia, o go-to-market precisa vir antes do produto. Vejo caminho por venda consultiva no início — mais lenta, porém rica em aprendizado.\n\nPreço: começaria mais alto do que o conforto sugere; baixar é fácil, subir é caro.`,
    estrategias: [
      'Listar 30 clientes potenciais e agendar 10 conversas nesta semana',
      'Vender manualmente as primeiras unidades antes de automatizar o funil',
      'Testar 2 faixas de preço com ofertas piloto',
    ],
    riscos: ['Ciclo de venda mais longo que o caixa aguenta', 'Preço baixo ancorar o produto como "baratinho"'],
    perguntas: ['Quem assina o cheque — e quem influencia a decisão?'],
  },
  juridico: {
    analise: (i) =>
      `Em "${resumo(i)}" não enxergo impeditivo regulatório de largada, mas há lições de casa: termos de uso, política de privacidade e adequação à LGPD se houver dados pessoais. Registro de marca no INPI deve entrar já no orçamento — é barato perto do custo de rebatizar depois.\n\nSe houver sócios, acordo de sócios antes do primeiro real de receita.`,
    estrategias: [
      'Registrar a marca no INPI antes do lançamento público',
      'Preparar termos de uso e política de privacidade adequados à LGPD',
      'Formalizar acordo de sócios com vesting, se houver mais de um fundador',
    ],
    riscos: ['Uso de dados pessoais sem base legal', 'Nome de marca já registrado por terceiro'],
    perguntas: ['Que dados pessoais o projeto coleta e por quê?'],
  },
  operacoes: {
    analise: (i) =>
      `O motor operacional de "${resumo(i)}" tem 3 engrenagens que precisam girar juntas. Desenharia o passo a passo da entrega ponta a ponta antes do lançamento e identificaria o gargalo que aparece quando a demanda dobrar.\n\nHá custos invisíveis (suporte, retrabalho, ferramentas) que sugiro colocar na planilha desde já.`,
    estrategias: [
      'Desenhar o fluxo operacional completo e rodar uma "entrega piloto" manual',
      'Definir 3 processos-chave com checklist antes de automatizar',
      'Negociar com 2 fornecedores por item crítico (nunca ficar refém de 1)',
    ],
    riscos: ['Gargalo operacional estourar junto com o primeiro pico de demanda', 'Custos ocultos corroerem a margem'],
    perguntas: ['O que quebra primeiro se a demanda dobrar amanhã?'],
  },
  dados: {
    analise: (i) =>
      `Para "${resumo(i)}", estimei um mercado endereçável relevante, mas as premissas precisam de validação com dados primários. As 3 métricas vitais que eu instrumentaria desde o dia 1: ativação, retenção em 30 dias e custo de aquisição.\n\nO experimento mais barato: campanha de intenção com R$ 300 mede demanda real antes de qualquer linha de código.`,
    estrategias: [
      'Instrumentar analytics desde o primeiro dia (eventos de ativação e retenção)',
      'Rodar teste de demanda com verba mínima antes de construir',
      'Revisar as métricas quinzenalmente com metas explícitas',
    ],
    riscos: ['Decidir por achismo com dados disponíveis e ignorados', 'Vaidade métrica (curtidas em vez de retenção)'],
    perguntas: ['Que número, se ficar abaixo de X em 90 dias, faria você parar?'],
  },
  cs: {
    analise: (i) =>
      `No pós-venda de "${resumo(i)}", o ponto decisivo é o onboarding: cliente que não chega ao primeiro valor em dias vira cancelamento em semanas. Desenharia o caminho até o "primeiro sucesso" e mediria isso obsessivamente.\n\nSuporte no início deve ser artesanal — cada conversa é pesquisa de produto grátis.`,
    estrategias: [
      'Mapear a jornada até o primeiro valor e remover cada atrito',
      'Atender pessoalmente os 20 primeiros clientes e documentar tudo',
      'Criar base de autoatendimento com as 10 dúvidas mais comuns',
    ],
    riscos: ['Churn silencioso por onboarding fraco', 'Suporte virar gargalo com o crescimento'],
    perguntas: ['Qual é o "primeiro sucesso" mensurável do cliente?'],
  },
}

function resumo(ideia: string): string {
  const limpa = ideia.trim().replace(/\s+/g, ' ')
  return limpa.length > 60 ? limpa.slice(0, 57) + '…' : limpa
}

const JUSTIFICATIVAS: Record<Voto, string[]> = {
  aprovar: [
    'Os fundamentos são sólidos na minha área e o risco é administrável.',
    'Vejo caminho claro de execução; os riscos que apontei têm mitigação conhecida.',
  ],
  aprovar_com_ressalvas: [
    'A ideia merece seguir, desde que as validações que propus aconteçam antes de investir pesado.',
    'Sou favorável, mas condiciono meu apoio à resolução dos riscos que levantei.',
  ],
  rejeitar: [
    'Na forma atual, os riscos da minha área superam o potencial — reformularia antes de seguir.',
    'Faltam respostas às perguntas críticas; sem elas, não recomendo avançar.',
  ],
}

/** Comentários de debate genéricos — fallback para quem não tem voz própria. */
const COMENTARIOS_DEBATE = [
  (n: string) => `Concordo com ${n} no diagnóstico, mas a solução proposta subestima o custo de execução.`,
  (n: string) => `O ponto de ${n} é justo e complementa minha análise — nossos riscos se reforçam mutuamente.`,
  (n: string) => `Discordo de ${n}: o risco apontado é real, porém administrável com o plano que propus.`,
  (n: string) => `${n} levantou algo que eu não tinha considerado; ajustei meu peso de risco por causa disso.`,
]

/** Voz própria por persona no debate (CFO numérico e telegráfico, CMO
 *  enérgica, Jurídico precisa, COO de checklist) — mesma estrutura do padrão. */
const COMENTARIOS_POR_MEMBRO: Record<string, ((n: string) => string)[]> = {
  cfo: [
    (n: string) =>
      `${n}, a conta não fecha: no cenário proposto, o payback passa de 12 meses. CAC, ticket e margem — quero os três validados.`,
    (n: string) =>
      `Diagnóstico de ${n}: correto. Na planilha, porém, a margem cai 8 p.p. Condiciono meu apoio a essa validação.`,
    (n: string) =>
      `Ponto de ${n} anotado. Impacto estimado: +15% no orçamento do trimestre. Cabe — se cortar mídia paga.`,
  ],
  cmo: [
    (n: string) =>
      `${n} tocou exatamente no ponto! Se a mensagem gruda no nicho certo, o resto do funil destrava — eu dobraria a aposta nessa direção.`,
    (n: string) =>
      `Aqui discordo de ${n}, com todo o entusiasmo: esperar demais mata o momento da marca. Teste barato agora, ajuste na semana seguinte!`,
    (n: string) =>
      `Adorei a provocação de ${n} — isso vira história de marca! Nicho apaixonado primeiro, escala depois.`,
  ],
  juridico: [
    (n: string) =>
      `Preciso qualificar o ponto de ${n}: nos termos propostos, há exposição no tratamento de dados pessoais. Mitigável com base legal adequada e coleta mínima — registro a condição.`,
    (n: string) =>
      `A proposta de ${n} é juridicamente sólida, desde que o acordo de sócios preceda a primeira receita. Mantenho essa condição em ata.`,
    (n: string) =>
      `Acompanho ${n} no mérito; ressalvo apenas que marca sem registro no INPI é passivo contingente, não ativo.`,
  ],
  operacoes: [
    (n: string) =>
      `Sobre o ponto de ${n}, meu checklist: (1) fluxo de entrega desenhado; (2) gargalo do pico mapeado; (3) plano B de fornecedor. Sem os três, não escala.`,
    (n: string) =>
      `${n} tem razão no risco. Na operação, isso vira um passo a mais no piloto manual: incluído, testado, resolvido.`,
    (n: string) =>
      `Traduzindo a ideia de ${n} em processo: quem faz, em quanto tempo, com qual ferramenta. Travou em um dos três? Voltamos uma casa.`,
  ],
}

const comentariosDe = (membroId: string) => COMENTARIOS_POR_MEMBRO[membroId] ?? COMENTARIOS_DEBATE

/** Tipo da reação na demo: o cético (CFO Ricardo) sempre DISCORDA — é o
 *  dissenso persistente da mesa e garante ao menos uma discordância por rodada.
 *  Os demais, em maioria, complementam ou concordam, com discórdia eventual. */
function tipoReacaoDemo(perfil: PerfilDemo, g: () => number): TipoReacao {
  if (perfil === 'cetico') return 'discorda'
  const opcoes: TipoReacao[] = ['complementa', 'complementa', 'concorda', 'concorda', 'discorda']
  return sorteia(g, opcoes)
}

/** Condições que os conselheiros "com ressalvas" declaram no modo consenso. */
const RESSALVAS_DEMO = [
  'Validar a demanda com lista de espera (≥ 100 inscritos) antes de investir em produto',
  'Definir um teto de gasto mensal para a fase de testes',
  'Fechar o acordo de sócios antes da primeira receita',
  'Confirmar o custo de aquisição em um teste com verba mínima',
  'Registrar a marca no INPI antes do lançamento público',
]

function sorteiaRessalvas(g: () => number): string[] {
  const primeira = sorteia(g, RESSALVAS_DEMO)
  if (g() < 0.4) {
    const segunda = sorteia(
      g,
      RESSALVAS_DEMO.filter((r) => r !== primeira),
    )
    return [primeira, segunda]
  }
  return [primeira]
}

export function criaTransporteDemo(): Transporte {
  // Semente da reunião: com bod.seedDemo o resultado é 100% determinístico
  // (smoke test de CI); sem seed, cada reunião sorteia a própria semente.
  const sementeReuniao = SEMENTE_FIXA ?? Math.floor(Math.random() * 0x7fffffff) + 1
  // Um gerador POR CONSELHEIRO: as chamadas rodam em paralelo e a ordem de
  // término varia, mas a sequência de sorteios de cada membro é sempre a mesma.
  const geradores = new Map<string, () => number>()
  const rndDoMembro = (membroId: string): (() => number) => {
    let g = geradores.get(membroId)
    if (!g) {
      g = mulberry32((sementeReuniao + hashTexto(membroId)) >>> 0)
      geradores.set(membroId, g)
    }
    return g
  }

  return {
    async estruturada({ user, membroId }) {
      await espera(600 + rnd() * 1800)

      if (user.includes('PLANO DE NEGÓCIO COMPLETO')) {
        const ideia = user.match(/<ideia>\n([\s\S]*?)\n<\/ideia>/)?.[1] ?? 'sua ideia'
        return JSON.stringify(planoDemo(ideia))
      }

      const ehDebate = user.startsWith('Rodada de debate')
      const g = rndDoMembro(membroId)

      if (!ehDebate) {
        const ideia = user.match(/<ideia>\n([\s\S]*?)\n<\/ideia>/)?.[1] ?? 'sua ideia'
        const tema = TEMAS[membroId] ?? TEMAS.cpo
        const voto = sorteia(g, VOTOS_PONDERADOS[perfilDe(membroId)])
        const r: AnaliseRodada1 = {
          analise: tema.analise(ideia),
          estrategias: tema.estrategias,
          riscos: tema.riscos,
          perguntas: tema.perguntas,
          voto,
          justificativa: sorteia(g, JUSTIFICATIVAS[voto]),
          confianca: sorteia(g, [3, 3, 4, 4, 5]) as 3 | 4 | 5,
        }
        return JSON.stringify(r)
      }

      const votoAtualTexto = user.match(/Seu voto atual é: (.+?) \(/)?.[1] ?? 'Aprovar com ressalvas'
      const votoAtual: Voto =
        votoAtualTexto === 'Aprovar' ? 'aprovar' : votoAtualTexto === 'Rejeitar' ? 'rejeitar' : 'aprovar_com_ressalvas'
      const colegas = [...user.matchAll(/### (.+?) \(/g)].map((m) => m[1])
      const alvos = embaralha(colegas, g).slice(0, Math.min(2, colegas.length))
      const rodada = Number(user.match(/Rodada de debate nº (\d+)/)?.[1] ?? '1')
      const perfil = perfilDe(membroId)

      // Convergência crível rumo a um placar majoritariamente positivo:
      // - rejeições viram condições (ressalvas) já na 1ª rodada de debate;
      // - otimistas resolvem as próprias ressalvas assim que debatem;
      // - ponderados convergem aos poucos; o cético (CFO) sustenta a ressalva
      //   nas primeiras rodadas — o dissenso persistente da demo padrão.
      let voto: Voto = votoAtual
      if (votoAtual === 'rejeitar') {
        voto = 'aprovar_com_ressalvas'
      } else if (votoAtual === 'aprovar_com_ressalvas') {
        const chanceConvergir =
          perfil === 'cetico' ? (rodada >= 3 ? 0.7 : 0) : perfil === 'otimista' ? 1 : rodada >= 2 ? 0.85 : 0.6
        if (g() < chanceConvergir) voto = 'aprovar'
      }
      const mudou = voto !== votoAtual

      const r: AnaliseDebate = {
        reacoes: alvos.map((n) => {
          const comentario = sorteia(g, comentariosDe(membroId))(n)
          return { para: n, tipo: tipoReacaoDemo(perfil, g), comentario }
        }),
        mudou_voto: mudou,
        voto,
        justificativa: mudou
          ? voto === 'aprovar'
            ? 'Minhas condições foram endereçadas no debate — migro para a aprovação plena.'
            : 'O debate respondeu parte das minhas objeções; retiro a rejeição, mas converto o restante em condições verificáveis.'
          : voto === 'aprovar_com_ressalvas'
            ? perfil === 'cetico'
              ? 'Mantenho a ressalva. Sem unit economics validados — CAC, ticket médio e payback —, não subscrevo aprovação plena.'
              : 'Mantenho o voto: minhas condições ainda não foram resolvidas pelos colegas.'
            : 'O debate reforçou minha leitura; mantenho o voto com mais convicção.',
        ressalvas_pendentes:
          voto === 'aprovar_com_ressalvas'
            ? perfil === 'cetico'
              ? [RESSALVA_UNIT_ECONOMICS]
              : sorteiaRessalvas(g)
            : [],
      }
      return JSON.stringify(r)
    },

    async streamada({ user, proposito, onDelta }) {
      const ideia = user.match(/<ideia>\n([\s\S]*?)\n<\/ideia>/)?.[1] ?? 'a ideia apresentada'
      const texto = proposito === 'prompt' ? textoPromptDemo(ideia) : textoVereditoDemo(ideia, user)

      const palavras = texto.split(/(?<=\s)/)
      let completo = ''
      for (const p of palavras) {
        completo += p
        onDelta(p)
        await espera(6 + rnd() * 14)
      }
      return completo
    },
  }
}

// ── Veredito derivado do placar real ─────────────────────────────────────────

interface PosicaoDemo {
  nome: string
  cargo: string
  voto: Voto
  mudou: boolean
  ressalvas: string[]
}

/** Lê do prompt de síntese as posições finais REALMENTE sorteadas na reunião.
 *  Âncoras parseadas (definidas em prompts.ts/promptSintese): blocos
 *  '### Nome (Cargo)', linha 'Voto final: X (', marcador '(MUDOU DE VOTO)' e
 *  sufixo 'Ressalvas pendentes: A | B'. O placar do veredito nasce daqui. */
function lePosicoesFinais(user: string): PosicaoDemo[] {
  const posicoes: PosicaoDemo[] = []
  for (const bloco of user.split(/^### /m).slice(1)) {
    const cabecalho = bloco.match(/^(.+?) \((.+?)\)\n/)
    const rotulo = bloco.match(/^Voto final: (Aprovar com ressalvas|Aprovar|Rejeitar) \(/m)?.[1]
    if (!cabecalho || !rotulo) continue
    const voto: Voto =
      rotulo === 'Aprovar' ? 'aprovar' : rotulo === 'Rejeitar' ? 'rejeitar' : 'aprovar_com_ressalvas'
    const listasRessalvas = [...bloco.matchAll(/Ressalvas pendentes: (.+)$/gm)]
    const ultima = listasRessalvas.length > 0 ? listasRessalvas[listasRessalvas.length - 1][1] : ''
    posicoes.push({
      nome: cabecalho[1],
      cargo: cabecalho[2],
      voto,
      mudou: bloco.includes('(MUDOU DE VOTO)'),
      ressalvas: voto === 'aprovar_com_ressalvas' && ultima ? ultima.split(' | ') : [],
    })
  }
  return posicoes
}

function listaNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? ''
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`
}

function textoVereditoDemo(ideia: string, user: string): string {
  const posicoes = lePosicoesFinais(user)
  const placar: Record<Voto, number> = { aprovar: 0, aprovar_com_ressalvas: 0, rejeitar: 0 }
  for (const p of posicoes) placar[p.voto]++
  const total = posicoes.length
  const dissidentes = posicoes.filter((p) => p.voto !== 'aprovar')
  const mudaram = posicoes.filter((p) => p.mudou)

  const contagem = (n: number) => (n === 0 ? 'nenhum voto' : n === 1 ? '1 voto' : `${n} votos`)
  const frasePlacar = `${contagem(placar.aprovar)} a favor, ${contagem(placar.aprovar_com_ressalvas)} com ressalvas e ${contagem(placar.rejeitar)} contra`
  const negativa = placar.rejeitar > placar.aprovar + placar.aprovar_com_ressalvas
  const unanime = total > 0 && placar.aprovar === total

  // A primeira frase SEMPRE deriva do placar calculado — nunca texto fixo.
  const abertura =
    total === 0
      ? `O conselho analisou "${resumo(ideia)}" e recomenda **aprovar com condições**: avance somente após as validações listadas abaixo.`
      : negativa
        ? `Com ${frasePlacar}, o conselho recomenda **não seguir com a ideia na forma atual** — reformule os pontos críticos abaixo antes de trazê-la de volta à mesa.`
        : unanime
          ? `Com ${frasePlacar}, o conselho recomenda **aprovar por unanimidade** a ideia "${resumo(ideia)}" — as validações abaixo seguem como compromissos do plano.`
          : `Com ${frasePlacar}, o conselho recomenda **aprovar** a ideia "${resumo(ideia)}" — o avanço fica condicionado às validações abaixo, debatidas como ressalvas durante a reunião.`

  const leitura: string[] = []
  if (mudaram.length > 0) {
    const quem = mudaram.length > 3 ? `${mudaram.length} conselheiros` : listaNomes(mudaram.map((p) => p.nome))
    leitura.push(
      `- ${quem} ${mudaram.length === 1 ? 'migrou' : 'migraram'} de voto durante o debate — as condições levantadas foram endereçadas pelos colegas.`,
    )
  }
  for (const d of dissidentes) {
    leitura.push(
      d.voto === 'aprovar_com_ressalvas'
        ? `- **${d.nome}** (${d.cargo}) manteve a aprovação com ressalvas${d.ressalvas.length > 0 ? ` — condição em ata: "${d.ressalvas[0]}"` : ''}.`
        : `- **${d.nome}** (${d.cargo}) manteve o voto contrário — os riscos apontados nessa cadeira merecem resposta antes de qualquer investimento.`,
    )
  }
  if (total > 0 && dissidentes.length === 0) {
    leitura.push('- Nenhuma divergência sobreviveu ao debate: o consenso final foi pleno.')
  }
  if (total === 0) leitura.push('- Registro individual de votos indisponível nesta simulação.')

  const divergencias =
    dissidentes.length > 0
      ? dissidentes.map((d) =>
          d.voto === 'rejeitar'
            ? `- **${d.nome}** (${d.cargo}): voto contrário mantido até o fim do debate.`
            : `- **${d.nome}** (${d.cargo}): ${d.ressalvas.length > 0 ? d.ressalvas.join('; ') : 'ressalvas mantidas em ata'}.`,
        )
      : ['- Nenhuma divergência remanescente: as condições levantadas no debate foram resolvidas pelos próprios conselheiros.']

  const dissenso = dissidentes[0]
  const palavraFinal = dissenso
    ? `Você tem entre as mãos uma ideia com potencial genuíno e um conselho dividido nos detalhes, não na essência — isso é bom sinal. Leve a sério o que ${dissenso.nome} deixou em ata: resolva as condições pendentes antes de acelerar, escute os números mais do que os aplausos, e volte a esta mesa em 90 dias com dados. *Boa sorte — e mãos à obra.*`
    : `Você tem entre as mãos uma ideia com potencial genuíno e um conselho alinhado no essencial. Execute as validações com disciplina, escute os números mais do que os aplausos, e volte a esta mesa em 90 dias com dados. *Boa sorte — e mãos à obra.*`

  return `# Veredito do Conselho

${abertura}

## Placar e leitura da votação
${leitura.join('\n')}

## Consensos
- O problema atacado é real e o momento de mercado é favorável.
- O MVP deve ser radicalmente enxuto e sair em semanas, não meses.
- Validar demanda com experimentos baratos antes de investir pesado.

## Divergências relevantes
${divergencias.join('\n')}

## Riscos que exigem atenção imediata
1. Custo de aquisição de clientes acima do sustentável.
2. Escopo do MVP crescer e atrasar o aprendizado real.
3. Dependência excessiva do fundador em todas as frentes.

## Plano de ação recomendado
**Próximos 7 dias:** 15 entrevistas com o público-alvo; landing page de intenção no ar.
**Próximos 30 dias:** MVP mínimo funcionando; 10 conversas de venda reais; marca registrada no INPI.
**Próximos 90 dias:** 10 primeiros clientes pagantes; métricas de ativação e retenção rodando; decisão de dobrar, ajustar ou parar baseada nos números.

## Palavra final da Presidente
${palavraFinal}

---
*Esta reunião foi uma simulação do modo demonstração — nenhuma IA foi consultada e os votos acima são ilustrativos. Para a análise real do conselho, conecte sua API de IA (a chave fica só no seu navegador) ou rode grátis no seu plano com o botão **🖥 Rodar no Claude Code** da tela inicial.*`
}

function textoPromptDemo(ideia: string): string {
  return `# Projeto: ${resumo(ideia)}

## 1. Contexto e objetivo
Construir a primeira versão do projeto descrito: "${resumo(ideia)}". O objetivo desta fase é validar a proposta de valor com usuários reais, priorizando velocidade de lançamento sobre completude.

## 2. Escopo do MVP
- Página inicial apresentando a proposta de valor em uma frase, com chamada para ação principal.
- Fluxo central do produto de ponta a ponta (versão mínima, sem personalizações avançadas).
- Cadastro simples de interessados (nome + e-mail) com armazenamento seguro.
- Painel básico para acompanhar inscrições e uso.

## 3. Fora de escopo
- Sistema de pagamento (validar demanda primeiro).
- Aplicativo móvel nativo — web responsivo é suficiente nesta fase.
- Automações e integrações avançadas.

## 4. Requisitos técnicos
- Stack enxuta e amplamente suportada (ex.: React + TypeScript no front; serviço gerenciado no back).
- Instrumentação de analytics desde o dia 1 (eventos de ativação e retenção).
- Deploy automatizado com preview por branch.

## 5. UX e comunicação
- Primeiro valor em menos de 2 minutos, sem tutorial.
- Tom direto e caloroso; evitar jargão técnico.

## 6. Critérios de aceitação
- [ ] Fluxo principal funciona de ponta a ponta sem erros.
- [ ] Página carrega em menos de 3 segundos em conexão 4G.
- [ ] Eventos de analytics registrados para cada etapa do funil.

## 7. Riscos e cuidados na implementação
- LGPD: coletar apenas dados necessários, com política de privacidade visível.
- Evitar over-engineering: nada de abstrações para necessidades futuras hipotéticas.

## 8. Plano de implementação sugerido
1. Estruturar o projeto e o deploy contínuo.
2. Implementar o fluxo central em versão mínima.
3. Adicionar cadastro + analytics.
4. Testes do fluxo completo e ajustes de UX.
5. Lançar para um grupo pequeno e medir.

---
*Este prompt é um exemplo do modo demonstração — mostra a estrutura, não o conteúdo real. Conecte sua API de IA ou rode grátis no seu plano com o botão **🖥 Rodar no Claude Code** para receber um prompt completo e específico para a sua ideia.*`
}

function planoDemo(ideia: string): Plano {
  return {
    titulo: `Plano de Negócio — ${resumo(ideia)}`,
    subtitulo: 'Documento de exemplo gerado no modo demonstração',
    resumo_executivo:
      'Este é um plano de exemplo do modo demonstração — uma simulação, sem consultar nenhuma IA. Conectando sua API de IA, ou rodando grátis no seu plano com o botão Rodar no Claude Code, o conselho compila aqui a decisão da reunião em um plano completo e específico para a sua ideia.\n\nO conselho recomendou aprovar, tratando as validações de demanda como condições incorporadas ao roadmap. O plano prioriza velocidade de aprendizado com investimento mínimo.',
    publico_alvo:
      'Adotantes iniciais urbanos, 25–45 anos, que já usam soluções digitais no dia a dia e valorizam conveniência — começando por um nicho específico antes de expandir.',
    proposta_valor: 'O jeito mais simples de resolver o problema central do público, sem fricção e com confiança desde o primeiro uso.',
    analise_mercado: {
      visao_geral:
        'Mercado em crescimento com concorrência fragmentada. As soluções atuais atendem mal o nicho inicial escolhido, criando espaço para entrada focada. Estimativa conservadora de mercado endereçável regional na casa de dezenas de milhares de clientes potenciais.',
      concorrentes: [
        { nome: 'Concorrente A (líder)', pontos_fortes: 'Marca conhecida e base grande de clientes', pontos_fracos: 'Experiência genérica; atendimento lento' },
        { nome: 'Concorrente B (digital)', pontos_fortes: 'Produto moderno e preço agressivo', pontos_fracos: 'Não atende o nicho inicial; suporte fraco' },
        { nome: 'Alternativa manual (status quo)', pontos_fortes: 'Custo zero e hábito estabelecido', pontos_fracos: 'Demorada, sujeita a erros e sem escala' },
      ],
    },
    swot: {
      forcas: ['Foco em nicho mal atendido', 'Custo de operação enxuto', 'Velocidade de iteração'],
      fraquezas: ['Marca desconhecida', 'Time reduzido no início', 'Dependência do fundador'],
      oportunidades: ['Mercado em digitalização', 'Parcerias com quem já tem a audiência', 'Expansão geográfica gradual'],
      ameacas: ['Reação dos concorrentes grandes', 'Mudanças regulatórias', 'Custo de aquisição acima do previsto'],
    },
    pilares_estrategia: [
      { titulo: 'Validar antes de escalar', descricao: 'Entrevistas, lista de espera e vendas manuais antes de qualquer investimento pesado em produto ou mídia.' },
      { titulo: 'Nicho primeiro', descricao: 'Dominar um segmento específico e expandir por adjacência, em vez de atacar "todo mundo".' },
      { titulo: 'Operação artesanal no início', descricao: 'Fazer manualmente o que não escala para aprender rápido, automatizando apenas o que provar valor.' },
    ],
    roadmap: [
      { fase: 'Validação de demanda', duracao_semanas: 3, entregas: ['15 entrevistas com o público-alvo', 'Landing page com lista de espera', 'Teste de mensagem com verba mínima'] },
      { fase: 'MVP e primeiros clientes', duracao_semanas: 5, entregas: ['MVP enxuto no ar', '10 conversas de venda', 'Primeiros 5 clientes pagantes'] },
      { fase: 'Ajuste e repetibilidade', duracao_semanas: 6, entregas: ['Onboarding sem fricção', 'Métricas de retenção rodando', 'Processo de venda documentado'] },
      { fase: 'Crescimento inicial', duracao_semanas: 8, entregas: ['Canal de aquisição validado', '30+ clientes ativos', 'Decisão de dobrar ou ajustar baseada em dados'] },
    ],
    orcamento: [
      { categoria: 'Ferramentas e infraestrutura', valor_mensal_brl: 400, observacao: 'Hospedagem, domínio, ferramentas no-code e analytics' },
      { categoria: 'Marketing e testes de mídia', valor_mensal_brl: 900, observacao: 'Verba de experimentos; só escala após validar mensagem' },
      { categoria: 'Serviços profissionais', valor_mensal_brl: 600, observacao: 'Contabilidade e registro de marca (INPI) diluído' },
      { categoria: 'Freelancers pontuais', valor_mensal_brl: 1200, observacao: 'Design e desenvolvimento sob demanda' },
      { categoria: 'Reserva de imprevistos', valor_mensal_brl: 300, observacao: '~10% do orçamento total' },
    ],
    metricas: [
      { nome: 'Inscritos na lista de espera', meta_90_dias: '300 inscritos', como_medir: 'Analytics da landing page' },
      { nome: 'Clientes pagantes', meta_90_dias: '10 clientes', como_medir: 'Registros de venda' },
      { nome: 'Retenção em 30 dias', meta_90_dias: '≥ 60%', como_medir: 'Eventos de uso no produto' },
      { nome: 'Custo de aquisição (CAC)', meta_90_dias: '≤ R$ 80', como_medir: 'Verba de mídia ÷ novos clientes' },
    ],
    riscos: [
      { risco: 'Demanda menor que o esperado no nicho', probabilidade: 'media', impacto: 'alta', mitigacao: 'Validar com lista de espera antes do MVP; pivotar o nicho se < 100 inscritos' },
      { risco: 'CAC acima do sustentável', probabilidade: 'media', impacto: 'media', mitigacao: 'Priorizar canais orgânicos e parcerias; teto de verba por experimento' },
      { risco: 'Dependência total do fundador', probabilidade: 'alta', impacto: 'media', mitigacao: 'Documentar processos desde o dia 1; primeiro freelancer recorrente na fase 3' },
      { risco: 'Questões regulatórias/LGPD', probabilidade: 'baixa', impacto: 'alta', mitigacao: 'Termos e política de privacidade antes do lançamento; coleta mínima de dados' },
    ],
    proximos_passos: [
      'Agendar as 15 entrevistas desta semana',
      'Colocar a landing page com lista de espera no ar',
      'Registrar a marca no INPI',
      'Definir as 3 métricas no painel de acompanhamento',
      'Rodar o primeiro teste de mensagem com verba mínima',
      'Marcar a revisão do plano para daqui a 30 dias',
    ],
  }
}

// Garante que todo membro votante tem tema demo definido.
if (import.meta.env.DEV) {
  for (const m of MEMBROS.filter((x) => !x.presidente)) {
    if (!TEMAS[m.id]) console.warn(`[demo] membro sem tema: ${m.id}`)
  }
}
