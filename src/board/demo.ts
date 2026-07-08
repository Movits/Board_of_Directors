import type { AnaliseDebate, AnaliseRodada1, Plano, Transporte, Voto } from '../types'
import { MEMBROS } from './members'

// Modo demonstração: simula as respostas do conselho sem chamar a API.
// Compartilha o MESMO orquestrador do modo real — só troca a camada de transporte.

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms))
const sorteia = <T>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)]

const VOTOS_PONDERADOS: Voto[] = [
  'aprovar',
  'aprovar',
  'aprovar_com_ressalvas',
  'aprovar_com_ressalvas',
  'aprovar_com_ressalvas',
  'rejeitar',
]

interface TemaDemo {
  analise: (ideia: string) => string
  estrategias: string[]
  riscos: string[]
  perguntas: string[]
}

const TEMAS: Record<string, TemaDemo> = {
  cfo: {
    analise: (i) =>
      `[DEMO] Olhando "${resumo(i)}" pela ótica financeira: o modelo de receita precisa ficar explícito antes de qualquer investimento relevante. Estimei três cenários de unit economics e, no cenário-base, o payback de aquisição fica em torno de 8 meses — aceitável, mas sensível ao ticket médio.\n\nA necessidade de capital inicial parece moderada se o MVP for enxuto. Recomendo operar em bootstrapping até validar a primeira receita recorrente.`,
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
      `[DEMO] Sobre "${resumo(i)}": o posicionamento precisa falar com um público específico — recomendo começar por um nicho apaixonado e expandir depois. Há espaço para uma narrativa forte de marca, e o custo de teste em canais orgânicos é baixo.\n\nConteúdo + comunidade me parecem os canais mais eficientes para o estágio atual; mídia paga só depois de encontrar mensagem que converte.`,
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
      `[DEMO] Tecnicamente, "${resumo(i)}" é viável com stack enxuta. A versão de 4 semanas existe: um MVP com ferramentas prontas e integrações via API resolve 80% do escopo inicial sem equipe grande.\n\nO principal risco técnico não é construir — é construir demais. Sugiro congelar escopo por sprint e medir uso real antes de cada nova funcionalidade.`,
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
      `[DEMO] "${resumo(i)}" ataca um problema real, mas a hipótese mais arriscada é a disposição do usuário de mudar de comportamento. Antes de construir, vale rodar 15 entrevistas e uma landing page de intenção.\n\nO MVP deve entregar UMA promessa de valor de ponta a ponta — cortaria tudo que não serve a ela.`,
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
      `[DEMO] Para "${resumo(i)}", a experiência do primeiro uso decide tudo: o usuário precisa chegar ao valor em menos de 2 minutos, sem tutorial. Vejo oportunidade de diferenciar com uma identidade calorosa num mercado visualmente frio.\n\nSimplicidade radical no fluxo principal; sofisticação fica para os detalhes.`,
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
      `[DEMO] A promessa de "${resumo(i)}" cabe em uma frase? Esse é o teste. Trabalharia algo como "o jeito mais simples de X sem Y" e validaria 3 ângulos de mensagem em anúncios de baixo custo.\n\nO nome e a headline certos podem cortar o custo de aquisição pela metade — vale investir tempo nisso agora.`,
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
      `[DEMO] Para tirar "${resumo(i)}" do papel, o gargalo é gente: o fundador não vai conseguir cobrir todas as frentes sozinho por muito tempo. Mapearia já as 2 competências mais críticas que faltam e como supri-las sem contratação cara (sócio, freela, mentoria).\n\nAtenção também ao ritmo: fundador queimado é o risco nº 1 de projeto em estágio inicial.`,
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
      `[DEMO] Sobre "${resumo(i)}": a pergunta que importa é onde estão os 10 primeiros clientes. Se a resposta não for óbvia, o go-to-market precisa vir antes do produto. Vejo caminho por venda consultiva no início — mais lenta, porém rica em aprendizado.\n\nPreço: começaria mais alto do que o conforto sugere; baixar é fácil, subir é caro.`,
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
      `[DEMO] Em "${resumo(i)}" não enxergo impeditivo regulatório de largada, mas há lições de casa: termos de uso, política de privacidade e adequação à LGPD se houver dados pessoais. Registro de marca no INPI deve entrar já no orçamento — é barato perto do custo de rebatizar depois.\n\nSe houver sócios, acordo de sócios antes do primeiro real de receita.`,
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
      `[DEMO] O motor operacional de "${resumo(i)}" tem 3 engrenagens que precisam girar juntas. Desenharia o passo a passo da entrega ponta a ponta antes do lançamento e identificaria o gargalo que aparece quando a demanda dobrar.\n\nHá custos invisíveis (suporte, retrabalho, ferramentas) que sugiro colocar na planilha desde já.`,
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
      `[DEMO] Para "${resumo(i)}", estimei um mercado endereçável relevante, mas as premissas precisam de validação com dados primários. As 3 métricas vitais que eu instrumentaria desde o dia 1: ativação, retenção em 30 dias e custo de aquisição.\n\nO experimento mais barato: campanha de intenção com R$ 300 mede demanda real antes de qualquer linha de código.`,
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
      `[DEMO] No pós-venda de "${resumo(i)}", o ponto decisivo é o onboarding: cliente que não chega ao primeiro valor em dias vira cancelamento em semanas. Desenharia o caminho até o "primeiro sucesso" e mediria isso obsessivamente.\n\nSuporte no início deve ser artesanal — cada conversa é pesquisa de produto grátis.`,
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

const COMENTARIOS_DEBATE = [
  (n: string) => `Concordo com ${n} no diagnóstico, mas a solução proposta subestima o custo de execução.`,
  (n: string) => `O ponto de ${n} é justo e complementa minha análise — nossos riscos se reforçam mutuamente.`,
  (n: string) => `Discordo de ${n}: o risco apontado é real, porém administrável com o plano que propus.`,
  (n: string) => `${n} levantou algo que eu não tinha considerado; ajustei meu peso de risco por causa disso.`,
]

export function criaTransporteDemo(): Transporte {
  return {
    async estruturada({ user, membroId }) {
      await espera(600 + Math.random() * 1800)

      if (user.includes('PLANO DE NEGÓCIO COMPLETO')) {
        const ideia = user.match(/<ideia>\n([\s\S]*?)\n<\/ideia>/)?.[1] ?? 'sua ideia'
        return JSON.stringify(planoDemo(ideia))
      }

      const ehDebate = user.startsWith('Rodada de debate')

      if (!ehDebate) {
        const ideia = user.match(/<ideia>\n([\s\S]*?)\n<\/ideia>/)?.[1] ?? 'sua ideia'
        const tema = TEMAS[membroId] ?? TEMAS.cpo
        const voto = sorteia(VOTOS_PONDERADOS)
        const r: AnaliseRodada1 = {
          analise: tema.analise(ideia),
          estrategias: tema.estrategias,
          riscos: tema.riscos,
          perguntas: tema.perguntas,
          voto,
          justificativa: sorteia(JUSTIFICATIVAS[voto]),
          confianca: sorteia([3, 3, 4, 4, 5]) as 3 | 4 | 5,
        }
        return JSON.stringify(r)
      }

      const votoAtualTexto = user.match(/Seu voto atual é: (.+?) \(/)?.[1] ?? 'Aprovar com ressalvas'
      const votoAtual: Voto =
        votoAtualTexto === 'Aprovar' ? 'aprovar' : votoAtualTexto === 'Rejeitar' ? 'rejeitar' : 'aprovar_com_ressalvas'
      const colegas = [...user.matchAll(/### (.+?) \(/g)].map((m) => m[1])
      const alvos = colegas.sort(() => Math.random() - 0.5).slice(0, Math.min(2, colegas.length))
      // Convergência gradual rumo ao voto majoritário: quanto mais rodadas,
      // maior a chance de ceder — simula um debate que caminha para consenso.
      const rodada = Number(user.match(/Rodada de debate nº (\d+)/)?.[1] ?? '1')
      const alvoConsenso: Voto = 'aprovar_com_ressalvas'
      const chanceConvergir = rodada >= 3 ? 0.9 : rodada === 2 ? 0.6 : 0.15
      const mudou = votoAtual !== alvoConsenso && Math.random() < chanceConvergir
      const voto: Voto = mudou ? alvoConsenso : votoAtual
      const r: AnaliseDebate = {
        reacoes: alvos.map((n) => ({ para: n, comentario: sorteia(COMENTARIOS_DEBATE)(n) })),
        mudou_voto: mudou,
        voto,
        justificativa: mudou
          ? 'O debate trouxe argumentos que mudaram meu cálculo de risco — ajustei o voto.'
          : 'O debate reforçou minha leitura; mantenho o voto com mais convicção.',
      }
      return JSON.stringify(r)
    },

    async streamada({ user, proposito, onDelta }) {
      const ideia = user.match(/<ideia>\n([\s\S]*?)\n<\/ideia>/)?.[1] ?? 'a ideia apresentada'
      const texto = proposito === 'prompt' ? textoPromptDemo(ideia) : textoVereditoDemo(ideia)

      const palavras = texto.split(/(?<=\s)/)
      let completo = ''
      for (const p of palavras) {
        completo += p
        onDelta(p)
        await espera(6 + Math.random() * 14)
      }
      return completo
    },
  }
}

function textoVereditoDemo(ideia: string): string {
  return `# Veredito do Conselho

**[DEMO]** O conselho recomenda **aprovar com ressalvas**: a ideia "${resumo(ideia)}" tem mérito, mas o avanço deve ser condicionado às validações apontadas abaixo.

## Placar e leitura da votação
A maioria votou por aprovar com ressalvas. Não houve unanimidade — as divergências vieram principalmente das áreas financeira e comercial, o que indica que o risco central do projeto é de **modelo de negócio**, não de execução técnica.

## Consensos
- O problema atacado é real e o momento de mercado é favorável.
- O MVP deve ser radicalmente enxuto e sair em semanas, não meses.
- Validar demanda com experimentos baratos antes de investir pesado.

## Divergências relevantes
- **Preço e go-to-market**: parte do conselho defende começar premium; outra parte, volume acessível.
- **Ritmo de contratação**: RH pede reforço cedo; Finanças pede time mínimo até a primeira receita.

## Riscos que exigem atenção imediata
1. Custo de aquisição de clientes acima do sustentável.
2. Escopo do MVP crescer e atrasar o aprendizado real.
3. Dependência excessiva do fundador em todas as frentes.

## Plano de ação recomendado
**Próximos 7 dias:** 15 entrevistas com o público-alvo; landing page de intenção no ar.
**Próximos 30 dias:** MVP mínimo funcionando; 10 conversas de venda reais; marca registrada no INPI.
**Próximos 90 dias:** 10 primeiros clientes pagantes; métricas de ativação e retenção rodando; decisão de dobrar, ajustar ou parar baseada nos números.

## Palavra final da Presidente
Você tem entre as mãos uma ideia com potencial genuíno e um conselho dividido nos detalhes, não na essência. Isso é bom sinal. Execute as validações com disciplina, escute os números mais do que os aplausos, e volte a esta mesa em 90 dias com dados. *Boa sorte — e mãos à obra.*

---
*Este veredito foi gerado no modo demonstração. Configure sua chave de API para receber a análise real do conselho.*`
}

function textoPromptDemo(ideia: string): string {
  return `# Projeto: ${resumo(ideia)}

**[DEMO]** — este é um exemplo da estrutura do prompt de execução. Com a chave de API configurada, o conselho gera um prompt completo e específico para a sua ideia.

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
*Prompt gerado no modo demonstração.*`
}

function planoDemo(ideia: string): Plano {
  return {
    titulo: `Plano de Negócio — ${resumo(ideia)}`,
    subtitulo: '[DEMO] Documento de exemplo gerado no modo demonstração',
    resumo_executivo:
      'Este é um plano de exemplo do modo demonstração. Com uma API de IA conectada, o conselho compila aqui a decisão da reunião em um plano completo e específico para a sua ideia.\n\nO conselho recomendou aprovar com ressalvas, condicionando o avanço às validações de demanda descritas no roadmap. O plano prioriza velocidade de aprendizado com investimento mínimo.',
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
