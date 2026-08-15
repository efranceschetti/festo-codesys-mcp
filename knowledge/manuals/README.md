# Manuals Knowledge Base

> Notes **written by you** about the hardware you work with. Not a place for vendor PDFs.

## ⚠️ Do not transcribe vendor manuals here

This directory is indexed and shipped in a **public** repository. Vendor documentation —
Festo, CODESYS, Fagor, Beckhoff, IEC/PLCopen — is copyrighted, and most of it carries an
explicit clause against redistribution. Festo's own manuals state that *"duplication or
reprinting… distribution to third parties can only be made with the express consent of
Festo SE & Co. KG"*. Converting a PDF to Markdown does not change any of that: it is the
same text, redistributed.

A file here that mirrors a manual chapter by chapter — especially one carrying page
markers like `<!-- Page 12 -->` — is a transcription, not a note. It does not belong in
this repo.

## What to write instead

Write **your own reference**: what you measured, what bit you had to set, which error code
meant what on the bench, the sequence that actually worked. Cite the manual as a source
(vendor, document, version, date) so a reader can go find the original.

`knowledge/festo/festo-ptp-reference.md` is the shape to copy — it summarises tested
library versions and attributes them to the official Festo example, without shipping it.

Rule of thumb: **could the vendor publish this page as their own?** If yes, it is a
transcription — cite it instead.

## How the index works

1. Write your `.md` file in this directory
2. The server **auto-discovers** every `.md` here (BM25 index, rebuilt on change)
3. Reach it with `plc_knowledge`, action `search` or `list_manuals`

## File naming

Lowercase with hyphens, descriptive — `festo-cpx-e-notes.md`, `hw-cmmt-servo.md`,
`ethercat-esi-guide.md`.

## Writing tips

- Lead with what is hard to rediscover: parameter values, state transitions, error codes
- Keep tables in Markdown so they stay queryable
- Structure by **the question you had**, not by the vendor's chapter order — that is both
  more useful and the clearest sign the text is yours
- Use `iecst` fenced blocks for code
