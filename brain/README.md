# 🧠 Second brain do Board of Directors

Esta pasta é um **vault do Obsidian**: o cérebro do projeto, com as notas
conectadas por [[wikilinks]] — conselheiros, conceitos, arquitetura, decisões e
as atas das reuniões.

## Como abrir

1. Instale o [Obsidian](https://obsidian.md).
2. **Open folder as vault** → selecione esta pasta (`brain/`).
3. Abra a nota **Início** e explore pelo grafo (Ctrl/Cmd+G).

A configuração local do Obsidian (`brain/.obsidian/`) fica fora do git — cada
máquina tem a sua.

## Como as reuniões entram aqui

No app, toda reunião concluída tem o botão **🧠 Exportar ata (Obsidian)** (no
painel do veredito e no Histórico). Ele baixa um `.md` com frontmatter e
wikilinks prontos — solte o arquivo em [`reuniões/`](reuniões) e a ata se
conecta sozinha às notas dos conselheiros no grafo.

## Estrutura

| Pasta | O que tem |
|---|---|
| `conselho/` | Uma nota por conselheiro: persona, vieses e o que cada um disse na autoavaliação |
| `conceitos/` | Como a reunião funciona: debate, consenso pleno, votos, entregáveis… |
| `arquitetura/` | Como o app é construído: orquestrador, transporte, armazenamento |
| `decisões/` | Registro de decisões do projeto, backlog e a ata da autoavaliação |
| `reuniões/` | Atas exportadas do app (uma por reunião) |
