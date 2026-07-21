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
- Framework detection for root and bounded workspace manifests: complete
- Framework detection for additional ecosystems: planned

## Phase 3: Repository Health Metrics

Goal: Add objective activity and maintenance metrics that help users evaluate whether a repository is active and current.

- Repository health metrics
- Activity metrics
- Release history
- Commit activity

Status:

- Repository activity summary: complete
- Commit activity trends, initial 12-week version: complete
- Issue backlog age / oldest open issue: deferred
- Broader repository health metrics: deferred
- Release history: deferred
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
- Pull request merge and resolution metrics: deferred
- Maintainer responsiveness, on-demand review timing, affiliation coverage,
  and issue response metrics: complete
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
summary with open pull request activity. Review timing, review coverage,
project-member review coverage, and the number of different project-member
reviewers are available on demand for a bounded sample, with an in-card
calculation explanation. Repository Activity also provides on-demand issue
response coverage and timing for a bounded sample of recent closed issues. It
also provides framework signals from supported dependencies and package names
in a repository's root or bounded workspace manifests, plus a 12-week commit
activity trend. The
pull request summary keeps merge and first-time contributor metrics deferred
until they can provide a clearer signal with a more efficient analysis.
Issue backlog age, broader repository health metrics, and release history are
also deferred while the current cards remain focused.
The next recommended work is deeper maintainer responsiveness analysis.
Framework detection for additional ecosystems remains planned, while release
history remains deferred.
