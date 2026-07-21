import type {
  CommunityHealth,
  CommunityHealthFile,
} from '../github/repositoryApi'

export function CommunityHealthSection({
  communityHealth,
}: {
  communityHealth: CommunityHealth
}) {
  return (
    <section
      className="result-section community-health"
      aria-labelledby="community-health"
    >
      <div>
        <p className="result-label">Contribution readiness</p>
        <h3 id="community-health">Community health files</h3>
        <p>
          These files help contributors understand how to participate in a
          project.
        </p>
      </div>

      {communityHealth.status === 'unavailable' ? (
        <p className="community-health-unavailable">
          Community health data is unavailable for this repository.
        </p>
      ) : (
        <dl className="community-health-list">
          <CommunityHealthFileStatus
            label="CONTRIBUTING.md"
            file={communityHealth.files.contributing}
          />
          <CommunityHealthFileStatus
            label="Code of Conduct"
            file={communityHealth.files.codeOfConduct}
          />
          <CommunityHealthFileStatus
            label="Issue templates"
            file={communityHealth.files.issueTemplates}
          />
          <CommunityHealthFileStatus
            label="Pull request template"
            file={communityHealth.files.pullRequestTemplate}
          />
        </dl>
      )}
    </section>
  )
}

function CommunityHealthFileStatus({
  label,
  file,
}: {
  label: string
  file: CommunityHealthFile
}) {
  return (
    <div>
      <dt>
        {file.htmlUrl ? (
          <a href={file.htmlUrl} target="_blank" rel="noreferrer">
            {label}
          </a>
        ) : (
          label
        )}
      </dt>
      <dd
        className={file.found ? 'health-status found' : 'health-status missing'}
      >
        {file.found ? 'Found' : 'Missing'}
      </dd>
    </div>
  )
}
