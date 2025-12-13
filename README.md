## Integrative Dashboard (IDB)

The Integrative Dashboard (IDB) is an offline, data-driven research analytics app built with React, Vite, TypeScript, Tailwind CSS, and the shadcn/ui component system. It uses locally cached OpenAlex data to keep navigation fast and available without live API calls.

### What you can do
- Explore publications and citations by topic, institution, and member across years.
- Inspect co-author networks and follow out to publication DOIs/URLs.
- Filter instantly with precomputed tables (no waiting on remote queries).

## Prerequisites
- Node.js 18+ (Node 20 recommended)
- npm (bundled with Node.js)

Check your versions:
```bash
node -v
npm -v
```

## Setup
1) Clone the repository and enter it:
```bash
git clone <repo-url> idb-template
cd idb-template
```
2) Install dependencies:
```bash
npm install
```

## Run the app (development)
Start the dev server with hot reload:
```bash
npm run dev
```
Vite will print the local URL (default `http://localhost:8080`).

## Build for production
Create an optimized static build:
```bash
npm run build
```
Preview the production build locally:
```bash
npm run preview
```

## Data and refresh workflow (overview)
- Source authors live in `data/config/authors-source.csv`.
- Node scripts cache works per author and generate CSVs for works, topics, institutions, and member metrics.
- During the build step, those CSVs become generated TypeScript tables that the app loads at runtime.

Refresh everything with one command:
```bash
npm run refresh:data
```
This runs, in order: `npm run update:authors:openalex`, `npm run generate:authors`, `npm run clean:author-cache`, `npm run cache:openalex-works`, `npm run generate:works`.

## Project structure (high level)
- `src/` - React application source
  - `src/pages/` - top-level pages (dashboard, authors, topics, institutions, publications, about)
  - `src/components/` - reusable UI and layout
- `data/` - configuration and input CSV (author list in `data/config/authors-source.csv`)
- `scripts/` - Node scripts for downloading, caching, and transforming bibliographic data
- `public/` - static assets copied into the final build

## Useful npm scripts
- `npm run dev` - start the development server
- `npm run build` - create a production build in `dist`
- `npm run preview` - preview the production build locally
- `npm run lint` - run eslint
- `npm run refresh:data` - regenerate all derived data tables from source CSV and cached works

## Documentation
- See [docs/README.md](https://github.com/digitalgeosciences/idb/tree/main/docs) for config schemas (authors-source, siteinfo, announcement, blacklist), blacklisting examples, full data refresh details, deployment notes (GitHub Pages/static), and troubleshooting.

## Citation
```
Alqubalee, A. (2025). Integrative Dashboard (IDB) (v0.1.1). Zenodo. https://doi.org/10.5281/zenodo.17918877
```

## Questions and support
For questions, feedback, or suggestions about the dashboard or its data pipeline, contact the IDB maintainers at `info@digitalgeosciences.com`.
