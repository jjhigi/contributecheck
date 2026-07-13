import type { GoodFirstIssues } from './githubApi'

export function GoodFirstIssuesSection({
  goodFirstIssues,
}: {
  goodFirstIssues: GoodFirstIssues
}) {
  return (
    <section
      className="result-section good-first-issues"
      aria-labelledby="good-first-issues"
    >
      <div>
        <p className="result-label">Starter issues</p>
        <h3 id="good-first-issues">Good first issues</h3>
        <p>
          Open issues with GitHub&apos;s standard good first issue label can be
          useful starting points for new contributors.
        </p>
      </div>

      {goodFirstIssues.status === 'unavailable' ? (
        <p className="good-first-issues-muted">
          Good first issue data is unavailable for this repository.
        </p>
      ) : goodFirstIssues.issues.length === 0 ? (
        <p className="good-first-issues-muted">
          No open good first issues found.
        </p>
      ) : (
        <ul className="good-first-issue-list">
          {goodFirstIssues.issues.map((issue) => (
            <li key={issue.number}>
              <a href={issue.htmlUrl} target="_blank" rel="noreferrer">
                <span>#{issue.number}</span>
                {issue.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
