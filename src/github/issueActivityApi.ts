import { githubHeaders, githubRepoUrl } from './githubApi'

type GitHubIssue = {
  number: number
  created_at: string
  user?: {
    login?: string
  } | null
  pull_request?: unknown
}

type GitHubIssueComment = {
  created_at: string
  author_association?: string | null
  user?: {
    login?: string
  } | null
}

export type IssueResponseActivity =
  | {
      status: 'available'
      sampledIssueCount: number
      projectMemberResponseCount: number
      responseTimingSampleSize: number
      medianProjectMemberResponseTimeDays: number | null
    }
  | { status: 'unavailable' }

const recentIssueSampleSize = 10
const dayMilliseconds = 24 * 60 * 60 * 1000
const projectMemberAssociations = new Set([
  'OWNER',
  'MEMBER',
  'COLLABORATOR',
])

/** Fetch response metrics for a bounded sample of recently updated issues. */
export async function fetchIssueResponseActivity(
  owner: string,
  repository: string,
): Promise<IssueResponseActivity> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/issues?state=closed&sort=updated&direction=desc&per_page=${recentIssueSampleSize * 3}`,
      {
        headers: githubHeaders,
      },
    )

    if (!response.ok) {
      return { status: 'unavailable' }
    }

    const issues = ((await response.json()) as GitHubIssue[])
      .filter((issue) => !issue.pull_request)
      .slice(0, recentIssueSampleSize)
    const commentResults = await Promise.all(
      issues.map((issue) => fetchIssueComments(owner, repository, issue.number)),
    )

    if (commentResults.some((comments) => comments === null)) {
      return { status: 'unavailable' }
    }

    const issueResponses = issues.map((issue, index) =>
      getIssueResponse(issue, commentResults[index] as GitHubIssueComment[]),
    )
    const responseTimes = issueResponses
      .map((responseResult) => responseResult.responseTimeMilliseconds)
      .filter((duration): duration is number => duration !== null)
      .sort((firstDuration, secondDuration) => firstDuration - secondDuration)

    return {
      status: 'available',
      sampledIssueCount: issues.length,
      projectMemberResponseCount: issueResponses.filter(
        (responseResult) => responseResult.hasResponse,
      ).length,
      responseTimingSampleSize: responseTimes.length,
      medianProjectMemberResponseTimeDays: getMedianDays(responseTimes),
    }
  } catch {
    return { status: 'unavailable' }
  }
}

async function fetchIssueComments(
  owner: string,
  repository: string,
  issueNumber: number,
): Promise<GitHubIssueComment[] | null> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/issues/${issueNumber}/comments?sort=created&direction=asc&per_page=100`,
      {
        headers: githubHeaders,
      },
    )

    if (!response.ok) {
      return null
    }

    return (await response.json()) as GitHubIssueComment[]
  } catch {
    return null
  }
}

function getIssueResponse(
  issue: GitHubIssue,
  comments: GitHubIssueComment[],
) {
  const authorLogin = issue.user?.login?.toLowerCase()
  const issueCreatedAt = Date.parse(issue.created_at || '')
  const response = comments.find((comment) => {
    const commenterLogin = comment.user?.login?.toLowerCase()

    return Boolean(
      authorLogin &&
        commenterLogin &&
        commenterLogin !== authorLogin &&
        isProjectMemberComment(comment),
    )
  })

  if (!response) {
    return { hasResponse: false, responseTimeMilliseconds: null }
  }

  const responseCreatedAt = Date.parse(response.created_at || '')
  const responseTimeMilliseconds =
    Number.isFinite(issueCreatedAt) &&
    Number.isFinite(responseCreatedAt) &&
    responseCreatedAt >= issueCreatedAt
      ? responseCreatedAt - issueCreatedAt
      : null

  return { hasResponse: true, responseTimeMilliseconds }
}

function isProjectMemberComment(comment: GitHubIssueComment) {
  return projectMemberAssociations.has(
    comment.author_association?.toUpperCase() || '',
  )
}

function getMedianDays(durations: number[]) {
  if (durations.length === 0) {
    return null
  }

  const middleIndex = Math.floor(durations.length / 2)
  const medianDuration =
    durations.length % 2 === 1
      ? durations[middleIndex]
      : (durations[middleIndex - 1] + durations[middleIndex]) / 2

  return Math.round(medianDuration / dayMilliseconds)
}
