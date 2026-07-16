import { useState } from 'react'
import {
  fetchPullRequestReviewActivity,
  type PullRequestActivity,
  type PullRequestReviewActivity,
} from '../github/activityApi'
import {
  formatAffiliatedReviewCoverage,
  formatAffiliatedReviewCoverageNote,
  formatAffiliatedReviewSampleNote,
  formatAffiliatedReviewTime,
  formatAge,
  formatFirstReviewSampleNote,
  formatFirstReviewTime,
  formatReviewCoverage,
  formatReviewCoverageNote,
  numberFormatter,
} from '../formatters'

type ReviewMetricsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; activity: PullRequestReviewActivity }

export function PullRequestActivitySection({
  owner,
  repositoryName,
  repositoryUrl,
  pullRequestActivity,
}: {
  owner: string
  repositoryName: string
  repositoryUrl: string
  pullRequestActivity: PullRequestActivity
}) {
  const [isReviewMetricsExpanded, setIsReviewMetricsExpanded] =
    useState(false)
  const [isCalculationExpanded, setIsCalculationExpanded] = useState(false)
  const [reviewMetricsState, setReviewMetricsState] =
    useState<ReviewMetricsState>({ status: 'idle' })

  async function handleReviewMetricsClick() {
    if (reviewMetricsState.status === 'loading') {
      return
    }

    const shouldRetry =
      reviewMetricsState.status === 'loaded' &&
      reviewMetricsState.activity.status === 'unavailable'

    if (reviewMetricsState.status === 'idle' || shouldRetry) {
      setIsReviewMetricsExpanded(true)
      setReviewMetricsState({ status: 'loading' })

      const activity = await fetchPullRequestReviewActivity(
        owner,
        repositoryName,
      )

      setReviewMetricsState({ status: 'loaded', activity })
      return
    }

    setIsReviewMetricsExpanded((expanded) => !expanded)
  }

  const reviewMetricsButtonLabel = getReviewMetricsButtonLabel(
    isReviewMetricsExpanded,
    reviewMetricsState,
  )

  return (
    <section
      className="result-section pull-request-activity"
      aria-labelledby="pull-request-activity"
    >
      <div>
        <p className="result-label">Pull request activity</p>
        <h3 id="pull-request-activity">Pull request summary</h3>
        <p>
          Open pull requests show current contribution activity. Review
          metrics provide additional context about how quickly outside
          contributions receive attention.
        </p>
      </div>

      {pullRequestActivity.status !== 'available' ? (
        <p className="pull-request-activity-muted">
          Pull request data is unavailable for this repository.
        </p>
      ) : (
        <dl className="repository-details pull-request-summary">
          <div>
            <dt>Open pull requests</dt>
            <dd>{numberFormatter.format(pullRequestActivity.openCount)}</dd>
          </div>
          <div>
            <dt>Oldest open</dt>
            <dd>
              {pullRequestActivity.openCount > 0
                ? formatAge(pullRequestActivity.oldestOpenedAt || '')
                : 'None'}
            </dd>
          </div>
        </dl>
      )}

      <button
        className="review-metrics-toggle"
        type="button"
        aria-controls="review-metrics"
        aria-expanded={isReviewMetricsExpanded}
        onClick={handleReviewMetricsClick}
        disabled={reviewMetricsState.status === 'loading'}
      >
        {reviewMetricsButtonLabel}
      </button>

      {isReviewMetricsExpanded && (
        <div className="review-metrics-panel" id="review-metrics">
          <p className="review-metrics-scope">
            Based on up to 10 recently updated closed pull requests.
          </p>

          {reviewMetricsState.status === 'loading' && (
            <p className="pull-request-activity-muted">
              Loading review metrics...
            </p>
          )}

          {reviewMetricsState.status === 'loaded' &&
            reviewMetricsState.activity.status === 'unavailable' && (
              <p className="error-message">
                Review metrics are unavailable right now. Try again in a
                moment.
              </p>
            )}

          {reviewMetricsState.status === 'loaded' &&
            reviewMetricsState.activity.status === 'available' && (
              <dl className="repository-details review-metrics-details">
                <div>
                  <dt>Median time to first outside review</dt>
                  <dd>
                    <span className="metric-value">
                      {formatFirstReviewTime(reviewMetricsState.activity)}
                    </span>
                    <span className="metric-note">
                      {formatFirstReviewSampleNote(
                        reviewMetricsState.activity,
                      )}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Outside review coverage</dt>
                  <dd>
                    <span className="metric-value">
                      {formatReviewCoverage(reviewMetricsState.activity)}
                    </span>
                    <span className="metric-note">
                      {formatReviewCoverageNote(reviewMetricsState.activity)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Median time to first repository-affiliated review</dt>
                  <dd>
                    <span className="metric-value">
                      {formatAffiliatedReviewTime(
                        reviewMetricsState.activity,
                      )}
                    </span>
                    <span className="metric-note">
                      {formatAffiliatedReviewSampleNote(
                        reviewMetricsState.activity,
                      )}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Repository-affiliated review coverage</dt>
                  <dd>
                    <span className="metric-value">
                      {formatAffiliatedReviewCoverage(
                        reviewMetricsState.activity,
                      )}
                    </span>
                    <span className="metric-note">
                      {formatAffiliatedReviewCoverageNote(
                        reviewMetricsState.activity,
                      )}
                    </span>
                  </dd>
                </div>
              </dl>
            )}

          <button
            className="review-metrics-toggle metric-explanation-toggle"
            type="button"
            aria-controls="review-metrics-explanation"
            aria-expanded={isCalculationExpanded}
            onClick={() => setIsCalculationExpanded((expanded) => !expanded)}
          >
            How is this calculated?
          </button>

          {isCalculationExpanded && (
            <div
              className="metric-explanation"
              id="review-metrics-explanation"
            >
              <p>Uses up to 10 recently updated closed pull requests.</p>
              <p>
                For each PR, the first submitted review from someone other
                than the author is used to measure review timing.
              </p>
              <p>
                Median timing uses only PRs with valid timing data. Coverage
                is the percentage of sampled PRs with a qualifying outside
                review.
              </p>
            </div>
          )}
        </div>
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

function getReviewMetricsButtonLabel(
  isExpanded: boolean,
  state: ReviewMetricsState,
) {
  if (state.status === 'loading') {
    return 'Loading review metrics...'
  }

  if (state.status === 'loaded' && state.activity.status === 'unavailable') {
    return 'Retry review metrics'
  }

  return isExpanded ? 'Hide review metrics' : 'Show review metrics'
}
