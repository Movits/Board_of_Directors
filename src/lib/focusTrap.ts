import { useEffect, useRef } from 'react'

/** Seletor dos elementos que podem receber foco dentro de um overlay. */
const SELETOR_FOCAVEL = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/** Verdadeiro quando o elemento está de fato visível (ocupa espaço na tela). */
function estaVisivel(el: HTMLElement): boolean {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length)
}

/**
 * Gestão de foco unificada para overlays (gaveta/modal/documento).
 *
 * Enquanto `aberto` for verdadeiro, o container referenciado:
 *  - guarda o elemento que tinha foco antes de abrir e o devolve ao fechar;
 *  - move o foco para o primeiro elemento focável (ou o próprio container);
 *  - prende o Tab / Shift+Tab dentro do container (foco em laço);
 *  - fecha no Esc, chamando `aoFechar` (dispensa listener próprio no componente);
 *  - trava o scroll do body (document.body.style.overflow).
 *
 * Retorna um ref que deve ser posto no elemento container do overlay.
 * Usa apenas APIs de browser + React, sem dependências externas.
 */
export function usarFocusTrap<T extends HTMLElement = HTMLElement>(
  aberto: boolean,
  aoFechar?: () => void,
) {
  const containerRef = useRef<T>(null)
  // Mantém a versão mais recente de aoFechar sem re-registrar os listeners.
  const aoFecharRef = useRef(aoFechar)
  aoFecharRef.current = aoFechar

  useEffect(() => {
    if (!aberto) return

    const container = containerRef.current
    // (a) Guarda quem tinha o foco antes de abrir, para devolver depois.
    const focoAnterior = document.activeElement as HTMLElement | null

    // (f) Trava o scroll do body enquanto o overlay está aberto.
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const listarFocaveis = (): HTMLElement[] =>
      container
        ? Array.from(container.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL)).filter(estaVisivel)
        : []

    // (b) Move o foco para o primeiro elemento focável (ou o container).
    const primeiroFocavel = listarFocaveis()[0]
    if (primeiroFocavel) {
      primeiroFocavel.focus()
    } else if (container) {
      container.tabIndex = -1
      container.focus()
    }

    const aoTeclar = (e: KeyboardEvent) => {
      // (d) Fecha no Esc.
      if (e.key === 'Escape') {
        e.preventDefault()
        aoFecharRef.current?.()
        return
      }
      // (c) Prende o Tab dentro do container.
      if (e.key !== 'Tab' || !container) return

      const focaveis = listarFocaveis()
      if (focaveis.length === 0) {
        e.preventDefault()
        container.focus()
        return
      }

      const primeiro = focaveis[0]
      const ultimo = focaveis[focaveis.length - 1]
      const ativo = document.activeElement

      if (e.shiftKey) {
        if (ativo === primeiro || !container.contains(ativo)) {
          e.preventDefault()
          ultimo.focus()
        }
      } else if (ativo === ultimo || !container.contains(ativo)) {
        e.preventDefault()
        primeiro.focus()
      }
    }

    document.addEventListener('keydown', aoTeclar, true)

    return () => {
      document.removeEventListener('keydown', aoTeclar, true)
      // (f) Devolve o scroll do body.
      document.body.style.overflow = overflowAnterior
      // (e) Devolve o foco ao elemento guardado.
      focoAnterior?.focus?.()
    }
  }, [aberto])

  return containerRef
}
