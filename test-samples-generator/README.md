# Test Samples Generator

Gera um corpus de documentos **limpos e maliciosos** para testar o
[Document Gatekeeper](../document-gatekeeper-poc) — sem depender de arquivos
externos, tudo é sintetizado em tempo de execução.

## Uso

```bash
npm install
npm run generate
```

Os arquivos são escritos em `./test-samples/`. O script é idempotente:
pode rodar quantas vezes quiser.

## Corpus gerado

| Arquivo | Vetor de ataque | Resultado esperado no Gatekeeper |
|---|---|---|
| `01-clean-invoice.pdf` | Nenhum (controle positivo) | **ALLOW / 0** |
| `02-hidden-white-zero-font.pdf` | Texto branco 0.1pt + texto fora da MediaBox (`x:-300, y:-300`) | **BLOCK / 100** — `PDF_MICRO_FONT_TEXT`, `PDF_OFF_CANVAS_TEXT`, `INJ_SYSTEM_OVERRIDE`, `FRAUD_DECISION_MANIPULATION` |
| `03-poisoned-metadata.pdf` | `<\|im_start\|>` / `<\|im_end\|>` em `Author`, exfiltração por imagem markdown em `Subject` | **BLOCK / 100** — `INJ_DELIMITER_SMUGGLING`, `INJ_SYSTEM_OVERRIDE`, `EXFIL_MARKDOWN_IMAGE` |
| `04-unicode-smuggling.pdf` | Zero-width spaces / joiners / word joiners (`U+200B`, `U+200C`, `U+200D`, `U+2060`) | **BLOCK / 100** — `UNICODE_ASCII_SMUGGLING` |
| `05-visual-and-exif-attack.jpg` | `[INST] ... [/INST]` em cinza quase branco (`#f2f2f2`) + EXIF `ImageDescription`/`Artist` malicioso | **BLOCK / 100** — `IMG_LOW_CONTRAST_HIDDEN_TEXT`, `INJ_DELIMITER_SMUGGLING`, `INJ_SYSTEM_OVERRIDE`, `INJ_PERSONA_HIJACK`, `FRAUD_DECISION_MANIPULATION` |

## Notas de implementação

- **Unicode invisível em PDF:** os `StandardFonts` do `pdf-lib` usam codificação
  WinAnsi, que rejeita code points como `U+200B`. O gerador tenta `drawText()`
  primeiro e, se a codificação falhar, injeta o payload via:
  1. sequência de marked content `/Span` com `/ActualText` (UTF-16BE) no content
     stream; e
  2. dicionário `/Info` (`Subject` / `Keywords`), também em UTF-16BE.

  Ambos são mecanismos nativos do PDF e continuam sendo lidos por extratores
  (e pela camada L2/L5 do gatekeeper).

- **Texto fora da página (sample 02):** o `pdfjs` remove silenciosamente do
  `getTextContent()` itens posicionados fora da MediaBox. Por isso o gatekeeper
  também inspeciona as matrizes `setTextMatrix` do `getOperatorList()` — este
  sample existe justamente para cobrir esse caso.

- **Baixo contraste (sample 05):** o Tesseract não lê `#f2f2f2` sobre branco em
  um passe normal. O gatekeeper roda um segundo passe com
  `sharp().grayscale().normalize()`, que recupera o texto escondido e dispara
  `IMG_LOW_CONTRAST_HIDDEN_TEXT`.

## Testar contra o gatekeeper

Com o backend rodando em `http://127.0.0.1:3001`:

```bash
curl -X POST http://127.0.0.1:3001/api/v1/analyze \
  -F "file=@test-samples/02-hidden-white-zero-font.pdf;type=application/pdf"
```

Ou simplesmente arraste os arquivos para a dashboard em `http://localhost:5173`.
