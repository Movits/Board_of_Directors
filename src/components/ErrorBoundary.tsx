import { Component, type CSSProperties, type ErrorInfo, type ReactNode } from 'react'
import { exportaDadosLocais, limpaTudo } from '../lib/storage'

// Estilos INLINE de propósito: se o app quebrou, o CSS pode nem ter carregado.
// Fundo escuro próprio garante legibilidade independente do tema da página.
const estilos: Record<string, CSSProperties> = {
  tela: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#0d1117',
    color: '#e6edf3',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box',
  },
  cartao: {
    maxWidth: '480px',
    width: '100%',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '32px 28px',
    textAlign: 'center',
  },
  titulo: {
    margin: '0 0 12px',
    fontSize: '1.35rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  texto: {
    margin: '0 0 8px',
    fontSize: '0.95rem',
    lineHeight: 1.5,
    color: '#c9d1d9',
  },
  detalhe: {
    margin: '0 0 24px',
    fontSize: '0.8rem',
    color: '#8b949e',
    wordBreak: 'break-word',
  },
  acoes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  botao: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #30363d',
    background: '#21262d',
    color: '#e6edf3',
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  botaoPrincipal: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid transparent',
    background: '#2ea043',
    color: '#ffffff',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  botaoPerigo: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #f8514933',
    background: 'transparent',
    color: '#f85149',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
}

interface Props {
  children: ReactNode
}

interface State {
  erro: Error | null
}

/** Rede de segurança global: um registro torto no localStorage (ou qualquer
 *  erro de render) não pode derrubar o SPA em tela branca. O fallback oferece
 *  recarregar, exportar os dados bod.* e, em último caso, limpar tudo. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { erro: null }

  static getDerivedStateFromError(erro: Error): State {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary capturou um erro de render:', erro, info.componentStack)
  }

  private recarregar = (): void => {
    location.reload()
  }

  private exportarDados = (): void => {
    const blob = new Blob([exportaDadosLocais()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const ancora = document.createElement('a')
    ancora.href = url
    ancora.download = `board-of-directors-dados-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(ancora)
    ancora.click()
    ancora.remove()
    URL.revokeObjectURL(url)
  }

  private limparERecarregar = (): void => {
    const confirmado = window.confirm(
      'Isso apaga TUDO deste app neste navegador: projetos, reuniões, feedback, personas e chaves de API. ' +
        'A ação não pode ser desfeita. Se quiser guardar algo, exporte seus dados antes. Apagar mesmo assim?',
    )
    if (!confirmado) return
    limpaTudo()
    location.reload()
  }

  render(): ReactNode {
    const { erro } = this.state
    if (erro === null) return this.props.children

    return (
      <div style={estilos.tela}>
        <div style={estilos.cartao} role="alert">
          <h1 style={estilos.titulo}>Algo quebrou ao exibir esta tela</h1>
          <p style={estilos.texto}>
            Seus projetos e reuniões continuam salvos neste navegador. Recarregar costuma resolver;
            se não resolver, exporte seus dados antes de limpar.
          </p>
          <p style={estilos.detalhe}>{erro.message || String(erro)}</p>
          <div style={estilos.acoes}>
            <button style={estilos.botaoPrincipal} onClick={this.recarregar}>
              Recarregar a página
            </button>
            <button style={estilos.botao} onClick={this.exportarDados}>
              Exportar meus dados (JSON)
            </button>
            <button style={estilos.botaoPerigo} onClick={this.limparERecarregar}>
              Limpar dados e recarregar
            </button>
          </div>
        </div>
      </div>
    )
  }
}
