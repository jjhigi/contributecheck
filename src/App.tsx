import { useState, type FormEvent } from 'react'
import './App.css'
import { parseRepositoryInput } from './repositoryInput'

type GitHubRepository = {
  name: string
  owner: {
    login: string
  }
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  updated_at: string
  html_url: string
}

type GitHubCommunityProfile = {
  files?: {
    code_of_conduct?: unknown | null
    contributing?: unknown | null
    issue_template?: unknown | null
    pull_request_template?: unknown | null
  }
}

type CommunityHealthFileStates = {
  codeOfConduct: boolean
  contributing: boolean
  issueTemplates: boolean
  pullRequestTemplate: boolean
}

type CommunityHealth =
  | { status: 'available'; files: CommunityHealthFileStates }
  | { status: 'unavailable' }

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success'
      repository: GitHubRepository
      communityHealth: CommunityHealth
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

    try {
      const response = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
        {
          headers: {
            Accept: 'application/vnd.github+json',
          },
        },
      )

      if (response.status === 404) {
        setLookupState({
          status: 'error',
          message: 'Repository not found. Check the owner and repository name.',
        })
        return
      }

      if (response.status === 403 || response.status === 429) {
        const remainingRequests = response.headers.get('x-ratelimit-remaining')
        const message =
          remainingRequests === '0'
            ? 'GitHub API rate limit reached. Please wait a bit and try again.'
            : 'GitHub could not complete this request right now. Please try again later.'

        setLookupState({ status: 'error', message })
        return
      }

      if (!response.ok) {
        setLookupState({
          status: 'error',
          message: 'GitHub request failed. Please try again in a moment.',
        })
        return
      }

      const repositoryData = (await response.json()) as GitHubRepository
      const communityHealth = await fetchCommunityHealth(owner, repository)

      setLookupState({
        status: 'success',
        repository: repositoryData,
        communityHealth,
      })
    } catch {
      setLookupState({
        status: 'error',
        message: 'Unable to reach GitHub. Check your connection and try again.',
      })
    }
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

          <div className="results-card" aria-live="polite">
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
              />
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

async function fetchCommunityHealth(
  owner: string,
  repository: string,
): Promise<CommunityHealth> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/community/profile`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
      },
    )

    if (!response.ok) {
      return { status: 'unavailable' }
    }

    const communityProfile = (await response.json()) as GitHubCommunityProfile

    return {
      status: 'available',
      files: {
        codeOfConduct: Boolean(communityProfile.files?.code_of_conduct),
        contributing: Boolean(communityProfile.files?.contributing),
        issueTemplates: Boolean(communityProfile.files?.issue_template),
        pullRequestTemplate: Boolean(
          communityProfile.files?.pull_request_template,
        ),
      },
    }
  } catch {
    return { status: 'unavailable' }
  }
}

function RepositoryResults({
  repository,
  communityHealth,
}: {
  repository: GitHubRepository
  communityHealth: CommunityHealth
}) {
  return (
    <article className="repository-results">
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

      <CommunityHealthSection communityHealth={communityHealth} />

      <a
        className="repository-link"
        href={repository.html_url}
        target="_blank"
        rel="noreferrer"
      >
        View repository
      </a>
    </article>
  )
}

function CommunityHealthSection({
  communityHealth,
}: {
  communityHealth: CommunityHealth
}) {
  return (
    <section className="community-health" aria-labelledby="community-health">
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
