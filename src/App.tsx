import { useState, type FormEvent } from 'react'
import './App.css'
import {
  fetchCommunityHealth,
  fetchCommitActivity,
  fetchFrameworkDetection,
  fetchGoodFirstIssues,
  fetchLatestCommit,
  fetchOpenPullRequests,
  fetchPullRequestMergeActivity,
  fetchPullRequestReviewActivity,
  fetchRepository,
  type CommunityHealth,
  type CommitActivity,
  type FrameworkDetection,
  type GitHubRepository,
  type GoodFirstIssues,
  type PullRequestActivity,
  type PullRequestMergeActivity,
  type PullRequestReviewActivity,
  type RepositoryActivity,
  type RepositoryFetchResult,
} from './githubApi'
import { RepositoryResults } from './RepositoryResults'
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
      pullRequestMergeActivity: PullRequestMergeActivity
      pullRequestReviewActivity: PullRequestReviewActivity
      repositoryActivity: RepositoryActivity
      commitActivity: CommitActivity
    }
  | { status: 'error'; message: string }

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
      pullRequestMergeActivity,
      pullRequestReviewActivity,
      repositoryActivity,
      commitActivity,
    ] = await Promise.all([
      fetchFrameworkDetection(owner, repository),
      fetchCommunityHealth(owner, repository),
      fetchGoodFirstIssues(owner, repository),
      fetchOpenPullRequests(owner, repository),
      fetchPullRequestMergeActivity(owner, repository),
      fetchPullRequestReviewActivity(owner, repository),
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
      pullRequestMergeActivity,
      pullRequestReviewActivity,
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
                pullRequestMergeActivity={lookupState.pullRequestMergeActivity}
                pullRequestReviewActivity={lookupState.pullRequestReviewActivity}
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

export default App
