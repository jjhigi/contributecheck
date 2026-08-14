import type {
  CommunityHealth,
  GitHubRepository,
  GoodFirstIssues,
} from './github/repositoryApi'
import type { FrameworkDetection } from './github/frameworkDetection'
import type {
  CommitActivity,
  PullRequestActivity,
  RepositoryActivity,
} from './github/activityApi'
import { CommunityHealthSection } from './sections/CommunityHealthSection'
import { GoodFirstIssuesSection } from './sections/GoodFirstIssuesSection'
import { PullRequestActivitySection } from './sections/PullRequestActivitySection'
import { RepositoryActivitySection } from './sections/RepositoryActivitySection'
import { RepositoryDetailsSection } from './sections/RepositoryDetailsSection'

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
  frameworkDetection: FrameworkDetection | null
  communityHealth: CommunityHealth | null
  goodFirstIssues: GoodFirstIssues | null
  pullRequestActivity: PullRequestActivity | null
  repositoryActivity: RepositoryActivity | null
  commitActivity: CommitActivity | null
}) {
  return (
    <article className="repository-results">
      <RepositoryDetailsSection
        repository={repository}
        frameworkDetection={frameworkDetection}
      />

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
