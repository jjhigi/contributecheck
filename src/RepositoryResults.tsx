import { useState } from 'react'
import type {
  CommunityHealth,
  GitHubRepository,
  GoodFirstIssues,
} from './github/repositoryApi'
import type {
  CommitActivity,
  PullRequestActivity,
  RepositoryActivity,
} from './github/activityApi'
import {
  fetchWorkspaceFrameworkDetection,
  type FrameworkDetection,
  type WorkspaceFrameworkDetection,
} from './github/frameworkDetection'
import { CommunityHealthSection } from './sections/CommunityHealthSection'
import { GoodFirstIssuesSection } from './sections/GoodFirstIssuesSection'
import { PullRequestActivitySection } from './sections/PullRequestActivitySection'
import { RepositoryActivitySection } from './sections/RepositoryActivitySection'
import { formatDate, formatFramework, numberFormatter } from './formatters'

export function RepositoryResults({
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
            <dt>Framework / stack</dt>
            <dd>
              <FrameworkDetectionDetails
                key={`${repository.owner.login}/${repository.name}`}
                owner={repository.owner.login}
                repositoryName={repository.name}
                frameworkDetection={frameworkDetection}
              />
            </dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>
              {repository.license ? (
                repository.license.html_url ? (
                  <a
                    className="repository-detail-link"
                    href={repository.license.html_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {repository.license.name ||
                      repository.license.spdx_id ||
                      'View license'}
                  </a>
                ) : (
                  repository.license.name ||
                  repository.license.spdx_id ||
                  'Specified'
                )
              ) : (
                'Not specified'
              )}
            </dd>
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
          <div>
            <dt>Status</dt>
            <dd
              className={
                repository.archived ? 'repository-status archived' : ''
              }
            >
              {repository.archived ? 'Archived' : 'Active'}
            </dd>
          </div>
        </dl>
      </section>

      <CommunityHealthSection communityHealth={communityHealth} />

      <GoodFirstIssuesSection goodFirstIssues={goodFirstIssues} />

      <RepositoryActivitySection
        key={`${repository.owner.login}/${repository.name}`}
        owner={repository.owner.login}
        repositoryName={repository.name}
        repositoryUrl={repository.html_url}
        repositoryActivity={repositoryActivity}
        commitActivity={commitActivity}
      />

      <PullRequestActivitySection
        key={`${repository.owner.login}/${repository.name}`}
        owner={repository.owner.login}
        repositoryName={repository.name}
        repositoryUrl={repository.html_url}
        pullRequestActivity={pullRequestActivity}
      />
    </article>
  )
}

type WorkspaceScanState = 'idle' | 'loading' | 'complete' | 'unavailable'

function FrameworkDetectionDetails({
  owner,
  repositoryName,
  frameworkDetection,
}: {
  owner: string
  repositoryName: string
  frameworkDetection: FrameworkDetection
}) {
  const [detection, setDetection] = useState(frameworkDetection)
  const [workspaceScanState, setWorkspaceScanState] =
    useState<WorkspaceScanState>('idle')

  async function handleWorkspaceScan() {
    if (
      workspaceScanState === 'loading' ||
      workspaceScanState === 'complete'
    ) {
      return
    }

    setWorkspaceScanState('loading')
    const workspaceDetection = await fetchWorkspaceFrameworkDetection(
      owner,
      repositoryName,
    )

    if (workspaceDetection.status === 'unavailable') {
      setWorkspaceScanState('unavailable')
      return
    }

    setDetection(mergeFrameworkDetections(detection, workspaceDetection))
    setWorkspaceScanState('complete')
  }

  const canScanWorkspace =
    detection.status !== 'unavailable' &&
    detection.workspaceAvailable &&
    workspaceScanState !== 'complete'

  return (
    <div className="framework-detection">
      <span>{formatFramework(detection)}</span>

      {canScanWorkspace && (
        <button
          className="framework-scan-button"
          type="button"
          onClick={handleWorkspaceScan}
          disabled={workspaceScanState === 'loading'}
        >
          {workspaceScanState === 'loading'
            ? 'Scanning workspace packages...'
            : workspaceScanState === 'unavailable'
              ? 'Retry workspace scan'
              : 'Scan workspace packages'}
        </button>
      )}

      {workspaceScanState === 'unavailable' && (
        <span className="framework-scan-error">
          Workspace scan unavailable.
        </span>
      )}
    </div>
  )
}

function mergeFrameworkDetections(
  currentDetection: FrameworkDetection,
  workspaceDetection: WorkspaceFrameworkDetection,
): FrameworkDetection {
  const currentFrameworks =
    currentDetection.status === 'detected' ? currentDetection.frameworks : []
  const workspaceFrameworks =
    workspaceDetection.status === 'detected'
      ? workspaceDetection.frameworks
      : []
  const frameworks = [
    ...new Set([...currentFrameworks, ...workspaceFrameworks]),
  ].slice(0, 3)

  return frameworks.length > 0
    ? { status: 'detected', frameworks, workspaceAvailable: false }
    : { status: 'not-detected', workspaceAvailable: false }
}
