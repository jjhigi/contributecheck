import type {
  PullRequestActivity,
  PullRequestMergeActivity,
  PullRequestReviewActivity,
} from './githubApi'
import {
  formatAge,
  formatFirstReviewTime,
  formatMergeRate,
  formatMergeTime,
  formatReviewCoverage,
  getFirstReviewTimeLabel,
  getMergeTimeLabel,
  numberFormatter,
} from './formatters'

export function PullRequestActivitySection({
  repositoryUrl,
  pullRequestActivity,
  pullRequestMergeActivity,
  pullRequestReviewActivity,
}: {
  repositoryUrl: string
  pullRequestActivity: PullRequestActivity
  pullRequestMergeActivity: PullRequestMergeActivity
  pullRequestReviewActivity: PullRequestReviewActivity
}) {
  const hasPullRequestData =
    pullRequestActivity.status === 'available' ||
    pullRequestMergeActivity.status === 'available' ||
    pullRequestReviewActivity.status === 'available'

  return (
    <section
      className="result-section pull-request-activity"
      aria-labelledby="pull-request-activity"
    >
      <div>
        <p className="result-label">Pull request activity</p>
        <h3 id="pull-request-activity">Pull request summary</h3>
        <p>
          Open and recently merged pull requests provide measurable context
          about contribution activity, resolution speed, and responsiveness.
        </p>
      </div>

      {!hasPullRequestData ? (
        <p className="pull-request-activity-muted">
          Pull request data is unavailable for this repository.
        </p>
      ) : (
        <dl className="repository-details pull-request-summary">
          <div>
            <dt>Open pull requests</dt>
            <dd>
              {pullRequestActivity.status === 'available'
                ? numberFormatter.format(pullRequestActivity.openCount)
                : 'Unavailable'}
            </dd>
          </div>
          <div>
            <dt>Oldest open</dt>
            <dd>
              {pullRequestActivity.status !== 'available'
                ? 'Unavailable'
                : pullRequestActivity.openCount > 0
                  ? formatAge(pullRequestActivity.oldestOpenedAt || '')
                  : 'None'}
            </dd>
          </div>
          <div>
            <dt>Merged (90 days)</dt>
            <dd>
              {pullRequestMergeActivity.status === 'available'
                ? numberFormatter.format(
                    pullRequestMergeActivity.mergedCount,
                  )
                : 'Unavailable'}
            </dd>
          </div>
          <div>
            <dt>Merge rate (90 days)</dt>
            <dd>{formatMergeRate(pullRequestMergeActivity)}</dd>
          </div>
          <div>
            <dt>{getMergeTimeLabel(pullRequestMergeActivity)}</dt>
            <dd>{formatMergeTime(pullRequestMergeActivity)}</dd>
          </div>
          <div>
            <dt>{getFirstReviewTimeLabel(pullRequestReviewActivity)}</dt>
            <dd>{formatFirstReviewTime(pullRequestReviewActivity)}</dd>
          </div>
          <div>
            <dt>Outside review coverage</dt>
            <dd>{formatReviewCoverage(pullRequestReviewActivity)}</dd>
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
