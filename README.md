## Research Dashboard

This repository contains an offline, data‑driven dashboard for exploring research output and
collaboration patterns across programs, authors, topics, and institutions. The app is built with
React, Vite, TypeScript, Tailwind CSS, and the shadcn/ui component system.

All charts and tables are computed from local CSV and cached bibliographic data (no live API calls
are made at runtime), which makes the dashboard fast, reproducible, and suitable for offline use.


## Prerequisites

- Node.js 18 or newer (Node 20 recommended)
- npm (comes with Node.js)

You can verify your versions with:

```bash
node -v
npm -v
```


## Installation

1. Clone this repository and move into the project directory:

   ```bash
   git clone https://github.com/digitalgeosciences/dashboard3.git
   cd dashboard3
   ```

2. Install dependencies:

   ```bash
   npm install
   ```


## Running the dashboard (development)

Start a local development server with hot reloading:

```bash
npm run dev
```

By default Vite serves the app at `http://localhost:5173` (your terminal will confirm the exact
URL). Open that address in your browser to use the dashboard.


## Building for production

Create an optimized, static production build:

```bash
npm run build
```

The build output is written to the `dist` directory and can be hosted on any static file server.
Because the app uses a hash‑based router, it works well on simple static hosting providers.

To preview the production build locally:

```bash
npm run preview
```


## Data and refresh workflow

The dashboard reads its data from CSV files and precomputed tables generated from cached, open‑source
bibliographic data (for example, OpenAlex). The high‑level workflow is:

- Authors and their program affiliations are defined in CSV files under the `data` directory
  (for example, `data/authors.csv`, `data/affiliations.csv`).
- Node scripts under `scripts/` query and cache works for each author, then generate consolidated
  tables for works, topics, institutions, and per‑program impact.
- At startup, the dashboard loads these generated tables and uses them to compute the metrics shown
  in the UI (publications, citations, topics, institutions, per‑member output, and networks).

The main orchestration command for refreshing data is:

```bash
npm run refresh:data
```

This runs, in sequence:

- `npm run generate:groups`
- `npm run update:authors:openalex`
- `npm run generate:authors`
- `npm run clean:author-cache`
- `npm run cache:openalex-works`
- `npm run generate:works`

Many of these steps contact external data sources when they need to update the local cache, so they
require an active internet connection while they are running. Once the cache and tables are
generated, the dashboard itself runs fully offline.


## Project structure (high level)

- `src/` – React application source code
  - `src/pages/` – top‑level pages (program view, authors, topics, institutions, networks, about, etc.)
  - `src/components/` – reusable UI components and layout
  - `src/services/` – data loading and helper utilities
- `data/` – configuration and input CSV files for authors and affiliations
- `scripts/` – Node scripts for downloading, caching, and transforming bibliographic data
- `public/` – static assets copied as‑is into the final build


## Useful npm scripts

- `npm run dev` – start the development server
- `npm run build` – create a production build in `dist`
- `npm run preview` – locally preview the production build
- `npm run lint` – run eslint over the project
- `npm run refresh:data` – regenerate all derived data tables from source CSV and cached works


## Questions and support

For questions, feedback, or suggestions about this dashboard or its data pipeline, please contact
the Digital Geosciences team at `info@digitalgeosciences.com`.
