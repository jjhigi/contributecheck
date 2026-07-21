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
import type { FrameworkDetection } from './github/frameworkDetection'
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
            <dd>{formatFramework(frameworkDetection)}</dd>
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
