# ContributeCheck

ContributeCheck helps developers answer one question:

> Is this repository a good place for me to contribute?

It is a React, TypeScript, and Vite application that analyzes public GitHub repository data and presents contribution-focused signals in a simple interface.

## Why It Exists

GitHub is great for finding repositories, but deciding whether a repository is a good contribution opportunity often requires checking issues, pull requests, contribution files, activity, releases, and maintainer behavior.

ContributeCheck is not meant to replace GitHub search. It is meant to make contribution readiness easier to evaluate from objective public data.

## Current Features

- Clean landing page for repository analysis.
- GitHub repository lookup by `owner/repository`.
- GitHub repository lookup by full repository URL.
- Input validation and normalization.
- Loading and error states.
- Basic repository details:
  - repository name
  - owner
  - description
  - primary language
  - stars
  - forks
  - open issue count
  - last updated date
  - repository link
- Community health file indicators:
  - `CONTRIBUTING.md`
  - Code of Conduct
  - issue templates
  - pull request template
- Good first issue detection:
  - shows up to 5 open issues labeled `good first issue`
  - links each issue to GitHub
- Pull request activity summary:
  - shows the total number of open pull requests
  - shows the age of the oldest open pull request
  - lets users request median time to first outside review for a bounded sample of recent pull requests
  - lets users request outside review coverage for that bounded pull request sample
  - explains how the review metrics are calculated
  - lets users request median time to first repository-affiliated review
  - lets users request repository-affiliated review coverage
  - links to the full open pull request list on GitHub
- Initial framework detection:
  - checks the repository's root `package.json`
  - detects direct dependencies for Next.js, React, Vue, Angular, and Svelte
- Repository activity summary:
  - shows the latest commit date
  - shows the total commits from the last 4 weeks
  - shows a 12-week commit activity chart
  - links to the full commit history on GitHub

## Tech Stack

- React
- TypeScript
- Vite
- GitHub REST API
- Plain CSS

No backend is currently used.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local Vite URL shown in your terminal, usually:

```text
http://localhost:5173
```

## Available Scripts

Run the development server:

```bash
npm run dev
```

Run linting:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Direction

ContributeCheck will be built incrementally, one small feature at a time. The project should remain simple, professional, and data-driven.

Future analysis should prefer measurable GitHub data over subjective opinions whenever possible.

For more detail, see:

- [Project Vision](PROJECT_VISION.md)
- [Roadmap](ROADMAP.md)
