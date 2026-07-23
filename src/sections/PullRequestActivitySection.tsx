import { useState } from 'react'
import {
  fetchPullRequestReviewActivity,
  type PullRequestActivity,
  type PullRequestReviewActivity,
} from '../github/activityApi'
import {
  formatAge,
  formatFirstReviewSampleNote,
  formatFirstReviewTime,
  formatProjectMemberReviewCoverage,
  formatProjectMemberReviewCoverageNote,
  formatProjectMemberReviewSampleNote,
  formatProjectMemberReviewTime,
  formatProjectMemberReviewerNote,
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
          metrics show how quickly pull requests receive attention.
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
        <div
          className="review-metrics-panel pull-request-metrics-panel"
          id="review-metrics"
        >
          {reviewMetricsState.status === 'loading' && (
            <p className="pull-request-activity-muted">
              Loading review metrics...
            </p>
          )}

          {reviewMetricsState.status === 'loaded' &&
            reviewMetricsState.activity.status === 'unavailable' && (
              <p className="error-message">
                Review metrics request unavailable. GitHub could not provide
                this sample right now. Try again in a moment.
              </p>
            )}

          {reviewMetricsState.status === 'loaded' &&
            reviewMetricsState.activity.status === 'available' && (
              <dl className="repository-details review-metrics-details">
                <div>
                  <dt>Median time to first review</dt>
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
                  <dt>Pull requests receiving a review</dt>
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
                  <dt>Median time to first project-member review</dt>
                  <dd>
                    <span className="metric-value">
                      {formatProjectMemberReviewTime(
                        reviewMetricsState.activity,
                      )}
                    </span>
                    <span className="metric-note">
                      {formatProjectMemberReviewSampleNote(
                        reviewMetricsState.activity,
                      )}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Pull requests receiving a project-member review</dt>
                  <dd>
                    <span className="metric-value">
                      {formatProjectMemberReviewCoverage(
                        reviewMetricsState.activity,
                      )}
                    </span>
                    <span className="metric-note">
                      {formatProjectMemberReviewCoverageNote(
                        reviewMetricsState.activity,
                      )}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Different project-member reviewers</dt>
                  <dd>
                    <span className="metric-value">
                      {numberFormatter.format(
                        reviewMetricsState.activity.projectMemberReviewerCount,
                      )}
                    </span>
                    <span className="metric-note">
                      {formatProjectMemberReviewerNote(
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
              <ul>
                <li>
                  Sample: up to 10 recently updated closed pull requests.
                </li>
                <li>
                  For each pull request, the first submitted review from
                  someone other than the author is used to measure review
                  timing.
                </li>
                <li>
                  Project-member reviews are from GitHub users identified as
                  repository owners, members, or collaborators.
                </li>
                <li>
                  Median timing uses only pull requests with valid timing
                  data, while coverage shows the percentage of sampled pull
                  requests that received the relevant review.
                </li>
                <li>
                  A 0% coverage result means the sample loaded but no sampled
                  pull requests received the relevant review; an unavailable
                  request is shown separately above.
                </li>
                <li>
                  Each project member is counted once, even if they reviewed
                  more than one sampled PR.
                </li>
              </ul>
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
