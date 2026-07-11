import { useState, type FormEvent } from 'react'
import './App.css'
import {
  fetchCommunityHealth,
  fetchCommitActivity,
  fetchFrameworkDetection,
  fetchGoodFirstIssues,
  fetchLatestCommit,
  fetchOpenPullRequests,
  fetchRepository,
  type CommunityHealth,
  type CommitActivity,
  type CommitActivityWeek,
  type FrameworkDetection,
  type GitHubRepository,
  type GoodFirstIssues,
  type PullRequestActivity,
  type RepositoryActivity,
  type RepositoryFetchResult,
} from './githubApi'
import { parseRepositoryInput } from './repositoryInput'

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success'
      repository: GitHubRepository
      frameworkDetection: FrameworkDetection
      communityHealth: CommunityHealth
      goodFirstIssues: GoodFirstIssues
      pullRequestActivity: PullRequestActivity
      repositoryActivity: RepositoryActivity
      commitActivity: CommitActivity
    }
  | { status: 'error'; message: string }

const numberFormatter = new Intl.NumberFormat('en-US')
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function App() {
  const [repositoryInput, setRepositoryInput] = useState('')
  const [lookupState, setLookupState] = useState<LookupState>({
    status: 'idle',
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedInput = parseRepositoryInput(repositoryInput)

    if (!parsedInput.ok) {
      setLookupState({ status: 'error', message: parsedInput.error })
      return
    }

    const { owner, repository } = parsedInput.value

    setRepositoryInput(`${owner}/${repository}`)
    setLookupState({ status: 'loading' })

    const repositoryResult = await fetchRepository(owner, repository)

    if (repositoryResult.status !== 'success') {
      setLookupState({
        status: 'error',
        message: getRepositoryLookupErrorMessage(repositoryResult.status),
      })
      return
    }

    const [
      frameworkDetection,
      communityHealth,
      goodFirstIssues,
      pullRequestActivity,
      repositoryActivity,
      commitActivity,
    ] = await Promise.all([
      fetchFrameworkDetection(owner, repository),
      fetchCommunityHealth(owner, repository),
      fetchGoodFirstIssues(owner, repository),
      fetchOpenPullRequests(owner, repository),
      fetchLatestCommit(owner, repository),
      fetchCommitActivity(owner, repository),
    ])

    setLookupState({
      status: 'success',
      repository: repositoryResult.repository,
      frameworkDetection,
      communityHealth,
      goodFirstIssues,
      pullRequestActivity,
      repositoryActivity,
      commitActivity,
    })
  }

  return (
    <main className="landing-page">
      <section className="hero-section" aria-labelledby="page-title">
        <div className="hero-content">
          <p className="eyebrow">Find your next contribution</p>
          <h1 id="page-title">ContributeCheck</h1>
          <p className="subtitle">
            Discover open-source projects where you can make meaningful
            contributions.
          </p>

          <form
            className="repo-form"
            onSubmit={handleSubmit}
          >
            <label className="visually-hidden" htmlFor="repository">
              GitHub repository
            </label>
            <input
              id="repository"
              name="repository"
              type="text"
              placeholder="owner/repository"
              autoComplete="off"
              value={repositoryInput}
              onChange={(event) => setRepositoryInput(event.target.value)}
              disabled={lookupState.status === 'loading'}
            />
            <button type="submit" disabled={lookupState.status === 'loading'}>
              {lookupState.status === 'loading'
                ? 'Analyzing...'
                : 'Analyze Repository'}
            </button>
          </form>

          <div
            className={
              lookupState.status === 'success'
                ? 'results-card results-stack'
                : 'results-card'
            }
            aria-live="polite"
          >
            {lookupState.status === 'idle' && (
              <p>Repository analysis will appear here.</p>
            )}

            {lookupState.status === 'loading' && (
              <p className="status-message">
                Looking up repository details and contribution signals...
              </p>
            )}

            {lookupState.status === 'error' && (
              <p className="error-message">{lookupState.message}</p>
            )}

            {lookupState.status === 'success' && (
              <RepositoryResults
                repository={lookupState.repository}
                frameworkDetection={lookupState.frameworkDetection}
                communityHealth={lookupState.communityHealth}
                goodFirstIssues={lookupState.goodFirstIssues}
                pullRequestActivity={lookupState.pullRequestActivity}
                repositoryActivity={lookupState.repositoryActivity}
                commitActivity={lookupState.commitActivity}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

function getRepositoryLookupErrorMessage(
  status: Exclude<RepositoryFetchResult['status'], 'success'>,
) {
  switch (status) {
    case 'not-found':
      return 'Repository not found. Check the owner and repository name.'
    case 'rate-limited':
      return 'GitHub API rate limit reached. Please wait a bit and try again.'
    case 'forbidden':
      return 'GitHub could not complete this request right now. Please try again later.'
    case 'failed':
      return 'GitHub request failed. Please try again in a moment.'
    case 'network-error':
      return 'Unable to reach GitHub. Check your connection and try again.'
  }
}

function RepositoryResults({
  repository,
  frameworkDetection,
  communityHealth,
  goodFirstIssues,
  pullRequestActivity,
  repositoryActivity,
  commitActivity,
}: {
  repository: GitHubRepository
  frameworkDetection: FrameworkDetection
  communityHealth: CommunityHealth
  goodFirstIssues: GoodFirstIssues
  pullRequestActivity: PullRequestActivity
  repositoryActivity: RepositoryActivity
  commitActivity: CommitActivity
}) {
  return (
    <article className="repository-results">
      <section className="result-section repository-card">
        <div className="repository-header">
          <div className="repository-summary">
            <p className="result-label">Repository</p>
            <h2>{repository.name}</h2>
            <p>{repository.description || 'No description provided.'}</p>
          </div>

          <a
            className="repository-link"
            href={repository.html_url}
            target="_blank"
            rel="noreferrer"
          >
            View repository
          </a>
        </div>

        <dl className="repository-details">
          <div>
            <dt>Owner</dt>
            <dd>{repository.owner.login}</dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd>{repository.language || 'Not specified'}</dd>
          </div>
          <div>
            <dt>Framework</dt>
            <dd>{formatFramework(frameworkDetection)}</dd>
          </div>
          <div>
            <dt>Stars</dt>
            <dd>{numberFormatter.format(repository.stargazers_count)}</dd>
          </div>
          <div>
            <dt>Forks</dt>
            <dd>{numberFormatter.format(repository.forks_count)}</dd>
          </div>
          <div>
            <dt>Open issues</dt>
            <dd>{numberFormatter.format(repository.open_issues_count)}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDate(repository.updated_at)}</dd>
          </div>
        </dl>
      </section>

      <CommunityHealthSection communityHealth={communityHealth} />

      <GoodFirstIssuesSection goodFirstIssues={goodFirstIssues} />

      <PullRequestActivitySection
        repositoryUrl={repository.html_url}
        pullRequestActivity={pullRequestActivity}
      />

      <RepositoryActivitySection
        repositoryUrl={repository.html_url}
        repositoryActivity={repositoryActivity}
        commitActivity={commitActivity}
      />
    </article>
  )
}

function RepositoryActivitySection({
  repositoryUrl,
  repositoryActivity,
  commitActivity,
}: {
  repositoryUrl: string
  repositoryActivity: RepositoryActivity
  commitActivity: CommitActivity
}) {
  const latestCommit =
    repositoryActivity.status === 'available'
      ? repositoryActivity.latestCommit
      : undefined
  const weeks =
    commitActivity.status === 'available' ? commitActivity.weeks : []
  const recentCommitCount = weeks
    .slice(-4)
    .reduce((total, week) => total + week.total, 0)
  const maxCommitCount = Math.max(
    ...weeks.map((week) => week.total),
    1,
  )
  const hasActivity = Boolean(latestCommit) || weeks.length > 0

  return (
    <section
      className="result-section repository-activity"
      aria-labelledby="repository-activity"
    >
      <div>
        <p className="result-label">Repository activity</p>
        <h3 id="repository-activity">Commit activity</h3>
        <p>
          Weekly commit totals provide a measurable view of recent project
          activity.
        </p>
      </div>

      {!hasActivity &&
      repositoryActivity.status === 'unavailable' &&
      commitActivity.status === 'unavailable' ? (
        <p className="repository-activity-muted">
          Commit data is unavailable for this repository.
        </p>
      ) : !hasActivity ? (
        <p className="repository-activity-muted">No recent commits found.</p>
      ) : (
        <>
          <dl className="repository-details repository-activity-summary">
            <div>
              <dt>Latest commit</dt>
              <dd>
                {latestCommit ? formatDate(latestCommit.committedAt) : 'Unknown'}
              </dd>
            </div>
            <div>
              <dt>Last 4 weeks</dt>
              <dd>
                {commitActivity.status === 'available'
                  ? numberFormatter.format(recentCommitCount)
                  : 'Unavailable'}
              </dd>
            </div>
          </dl>

          {commitActivity.status === 'available' && weeks.length > 0 ? (
            <CommitActivityChart
              weeks={weeks}
              maxCommitCount={maxCommitCount}
            />
          ) : (
            <p className="repository-activity-muted">
              Commit trend data is unavailable for this repository.
            </p>
          )}

          <a
            className="repository-link"
            href={`${repositoryUrl}/commits`}
            target="_blank"
            rel="noreferrer"
          >
            View commit history
          </a>
        </>
      )}
    </section>
  )
}

function CommitActivityChart({
  weeks,
  maxCommitCount,
}: {
  weeks: CommitActivityWeek[]
  maxCommitCount: number
}) {
  return (
    <div className="commit-activity-chart-wrap">
      <p className="commit-activity-heading">12-week commit activity</p>
      <div
        className="commit-activity-chart"
        role="img"
        aria-label="Commit counts for the last 12 weeks"
      >
        {weeks.map((week) => {
          const barHeight = week.total
            ? Math.max((week.total / maxCommitCount) * 100, 8)
            : 2

          return (
            <div
              className="commit-activity-bar-track"
              key={week.week}
              title={`${week.total} commits`}
            >
              <div
                className="commit-activity-bar"
                style={{ height: `${barHeight}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="commit-activity-scale" aria-hidden="true">
        <span>12 weeks ago</span>
        <span>Most recent week</span>
      </div>
    </div>
  )
}

function PullRequestActivitySection({
  repositoryUrl,
  pullRequestActivity,
}: {
  repositoryUrl: string
  pullRequestActivity: PullRequestActivity
}) {
  return (
    <section
      className="result-section pull-request-activity"
      aria-labelledby="pull-request-activity"
    >
      <div>
        <p className="result-label">Pull request activity</p>
        <h3 id="pull-request-activity">Open pull requests</h3>
        <p>
          Recent open pull requests show the work currently waiting for review
          or discussion.
        </p>
      </div>

      {pullRequestActivity.status === 'unavailable' ? (
        <p className="pull-request-activity-muted">
          Pull request data is unavailable for this repository.
        </p>
      ) : pullRequestActivity.openCount === 0 ? (
        <p className="pull-request-activity-muted">
          No open pull requests found.
        </p>
      ) : (
        <dl className="repository-details pull-request-summary">
          <div>
            <dt>Open pull requests</dt>
            <dd>{numberFormatter.format(pullRequestActivity.openCount)}</dd>
          </div>
          <div>
            <dt>Latest opened</dt>
            <dd>{formatDate(pullRequestActivity.latestOpenedAt || '')}</dd>
          </div>
        </dl>
      )}

      <a
        className="repository-link"
        href={`${repositoryUrl}/pulls`}
        target="_blank"
        rel="noreferrer"
      >
        View open pull requests
      </a>
    </section>
  )
}

function GoodFirstIssuesSection({
  goodFirstIssues,
}: {
  goodFirstIssues: GoodFirstIssues
}) {
  return (
    <section
      className="result-section good-first-issues"
      aria-labelledby="good-first-issues"
    >
      <div>
        <p className="result-label">Starter issues</p>
        <h3 id="good-first-issues">Good first issues</h3>
        <p>
          Open issues with GitHub&apos;s standard good first issue label can be
          useful starting points for new contributors.
        </p>
      </div>

      {goodFirstIssues.status === 'unavailable' ? (
        <p className="good-first-issues-muted">
          Good first issue data is unavailable for this repository.
        </p>
      ) : goodFirstIssues.issues.length === 0 ? (
        <p className="good-first-issues-muted">
          No open good first issues found.
        </p>
      ) : (
        <ul className="good-first-issue-list">
          {goodFirstIssues.issues.map((issue) => (
            <li key={issue.number}>
              <a href={issue.htmlUrl} target="_blank" rel="noreferrer">
                <span>#{issue.number}</span>
                {issue.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CommunityHealthSection({
  communityHealth,
}: {
  communityHealth: CommunityHealth
}) {
  return (
    <section
      className="result-section community-health"
      aria-labelledby="community-health"
    >
      <div>
        <p className="result-label">Contribution readiness</p>
        <h3 id="community-health">Community health files</h3>
        <p>
          These files help contributors understand how to participate in a
          project.
        </p>
      </div>

      {communityHealth.status === 'unavailable' ? (
        <p className="community-health-unavailable">
          Community health data is unavailable for this repository.
        </p>
      ) : (
        <dl className="community-health-list">
          <CommunityHealthFileStatus
            label="CONTRIBUTING.md"
            isFound={communityHealth.files.contributing}
          />
          <CommunityHealthFileStatus
            label="Code of Conduct"
            isFound={communityHealth.files.codeOfConduct}
          />
          <CommunityHealthFileStatus
            label="Issue templates"
            isFound={communityHealth.files.issueTemplates}
          />
          <CommunityHealthFileStatus
            label="Pull request template"
            isFound={communityHealth.files.pullRequestTemplate}
          />
        </dl>
      )}
    </section>
  )
}

function CommunityHealthFileStatus({
  label,
  isFound,
}: {
  label: string
  isFound: boolean
}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={isFound ? 'health-status found' : 'health-status missing'}>
        {isFound ? 'Found' : 'Missing'}
      </dd>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return dateFormatter.format(date)
}

function formatFramework(detection: FrameworkDetection) {
  switch (detection.status) {
    case 'detected':
      return detection.framework
    case 'not-detected':
      return 'Not detected'
    case 'unavailable':
      return 'Unavailable'
  }
}

export default App
