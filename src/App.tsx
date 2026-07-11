import { useState, type FormEvent } from 'react'
import './App.css'
import {
  fetchCommunityHealth,
  fetchGoodFirstIssues,
  fetchRepository,
  type CommunityHealth,
  type GitHubRepository,
  type GoodFirstIssues,
  type RepositoryFetchResult,
} from './githubApi'
import { parseRepositoryInput } from './repositoryInput'

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success'
      repository: GitHubRepository
      communityHealth: CommunityHealth
      goodFirstIssues: GoodFirstIssues
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

    const [communityHealth, goodFirstIssues] = await Promise.all([
      fetchCommunityHealth(owner, repository),
      fetchGoodFirstIssues(owner, repository),
    ])

    setLookupState({
      status: 'success',
      repository: repositoryResult.repository,
      communityHealth,
      goodFirstIssues,
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
                communityHealth={lookupState.communityHealth}
                goodFirstIssues={lookupState.goodFirstIssues}
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
  communityHealth,
  goodFirstIssues,
}: {
  repository: GitHubRepository
  communityHealth: CommunityHealth
  goodFirstIssues: GoodFirstIssues
}) {
  return (
    <article className="repository-results">
      <section className="result-section repository-card">
        <div className="repository-summary">
          <p className="result-label">Repository</p>
          <h2>{repository.name}</h2>
          <p>{repository.description || 'No description provided.'}</p>
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

        <a
          className="repository-link"
          href={repository.html_url}
          target="_blank"
          rel="noreferrer"
        >
          View repository
        </a>
      </section>

      <CommunityHealthSection communityHealth={communityHealth} />

      <GoodFirstIssuesSection goodFirstIssues={goodFirstIssues} />
    </article>
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

export default App
