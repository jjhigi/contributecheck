import { useState, type FormEvent } from 'react'
import './App.css'
import {
  fetchCommitActivity,
  fetchLatestCommit,
  fetchOpenPullRequests,
  type CommitActivity,
  type PullRequestActivity,
  type RepositoryActivity,
} from './github/activityApi'
import {
  fetchCommunityHealth,
  fetchGoodFirstIssues,
  fetchRepository,
  type CommunityHealth,
  type GitHubRepository,
  type GoodFirstIssues,
  type RepositoryFetchResult,
} from './github/repositoryApi'
import {
  fetchFrameworkDetection,
  type FrameworkDetection,
} from './github/frameworkDetection'
import { RepositoryResults } from './RepositoryResults'
import { parseRepositoryInput } from './repositoryInput'

type RepositoryAnalysisResults = {
  frameworkDetection: FrameworkDetection | null
  communityHealth: CommunityHealth | null
  goodFirstIssues: GoodFirstIssues | null
  pullRequestActivity: PullRequestActivity | null
  repositoryActivity: RepositoryActivity | null
  commitActivity: CommitActivity | null
}

type RepositoryLoadedLookup = {
  status: 'repository-loaded'
  repository: GitHubRepository
} & RepositoryAnalysisResults

type LookupState =
  | { status: 'idle' }
  | { status: 'loading' }
  | RepositoryLoadedLookup
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

type SuccessfulLookup = Extract<LookupState, { status: 'success' }>

const repositoryAnalysisCache = new Map<string, SuccessfulLookup>()

function App() {
  const [repositoryInput, setRepositoryInput] = useState('')
  const [lookupState, setLookupState] = useState<LookupState>({
    status: 'idle',
  })
  const isAnalysisInProgress =
    lookupState.status === 'loading' ||
    lookupState.status === 'repository-loaded'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedInput = parseRepositoryInput(repositoryInput)

    if (!parsedInput.ok) {
      setLookupState({ status: 'error', message: parsedInput.error })
      return
    }

    const { owner, repository } = parsedInput.value
    const cacheKey = getRepositoryCacheKey(owner, repository)

    setRepositoryInput(`${owner}/${repository}`)

    const cachedLookup = repositoryAnalysisCache.get(cacheKey)

    if (cachedLookup) {
      setLookupState(cachedLookup)
      return
    }

    setLookupState({ status: 'loading' })

    const repositoryResult = await fetchRepository(owner, repository)

    if (repositoryResult.status !== 'success') {
      setLookupState({
        status: 'error',
        message: getRepositoryLookupErrorMessage(repositoryResult.status),
      })
      return
    }

    setLookupState({
      status: 'repository-loaded',
      repository: repositoryResult.repository,
      frameworkDetection: null,
      communityHealth: null,
      goodFirstIssues: null,
      pullRequestActivity: null,
      repositoryActivity: null,
      commitActivity: null,
    })

    fetchFrameworkDetection(
      owner,
      repository,
      repositoryResult.repository.language,
    ).then((frameworkDetection) =>
      updateLookupState(cacheKey, { frameworkDetection }),
    )
    fetchCommunityHealth(owner, repository).then((communityHealth) =>
      updateLookupState(cacheKey, { communityHealth }),
    )
    fetchGoodFirstIssues(owner, repository).then((goodFirstIssues) =>
      updateLookupState(cacheKey, { goodFirstIssues }),
    )
    fetchOpenPullRequests(owner, repository).then((pullRequestActivity) =>
      updateLookupState(cacheKey, { pullRequestActivity }),
    )
    fetchLatestCommit(owner, repository).then((repositoryActivity) =>
      updateLookupState(cacheKey, { repositoryActivity }),
    )
    fetchCommitActivity(owner, repository).then((commitActivity) =>
      updateLookupState(cacheKey, { commitActivity }),
    )
  }

  function updateLookupState(
    cacheKey: string,
    updates: Partial<RepositoryAnalysisResults>,
  ) {
    setLookupState((currentState) => {
      if (currentState.status !== 'repository-loaded') {
        return currentState
      }

      const updatedLookup = { ...currentState, ...updates }
      const successfulLookup = getSuccessfulLookup(updatedLookup)

      if (!successfulLookup) {
        return updatedLookup
      }

      if (isCompleteLookup(successfulLookup)) {
        repositoryAnalysisCache.set(cacheKey, successfulLookup)
      }

      return successfulLookup
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

          <form className="repo-form" onSubmit={handleSubmit}>
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
              disabled={isAnalysisInProgress}
            />
            <button type="submit" disabled={isAnalysisInProgress}>
              {isAnalysisInProgress
                ? 'Analyzing...'
                : 'Analyze Repository'}
            </button>
          </form>

          <div
            className={
              lookupState.status === 'success' ||
              lookupState.status === 'repository-loaded'
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

            {(lookupState.status === 'repository-loaded' ||
              lookupState.status === 'success') && (
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

function getRepositoryCacheKey(owner: string, repository: string) {
  return `${owner.toLowerCase()}/${repository.toLowerCase()}`
}

function getSuccessfulLookup(
  lookup: RepositoryLoadedLookup,
): SuccessfulLookup | null {
  if (
    !lookup.frameworkDetection ||
    !lookup.communityHealth ||
    !lookup.goodFirstIssues ||
    !lookup.pullRequestActivity ||
    !lookup.repositoryActivity ||
    !lookup.commitActivity
  ) {
    return null
  }

  return {
    status: 'success',
    repository: lookup.repository,
    frameworkDetection: lookup.frameworkDetection,
    communityHealth: lookup.communityHealth,
    goodFirstIssues: lookup.goodFirstIssues,
    pullRequestActivity: lookup.pullRequestActivity,
    repositoryActivity: lookup.repositoryActivity,
    commitActivity: lookup.commitActivity,
  }
}

function isCompleteLookup(lookup: SuccessfulLookup) {
  return [
    lookup.frameworkDetection,
    lookup.communityHealth,
    lookup.goodFirstIssues,
    lookup.pullRequestActivity,
    lookup.repositoryActivity,
    lookup.commitActivity,
  ].every((result) => result.status !== 'unavailable')
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

export default App
