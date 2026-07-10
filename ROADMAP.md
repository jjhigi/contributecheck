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
- Repository details: next recommended milestone

## Phase 2: Contribution Readiness Signals

Goal: Identify basic signals that help developers understand whether a repository is prepared for contributors.

- Framework detection
- Community health files
- `CONTRIBUTING.md` detection
- Code of Conduct detection
- Issue template detection
- Pull request template detection
- Good First Issue detection

## Phase 3: Repository Health Metrics

Goal: Add objective activity and maintenance metrics that help users evaluate whether a repository is active and current.

- Repository health metrics
- Activity metrics
- Release history
- Commit activity

## Phase 4: Contribution Workflow Analysis

Goal: Analyze pull request and contributor patterns to estimate how approachable the project is for outside contributors.

- Pull request analysis
- Maintainer responsiveness
- First-time contributor metrics

## Phase 5: Scoring And Recommendations

Goal: Combine measured signals into clear contribution-focused summaries and recommendations.

- Repository scoring
- Repository recommendations
- Search and filtering

## Development Notes

- Implement only one feature at a time.
- Prefer measurable GitHub data over subjective judgment.
- Keep scoring transparent when it is introduced.
- Avoid backend infrastructure until a feature explicitly requires it.
- Do not implement future roadmap items without an explicit request.
