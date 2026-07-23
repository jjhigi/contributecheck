import { useState } from 'react'
import {
  fetchIssueResponseActivity,
  type IssueResponseActivity,
} from '../github/issueActivityApi'
import {
  formatIssueResponseCoverage,
  formatIssueResponseCoverageNote,
  formatIssueResponseSampleNote,
  formatIssueResponseTime,
} from '../formatters'

type IssueResponseState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; activity: IssueResponseActivity }

export function IssueResponseMetrics({
  owner,
  repositoryName,
}: {
  owner: string
  repositoryName: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCalculationExpanded, setIsCalculationExpanded] = useState(false)
  const [state, setState] = useState<IssueResponseState>({ status: 'idle' })

  async function handleToggle() {
    if (state.status === 'loading') {
      return
    }

    const shouldRetry =
      state.status === 'loaded' && state.activity.status === 'unavailable'

    if (state.status === 'idle' || shouldRetry) {
      setIsExpanded(true)
      setState({ status: 'loading' })

      const activity = await fetchIssueResponseActivity(
        owner,
        repositoryName,
      )

      setState({ status: 'loaded', activity })
      return
    }

    setIsExpanded((expanded) => !expanded)
  }

  return (
    <>
      <button
        className="review-metrics-toggle"
        type="button"
        aria-controls="issue-response-metrics"
        aria-expanded={isExpanded}
        onClick={handleToggle}
        disabled={state.status === 'loading'}
      >
        {getButtonLabel(isExpanded, state)}
      </button>

      {isExpanded && (
        <div
          className="review-metrics-panel issue-response-metrics-panel"
          id="issue-response-metrics"
        >
          {state.status === 'loading' && (
            <p className="repository-activity-muted">
              Loading issue response metrics...
            </p>
          )}

          {state.status === 'loaded' &&
            state.activity.status === 'unavailable' && (
              <p className="error-message">
                Issue response request unavailable. GitHub could not provide
                this sample right now. Try again in a moment.
              </p>
            )}

          {state.status === 'loaded' &&
            state.activity.status === 'available' && (
              <dl className="repository-details review-metrics-details">
                <div>
                  <dt>Median time to first project-member response</dt>
                  <dd>
                    <span className="metric-value">
                      {formatIssueResponseTime(state.activity)}
                    </span>
                    <span className="metric-note">
                      {formatIssueResponseSampleNote(state.activity)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Issues receiving a project-member response</dt>
                  <dd>
                    <span className="metric-value">
                      {formatIssueResponseCoverage(state.activity)}
                    </span>
                    <span className="metric-note">
                      {formatIssueResponseCoverageNote(state.activity)}
                    </span>
                  </dd>
                </div>
              </dl>
            )}

          <button
            className="review-metrics-toggle metric-explanation-toggle"
            type="button"
            aria-controls="issue-response-explanation"
            aria-expanded={isCalculationExpanded}
            onClick={() => setIsCalculationExpanded((expanded) => !expanded)}
          >
            How is this calculated?
          </button>

          {isCalculationExpanded && (
            <div className="metric-explanation" id="issue-response-explanation">
              <ul>
                <li>Sample: up to 10 recently updated closed issues.</li>
                <li>
                  A project-member response is the first comment from a
                  repository owner, member, or collaborator other than the
                  issue author.
                </li>
                <li>
                  Median timing uses only issues with valid issue and response
                  timestamps.
                </li>
                <li>
                  A 0% result means the sample loaded but no sampled issues
                  received a project-member response; an unavailable request
                  is shown separately above.
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function getButtonLabel(isExpanded: boolean, state: IssueResponseState) {
  if (state.status === 'loading') {
    return 'Loading issue response metrics...'
  }

  if (state.status === 'loaded' && state.activity.status === 'unavailable') {
    return 'Retry issue response metrics'
  }

  return isExpanded
    ? 'Hide issue response metrics'
    : 'Show issue response metrics'
}
