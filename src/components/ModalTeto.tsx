import { usarFocusTrap } from '../lib/focusTrap'

interface Props {
  /** Texto já formatado da estimativa de custo (ex.: "≈ US$ 6,20–9,30"). */
  estimativaTexto: string
  aoConfirmar: () => void
  aoCancelar: () => void
}

/** Confirmação de teto: aparece só quando a estimativa MÁXIMA da reunião passa
 *  do teto de gasto definido em Configurações. Não bloqueia — dá ao usuário a
 *  chance de confirmar (ou cancelar e ajustar o modelo/rodadas antes). */
export function ModalTeto({ estimativaTexto, aoConfirmar, aoCancelar }: Props) {
  // Gestão de foco unificada: prende o Tab, fecha no Esc e trava o scroll.
  const modalRef = usarFocusTrap<HTMLDivElement>(true, aoCancelar)

  return (
    <div className="cc-overlay" onClick={aoCancelar}>
      <div
        ref={modalRef}
        className="cc-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar gasto acima do teto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="cc-cabecalho">
          <h2>⚠️ Gasto acima do seu teto</h2>
          <button className="documento-fechar" onClick={aoCancelar}>
            ✕ Fechar
          </button>
        </header>

        <p className="cc-intro">
          Esta reunião pode custar <strong>{estimativaTexto}</strong>, acima do seu teto.
          Confirmar?
        </p>
        <p className="campo-dica">
          Você pode ajustar o teto em Configurações, ou cancelar e reduzir as rodadas de debate, os
          anexos ou trocar por um modelo mais barato. Dica:{' '}
          <strong>🖥 Rodar de graça no seu chat de IA</strong> não tem custo.
        </p>

        <div className="cc-acoes" style={{ gap: 10, flexWrap: 'wrap' }}>
          <button className="botao-principal" onClick={aoConfirmar}>
            Confirmar mesmo assim
          </button>
          <button className="botao-secundario" onClick={aoCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
