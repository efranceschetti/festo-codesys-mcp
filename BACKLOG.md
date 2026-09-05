# BACKLOG — festo-codesys-mcp

> Fila deste repositório (regra 02-workflow: cada repo tem o seu BACKLOG). Itens movidos do
> `~/.claude/BACKLOG.md` em 2026-09-05 — estavam na oficina por engano.

## auditoria de vazamento (15/08)

- [ ] 🔵 **O blob antigo do manual ainda responde por SHA direto no GitHub.** Medido logo após
      o force-push: `gh api .../git/blobs/11d96e94af5b…` devolve os 105.789 caracteres. É
      comportamento normal — objeto órfão fica acessível até o GC do GitHub, e **só para quem já
      tiver o SHA**. Não aparece em busca, listagem, clone ou histórico. Para eliminar de vez:
      abrir ticket no GitHub Support pedindo o GC do repositório
      (`efranceschetti/festo-codesys-mcp`), citando remoção de material de terceiro.
- [ ] 🔵 **`IEC61131_10.xsd` / `IEC61131_10_Example.xml`** (116 KB, `author="TF10"`) — artefatos
      normativos IEC/PLCopen embutidos sem atribuição. Conferir os termos de redistribuição (podem
      ser permitidos); se não, referenciar por URL ou dar NOTICE.
- [ ] 🔵 **`NOTICE.md` cobre só software MIT** — sem seção para material de referência derivado de
      manual de fabricante. Adicionar.
- [ ] 🔵 **Não auditado:** o tarball publicado no **npm** (só o git foi auditado; o `files:` do
      package.json pode incluir coisa diferente) e os termos do IEC. 7 dos 20 manuais foram
      checados só por padrão — mas o marcador `<!-- Page N -->` só aparece no `festo-point-to-point.md`
      no repo inteiro.
