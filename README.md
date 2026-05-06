# UODO MCP - Decyzje Prezesa UODO

[![npm version](https://img.shields.io/npm/v/@thescalablelegalmarketer/uodo-mcp)](https://www.npmjs.com/package/@thescalablelegalmarketer/uodo-mcp)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![MCP](https://img.shields.io/badge/MCP-compatible-green)](https://modelcontextprotocol.io)

An MCP server that connects Claude (and other AI clients) to [orzeczenia.uodo.gov.pl](https://orzeczenia.uodo.gov.pl) - the official portal of decisions issued by the Polish Data Protection Authority (*Prezes Urzędu Ochrony Danych Osobowych*).

> **Who is this for?** Polish lawyers, Data Protection Officers, legal researchers, and compliance teams who want to search and analyze UODO enforcement decisions directly inside Claude, Cursor, or any MCP-compatible AI client. No API key required - the portal is publicly accessible.

---

## Features

- **Full-text search** across UODO decisions - GDPR fines, warnings, reprimands, and binding orders
- **Filter by** case number (`DKN`, `DS`, `DKE`, …) and date range
- **Retrieve full decisions** - metadata, operative part (*sentencja/decyzja*), and complete reasoning (*uzasadnienie*)
- **Rich metadata** - subject categories (*tematy*), legal references (GDPR articles, Polish acts, case law), issuing President, publication status
- **Local file archive** - in stdio mode, saves each retrieved decision as a `.md` file for offline reference
- **In-memory cache** (15 min TTL) to avoid redundant API calls
- **Timeout protection** - 15-second abort signal on all API requests
- **Dual transport** - stdio for local Claude Desktop use, HTTP for remote/hosted deployment

---

## Dla polskich prawników i IOD-owców

UODO MCP pozwala Claude'owi przeszukiwać bazę decyzji Prezesa UODO i analizować je bezpośrednio w rozmowie z Claude w Claude Desktop. 

### Jak zacząć

**Krok 1.** Zainstaluj [Node.js](https://nodejs.org) (wersja 20 lub nowsza). To jedyna techniczna rzecz do zrobienia.

**Krok 2.** Otwórz plik konfiguracyjny Claude Desktop:
- Windows: naciśnij `Win + R`, wpisz `%APPDATA%\Claude` i otwórz plik `claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Krok 3.** Dodaj poniższy wpis do sekcji `mcpServers` (jeśli plik jest pusty, wklej całość):

```json
{
  "mcpServers": {
    "UODO": {
      "command": "npx",
      "args": ["-y", "@thescalablelegalmarketer/uodo-mcp"]
    }
  }
}
```

**Krok 4.** Zapisz plik i zrestartuj Claude Desktop. Przy pierwszym uruchomieniu Claude automatycznie pobierze serwer.

### Przykładowe zapytania

```
Wyszukaj w bazie UODO 5 decyzji dotyczących niezgłoszenia naruszenia
ochrony danych w terminie 72 godzin. Dla każdej podaj:
- sygnaturę i datę decyzji
- sentencję (dosłowny cytat)
- wysokość nałożonej kary
- główny argument Prezesa UODO
```

```
Znajdź decyzje UODO dotyczące sektora mieszkaniowego (wspólnoty
mieszkaniowe, spółdzielnie). Jakie naruszenia RODO były najczęstsze
i jakie kary były nakładane?
```

```
Pobierz decyzję DKN.5131.16.2025 i przeanalizuj, jakie kryteria
Prezes UODO zastosował przy ustalaniu wysokości kary pieniężnej.
```

---

## Installation

### Claude Desktop (recommended)

**Prerequisites:** [Node.js 20+](https://nodejs.org) must be installed on your machine.

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "UODO": {
      "command": "npx",
      "args": ["-y", "@thescalablelegalmarketer/uodo-mcp"]
    }
  }
}
```

Restart Claude Desktop. The server starts automatically - no separate process needed.

> **Config file location:**
> - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
> - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Remote HTTP (self-hosted)

```json
{
  "mcpServers": {
    "UODO": {
      "url": "https://your-domain.com/mcp"
    }
  }
}
```

See [Deployment](#deployment) for instructions on hosting your own instance.

### From source (development)

```bash
git clone https://github.com/pawelojdowski/uodo-mcp
cd uodo-mcp
npm install
npm run build
```

```json
{
  "mcpServers": {
    "UODO": {
      "command": "node",
      "args": ["C:\\PATH\\TO\\uodo-mcp\\dist\\index.js"]
    }
  }
}
```

**Environment variable** (stdio mode only):
- `UODO_OUTPUT_DIR` - directory for saved `.md` decision files (default: `~/Documents/uodo-orzeczenia`)

---

## Tools

### `uodo_search_decisions`

Search for UODO decisions. Results sorted by date (newest first). All parameters optional.

| Parameter | Type | Description |
|-----------|------|-------------|
| `query` | string | Full-text search in decision content, e.g. `kara pieniężna naruszenie` |
| `caseNumber` | string | Fragment of case number, e.g. `DKN.5131` or `DS.523` |
| `dateFrom` | string | Format `YYYY-MM-DD` - announcement date from |
| `dateTo` | string | Format `YYYY-MM-DD` - announcement date to |
| `count` | number | Max 100, default 20 |
| `from` | number | Pagination offset, starting from 0 |

**Tip:** Case numbers follow patterns like `DKN.5131.X.YYYY` (penalty proceedings), `DS.523.X.YYYY` (complaint proceedings), `DKE.561.X.YYYY` (inspection proceedings). Use a prefix like `DKN.5131` to find all decisions from a given proceeding type.

---

### `uodo_get_decision`

Retrieve a full decision by ID. Returns metadata, verbatim operative part (*sentencja/decyzja*), and full reasoning (*uzasadnienie*). In stdio mode, also saves a `.md` file to `UODO_OUTPUT_DIR`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | **Required.** Decision ID from `uodo_search_decisions` results, e.g. `PublicDocument-20260407-000000-000-abc123` |

---

### `uodo_list_search_fields`

Returns a list of available search fields with their data types. Use this to understand what filters can be applied when building advanced queries.

---

## Example prompt

```
Use UODO MCP to find decisions from 2024–2025 where the President of UODO
imposed a fine for failure to implement appropriate technical and
organisational measures (Art. 32 GDPR).

For each decision call uodo_get_decision and provide:
1. Case number and date
2. Operative part - quote verbatim
3. Fine amount
4. Main legal reasoning from the uzasadnienie
5. Which GDPR articles were cited as the basis
```

---

## Development

```bash
npm run dev          # stdio server (TypeScript, no build needed)
npm run dev:http     # HTTP server on port 3000
npm run build        # type-check + esbuild bundle → dist/
npm run start        # run compiled stdio bundle
npm run start:http   # run compiled HTTP server
```

## Deployment

Build and run with Docker:

```bash
docker build -t uodo-mcp .
docker run -p 3000:3000 uodo-mcp
```

MCP endpoint: `http://localhost:3000/mcp`  
Health check: `http://localhost:3000/health`

Deploy to Railway, Render, or Fly.io using the included `Dockerfile`.

---

## Project structure

```
uodo-mcp/
├── src/
│   ├── types.ts        ← UODO API TypeScript interfaces
│   ├── api.ts          ← UODO API client + in-memory cache
│   ├── format.ts       ← HTML parsing, text formatting, file saving
│   ├── server.ts       ← createMcpServer() factory - tool registration
│   ├── index.ts        ← stdio entry point
│   └── http-server.ts  ← HTTP entry point + /health endpoint
├── dist/               ← build output (gitignored)
│   ├── index.js        ← stdio bundle (with #!/usr/bin/env node shebang)
│   └── http-server.js  ← HTTP bundle
├── build.mjs           ← esbuild config (two outputs in parallel)
├── tsconfig.json       ← type-check only (noEmit), bundling via esbuild
├── server.json         ← MCP marketplace manifest
├── Dockerfile          ← multi-stage build → image with http-server.js
└── package.json
```

---

## Known limitations

- **OR search term limit** - when using comma-separated terms for OR search, very broad queries (many terms) may hit URL length limits; split into separate calls if needed
- **Null title/keywords in search** - the `title_pl` and `keywords` fields in search results are currently unpopulated by the UODO portal index; full metadata (including rich subject categories) is only available via `uodo_get_decision`
- **In-memory cache** - 15 min TTL, resets on process restart
- **HTTP mode** - does not save `.md` files (no access to the user's file system)

---

## About UODO

The *Urząd Ochrony Danych Osobowych* (Office for Personal Data Protection) is the Polish supervisory authority under GDPR Art. 51. The President of UODO (*Prezes UODO*) issues binding decisions in proceedings concerning personal data protection violations, including administrative fines under GDPR Art. 83, warnings (Art. 58(2)(a)), reprimands (Art. 58(2)(b)), and orders to bring processing into compliance.

The portal [orzeczenia.uodo.gov.pl](https://orzeczenia.uodo.gov.pl) publishes the full text of these decisions. The API is publicly accessible without authentication.

**Disclaimer:** This tool is intended for legal research only and is not a substitute for professional legal advice. Always verify citations against primary sources before relying on them in legal proceedings or compliance documentation.

---

## License

Apache-2.0 © [Paweł Ojdowski](https://afterlegal.pl/)
