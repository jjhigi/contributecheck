import { githubHeaders, githubRepoUrl } from './githubApi'

type GitHubPullRequest = {
  number: number
  created_at: string
  user?: {
    login?: string
  } | null
}

type GitHubPullRequestReview = {
  submitted_at?: string | null
  author_association?: string
  user?: {
    login?: string
  } | null
}

type GitHubCommit = {
  commit: {
    author?: {
      date?: string
    } | null
  }
}

export type PullRequestActivity =
  | {
      status: 'available'
      openCount: number
      oldestOpenedAt: string | null
    }
  | { status: 'unavailable' }

export type PullRequestReviewActivity =
  | {
      status: 'available'
      medianFirstReviewTimeDays: number | null
      firstReviewSampleSize: number
      reviewedPullRequestCount: number
      sampledPullRequestCount: number
      medianProjectMemberReviewTimeDays: number | null
      projectMemberReviewSampleSize: number
      projectMemberReviewCount: number
      projectMemberReviewerCount: number
    }
  | { status: 'unavailable' }

export type LatestCommit = {
  committedAt: string
}

export type RepositoryActivity =
  | { status: 'available'; latestCommit: LatestCommit | null }
  | { status: 'unavailable' }

export type CommitActivityWeek = {
  week: number
  total: number
}

export type CommitActivity =
  | { status: 'available'; weeks: CommitActivityWeek[] }
  | { status: 'unavailable' }

const recentReviewPullRequestSampleSize = 10
const dayMilliseconds = 24 * 60 * 60 * 1000
const projectMemberAssociations = new Set([
  'OWNER',
  'MEMBER',
  'COLLABORATOR',
])

/** Fetch the count and oldest opened date for open pull requests. */
export async function fetchOpenPullRequests(
  owner: string,
  repository: string,
): Promise<PullRequestActivity> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/pulls?state=open&sort=created&direction=asc&per_page=1`,
      {
        headers: githubHeaders,
      },
    )

    if (!response.ok) {
      return { status: 'unavailable' }
    }

    const pullRequests = (await response.json()) as GitHubPullRequest[]

    return {
      status: 'available',
      openCount: getGitHubCollectionCount(response, pullRequests.length),
      oldestOpenedAt: pullRequests[0]?.created_at || null,
    }
  } catch {
    return { status: 'unavailable' }
  }
}

/**
 * Fetch review metrics for a bounded sample of recently updated pull requests.
 */
export async function fetchPullRequestReviewActivity(
  owner: string,
  repository: string,
): Promise<PullRequestReviewActivity> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/pulls?state=closed&sort=updated&direction=desc&per_page=${recentReviewPullRequestSampleSize}`,
      {
        headers: githubHeaders,
      },
    )

    if (!response.ok) {
      return { status: 'unavailable' }
    }

    const pullRequests = (await response.json()) as GitHubPullRequest[]
    const reviewResults = await Promise.all(
      pullRequests.map((pullRequest) =>
        fetchPullRequestReviews(owner, repository, pullRequest.number),
      ),
    )

    if (reviewResults.some((reviews) => reviews === null)) {
      return { status: 'unavailable' }
    }

    const successfulReviewResults =
      reviewResults as GitHubPullRequestReview[][]
    const outsideReviewStats = getReviewStats(
      pullRequests,
      successfulReviewResults,
    )
    const projectMemberReviewStats = getReviewStats(
      pullRequests,
      successfulReviewResults,
      isProjectMemberReview,
    )
    const projectMemberReviewerCount = getDistinctReviewerCount(
      pullRequests,
      successfulReviewResults,
      isProjectMemberReview,
    )

    return {
      status: 'available',
      medianFirstReviewTimeDays: outsideReviewStats.medianDays,
      firstReviewSampleSize: outsideReviewStats.sampleSize,
      reviewedPullRequestCount: outsideReviewStats.reviewedPullRequestCount,
      sampledPullRequestCount: pullRequests.length,
      medianProjectMemberReviewTimeDays:
        projectMemberReviewStats.medianDays,
      projectMemberReviewSampleSize: projectMemberReviewStats.sampleSize,
      projectMemberReviewCount:
        projectMemberReviewStats.reviewedPullRequestCount,
      projectMemberReviewerCount,
    }
  } catch {
    return { status: 'unavailable' }
  }
}

async function fetchPullRequestReviews(
  owner: string,
  repository: string,
  pullRequestNumber: number,
): Promise<GitHubPullRequestReview[] | null> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/pulls/${pullRequestNumber}/reviews?per_page=100`,
      {
        headers: githubHeaders,
      },
    )

    if (!response.ok) {
      return null
    }

    return (await response.json()) as GitHubPullRequestReview[]
  } catch {
    return null
  }
}

function getReviewStats(
  pullRequests: GitHubPullRequest[],
  reviewResults: GitHubPullRequestReview[][],
  qualifiesReview: (review: GitHubPullRequestReview) => boolean = () => true,
) {
  const durations = pullRequests
    .map((pullRequest, index) => {
      const createdAt = Date.parse(pullRequest.created_at || '')
      const authorLogin = pullRequest.user?.login?.toLowerCase()
      const firstReviewDuration = reviewResults[index]
        .map((review) => {
          const reviewerLogin = review.user?.login?.toLowerCase()
          const submittedAt = Date.parse(review.submitted_at || '')

          if (
            !authorLogin ||
            !reviewerLogin ||
            reviewerLogin === authorLogin ||
            !qualifiesReview(review) ||
            !Number.isFinite(createdAt) ||
            !Number.isFinite(submittedAt) ||
            submittedAt < createdAt
          ) {
            return null
          }

          return submittedAt - createdAt
        })
        .filter((duration): duration is number => duration !== null)
        .sort(
          (firstDuration, secondDuration) => firstDuration - secondDuration,
        )[0]

      return firstReviewDuration ?? null
    })
    .filter((duration): duration is number => duration !== null)
    .sort((firstDuration, secondDuration) => firstDuration - secondDuration)

  if (durations.length === 0) {
    return {
      medianDays: null,
      sampleSize: 0,
      reviewedPullRequestCount: getReviewedPullRequestCount(
        pullRequests,
        reviewResults,
        qualifiesReview,
      ),
    }
  }

  const middleIndex = Math.floor(durations.length / 2)
  const medianDuration =
    durations.length % 2 === 1
      ? durations[middleIndex]
      : (durations[middleIndex - 1] + durations[middleIndex]) / 2

  return {
    medianDays: Math.round(medianDuration / dayMilliseconds),
    sampleSize: durations.length,
    reviewedPullRequestCount: getReviewedPullRequestCount(
      pullRequests,
      reviewResults,
      qualifiesReview,
    ),
  }
}

function getReviewedPullRequestCount(
  pullRequests: GitHubPullRequest[],
  reviewResults: GitHubPullRequestReview[][],
  qualifiesReview: (review: GitHubPullRequestReview) => boolean = () => true,
) {
  return pullRequests.reduce((reviewedCount, pullRequest, index) => {
    const authorLogin = pullRequest.user?.login?.toLowerCase()
    const hasOutsideReview = reviewResults[index].some((review) => {
      const reviewerLogin = review.user?.login?.toLowerCase()
      const submittedAt = Date.parse(review.submitted_at || '')

      return Boolean(
        authorLogin &&
          reviewerLogin &&
          reviewerLogin !== authorLogin &&
          qualifiesReview(review) &&
          Number.isFinite(submittedAt),
      )
    })

    return reviewedCount + (hasOutsideReview ? 1 : 0)
  }, 0)
}

function getDistinctReviewerCount(
  pullRequests: GitHubPullRequest[],
  reviewResults: GitHubPullRequestReview[][],
  qualifiesReview: (review: GitHubPullRequestReview) => boolean,
) {
  const reviewerLogins = new Set<string>()

  pullRequests.forEach((pullRequest, index) => {
    const authorLogin = pullRequest.user?.login?.toLowerCase()

    reviewResults[index].forEach((review) => {
      const reviewerLogin = review.user?.login?.toLowerCase()
      const submittedAt = Date.parse(review.submitted_at || '')

      if (
        authorLogin &&
        reviewerLogin &&
        reviewerLogin !== authorLogin &&
        qualifiesReview(review) &&
        Number.isFinite(submittedAt)
      ) {
        reviewerLogins.add(reviewerLogin)
      }
    })
  })

  return reviewerLogins.size
}

function isProjectMemberReview(review: GitHubPullRequestReview) {
  return projectMemberAssociations.has(
    review.author_association?.toUpperCase() || '',
  )
}

function getGitHubCollectionCount(
  response: Response,
  fallbackCount: number,
) {
  const linkHeader = response.headers.get('link')
  const lastPageLink = linkHeader
    ?.split(',')
    .find((link) => link.includes('rel="last"'))
  const lastPageUrl = lastPageLink?.match(/<([^>]+)>/)?.[1]

  if (!lastPageUrl) {
    return fallbackCount
  }

  const lastPage = Number(new URL(lastPageUrl).searchParams.get('page'))

  return Number.isFinite(lastPage) ? lastPage : fallbackCount
}

/** Fetch the repository's most recent commit date. */
export async function fetchLatestCommit(
  owner: string,
  repository: string,
): Promise<RepositoryActivity> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/commits?per_page=1`,
      {
        headers: githubHeaders,
      },
    )

    if (!response.ok) {
      return { status: 'unavailable' }
    }

    const latestCommit = ((await response.json()) as GitHubCommit[])[0]

    return {
      status: 'available',
      latestCommit: latestCommit
        ? { committedAt: latestCommit.commit.author?.date || '' }
        : null,
    }
  } catch {
    return { status: 'unavailable' }
  }
}

/** Fetch weekly commit totals for the repository's most recent 12 weeks. */
export async function fetchCommitActivity(
  owner: string,
  repository: string,
): Promise<CommitActivity> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/stats/commit_activity`,
      {
        headers: githubHeaders,
      },
    )

    if (!response.ok) {
      return { status: 'unavailable' }
    }

    const weeks = ((await response.json()) as CommitActivityWeek[])
      .filter(
        (week) =>
          Number.isFinite(week.week) && Number.isFinite(week.total),
      )
      .sort((firstWeek, secondWeek) => firstWeek.week - secondWeek.week)
      .slice(-12)

    return { status: 'available', weeks }
  } catch {
    return { status: 'unavailable' }
  }
}
