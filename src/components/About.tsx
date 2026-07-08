/** Tela "Sobre & privacidade" — transparência sobre chave, dados e conteúdo de IA. */
export function About() {
  return (
    <div className="tela-config tela-sobre">
      <h1>Sobre & privacidade</h1>

      <section className="cartao-config">
        <h2>🏛️ O que é este app</h2>
        <p>
          O <strong>Board of Directors</strong> é um conselho de administração simulado por IA:
          treze conselheiros com expertises diferentes analisam sua ideia, debatem, votam e
          entregam um veredito, um plano detalhado e um prompt de execução.{' '}
          <strong>O conselho decide, mas não executa nada</strong> — quem age a partir das
          recomendações é você.
        </p>
      </section>

      <section className="cartao-config">
        <h2>🔐 Sua chave e seus dados</h2>
        <p>
          Este site é 100% estático: <strong>não existe servidor nosso</strong>. Tudo o que você
          digita — a chave de API, as ideias, o histórico de reuniões, os feedbacks e as personas
          editadas — fica salvo apenas no <em>localStorage</em> deste navegador.
        </p>
        <ul>
          <li>
            A chave de API é enviada <strong>diretamente do seu navegador para a API do provedor
            escolhido</strong> (Anthropic, OpenAI ou a URL que você configurar). Nenhum outro
            servidor a recebe.
          </li>
          <li>
            O conteúdo das reuniões é processado pelo provedor de IA escolhido, segundo os termos
            e a política de privacidade <em>desse provedor</em>.
          </li>
          <li>
            Para apagar tudo, limpe os dados do site no navegador (ou o <em>localStorage</em> de{' '}
            <code>movits.github.io</code>).
          </li>
        </ul>
        <p className="campo-dica">
          Recomendações: não use o app em computadores compartilhados e prefira chaves dedicadas
          com limite de gasto configurado na conta do provedor.
        </p>
      </section>

      <section className="cartao-config">
        <h2>🤖 Conteúdo gerado por IA</h2>
        <p>
          Análises, votos, planos, números, orçamentos e prompts são{' '}
          <strong>gerados por modelos de IA e podem conter erros ou invenções</strong>. Nada aqui é
          aconselhamento financeiro, jurídico ou de investimento. Valide números, prazos e decisões
          de forma independente — de preferência com profissionais de verdade — antes de investir
          tempo ou dinheiro.
        </p>
      </section>

      <section className="cartao-config">
        <h2>💸 Custos</h2>
        <p>
          O app é gratuito e de código aberto. O que custa é o consumo da <em>sua</em> chave de API,
          cobrado pelo provedor. A tela inicial mostra a estimativa de chamadas de cada
          configuração, e o <strong>modo demonstração</strong> permite conhecer tudo sem gastar
          nada.
        </p>
      </section>

      <section className="cartao-config">
        <h2>📜 Licença</h2>
        <p>
          Código aberto sob a <strong>licença MIT</strong> — sem garantias de qualquer tipo.{' '}
          <a href="https://github.com/Movits/Board_of_Directors" target="_blank" rel="noreferrer">
            Código-fonte no GitHub
          </a>
          .
        </p>
      </section>
    </div>
  )
}
