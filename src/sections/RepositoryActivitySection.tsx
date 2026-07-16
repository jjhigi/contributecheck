import type {
  CommitActivity,
  CommitActivityWeek,
  RepositoryActivity,
} from '../github/activityApi'
import { formatDate, numberFormatter } from '../formatters'

export function RepositoryActivitySection({
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
              <dt>Commits, last 4 weeks</dt>
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
      <p className="commit-activity-heading">Weekly commits, last 12 weeks</p>
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
