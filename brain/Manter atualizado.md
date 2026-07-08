---
tipo: guia
tags: [guia]
---
# Manter este vault atualizado (auto-sync)

Este vault tem duas fontes de conteúdo:

- **Notas do projeto** (conselheiros, conceitos, arquitetura, decisões) — são
  mantidas no repositório e mudam quando o projeto evolui.
- **Atas de reunião** (`reuniões/`) — você exporta do app pelo botão
  **🧠 Exportar ata (Obsidian)**, uma por reunião. Isso é sempre manual.

Para as **notas do projeto** chegarem sozinhas até aqui, sem digitar git, use o
plugin **Obsidian Git** com pull automático. Configuração única:

## 1. Ter o git instalado
Windows/Mac: baixe em [git-scm.com](https://git-scm.com). (No Mac costuma já
vir instalado.)

## 2. Clonar o repositório
Numa pasta à sua escolha, no terminal:

```bash
git clone https://github.com/Movits/Board_of_Directors.git
```

Isso cria a pasta `Board_of_Directors/`, com `brain/` dentro. **Este `brain/` é
o vault** — pode apagar a versão antiga que você tinha baixado por zip (copie
antes as atas de `reuniões/`, se já tiver alguma).

## 3. Abrir como vault
No Obsidian: **Open folder as vault** → selecione `Board_of_Directors/brain`.

## 4. Instalar o plugin Obsidian Git
Configurações → **Plugins da comunidade** → desative o *Modo restrito* →
**Procurar** → `Obsidian Git` (autor Vinzent) → **Instalar** → **Ativar**.

## 5. Ligar o pull automático
Configurações → **Obsidian Git**:
- **Puxar (pull) ao iniciar** → *ligado* (assim, toda vez que você abre o
  Obsidian, ele traz as novidades);
- **Intervalo de pull automático (minutos)** → opcional, ex.: `10`, se quiser
  atualizar de tempos em tempos com o Obsidian aberto;
- **Backup/commit automático** → *desligado* (0). Você não escreve de volta;
  isso evita conflitos.

Pronto. A partir daí, o que for atualizado nas notas do projeto aparece aqui
sozinho quando você abre o Obsidian.

## Sobre as atas
Continue soltando os `.md` exportados em `reuniões/`. O pull **não apaga**
arquivos que só existem no seu lado, então suas atas ficam intactas. Se um dia
editar uma nota do projeto por conta própria e der conflito no pull, é só pedir
ajuda.

## Relacionado
[[Início]] · [[Sobre esta pasta]]
