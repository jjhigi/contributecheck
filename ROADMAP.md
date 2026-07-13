# Roadmap

ContributeCheck will be built incrementally. Each milestone should add one clear layer of contribution-focused analysis without turning the project into a general GitHub search replacement.

## Phase 1: Repository Basics

Goal: Let a user enter a repository and see basic public repository information.

- Landing page
- Repository lookup
- Repository details

Status:

- Landing page: complete
- Repository lookup: complete
- Repository details: complete

## Phase 2: Contribution Readiness Signals

Goal: Identify basic signals that help developers understand whether a repository is prepared for contributors.

- Framework detection
- Community health files
- `CONTRIBUTING.md` detection
- Code of Conduct detection
- Issue template detection
- Pull request template detection
- Good First Issue detection

Status:

- Community health files: complete
- Good First Issue detection: complete
- Framework detection, initial root-manifest version: complete
- Framework detection for monorepos and additional ecosystems: planned

## Phase 3: Repository Health Metrics

Goal: Add objective activity and maintenance metrics that help users evaluate whether a repository is active and current.

- Repository health metrics
- Activity metrics
- Release history
- Commit activity

Status:

- Repository activity summary: complete
- Commit activity trends, initial 12-week version: complete
- Broader repository health metrics: planned
- Release history: planned
- Broader commit activity analysis: planned

## Phase 4: Contribution Workflow Analysis

Goal: Analyze pull request and contributor patterns to estimate how approachable the project is for outside contributors.

- Pull request activity summary
- Pull request merge activity
- Pull request resolution time
- Pull request analysis
- Maintainer responsiveness
- First-time contributor metrics

Status:

- Pull request activity summary: complete
- Pull request merge activity, initial 90-day version: complete
- Pull request resolution time, initial 90-day sample: complete
- Maintainer responsiveness, initial review timing and coverage: complete
- Deeper pull request analysis: planned
- Broader maintainer responsiveness analysis: planned
- First-time contributor metrics: planned

## Phase 5: Scoring And Recommendations

Goal: Combine measured signals into clear contribution-focused summaries and recommendations.

- Repository scoring
- Repository recommendations
- Search and filtering

Status:

- Planned

## Current Direction

The current implementation provides repository details, community health file
signals, good first issue detection, and an initial pull request health
summary with open, merged, closed, and resolution-time activity. It also
provides an initial framework signal for supported direct dependencies in a
repository's root `package.json`, plus a 12-week commit activity trend. The
pull request summary also includes a bounded first-review responsiveness
sample with outside-review coverage. The next recommended work is deeper
maintainer responsiveness analysis and first-time contributor metrics.
Framework detection for monorepos and
additional ecosystems remains planned, while release history is optional
future work.
