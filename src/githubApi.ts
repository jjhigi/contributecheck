export type GitHubRepository = {
  name: string
  owner: {
    login: string
  }
  description: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  updated_at: string
  html_url: string
}

type GitHubCommunityProfile = {
  files?: {
    code_of_conduct?: unknown | null
    contributing?: unknown | null
    issue_template?: unknown | null
    pull_request_template?: unknown | null
  }
}

type GitHubIssue = {
  number: number
  title: string
  html_url: string
  pull_request?: unknown
}

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

type GitHubContentFile = {
  content?: string
  encoding?: string
}

type GitHubPackageManifest = {
  dependencies?: Record<string, unknown>
  devDependencies?: Record<string, unknown>
  peerDependencies?: Record<string, unknown>
}

export type CommunityHealthFileStates = {
  codeOfConduct: boolean
  contributing: boolean
  issueTemplates: boolean
  pullRequestTemplate: boolean
}

export type CommunityHealth =
  | { status: 'available'; files: CommunityHealthFileStates }
  | { status: 'unavailable' }

export type GoodFirstIssue = {
  number: number
  title: string
  htmlUrl: string
}

export type GoodFirstIssues =
  | { status: 'available'; issues: GoodFirstIssue[] }
  | { status: 'unavailable' }

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
      medianAffiliatedReviewTimeDays: number | null
      affiliatedReviewSampleSize: number
      affiliatedReviewCount: number
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

export type SupportedFramework =
  | 'Next.js'
  | 'React'
  | 'Vue'
  | 'Angular'
  | 'Svelte'

export type FrameworkDetection =
  | { status: 'detected'; framework: SupportedFramework }
  | { status: 'not-detected' }
  | { status: 'unavailable' }

export type RepositoryFetchResult =
  | { status: 'success'; repository: GitHubRepository }
  | { status: 'not-found' }
  | { status: 'rate-limited' }
  | { status: 'forbidden' }
  | { status: 'failed' }
  | { status: 'network-error' }

const githubHeaders = {
  Accept: 'application/vnd.github+json',
}

const recentReviewPullRequestSampleSize = 10
const dayMilliseconds = 24 * 60 * 60 * 1000
const repositoryAffiliatedAssociations = new Set([
  'OWNER',
  'MEMBER',
  'COLLABORATOR',
])

const frameworkDependencies: Array<{
  framework: SupportedFramework
  packageName: string
}> = [
  { framework: 'Next.js', packageName: 'next' },
  { framework: 'React', packageName: 'react' },
  { framework: 'Vue', packageName: 'vue' },
  { framework: 'Angular', packageName: '@angular/core' },
  { framework: 'Svelte', packageName: 'svelte' },
]

/** Fetch repository details and map common GitHub API failures to UI states. */
export async function fetchRepository(
  owner: string,
  repository: string,
): Promise<RepositoryFetchResult> {
  try {
    const response = await fetch(githubRepoUrl(owner, repository), {
      headers: githubHeaders,
    })

    if (response.status === 404) {
      return { status: 'not-found' }
    }

    if (response.status === 403 || response.status === 429) {
      const remainingRequests = response.headers.get('x-ratelimit-remaining')

      return {
        status: remainingRequests === '0' ? 'rate-limited' : 'forbidden',
      }
    }

    if (!response.ok) {
      return { status: 'failed' }
    }

    const repositoryData = (await response.json()) as GitHubRepository

    return { status: 'success', repository: repositoryData }
  } catch {
    return { status: 'network-error' }
  }
}

/** Fetch contributor-facing community health file availability. */
export async function fetchCommunityHealth(
  owner: string,
  repository: string,
): Promise<CommunityHealth> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/community/profile`,
      {
        headers: githubHeaders,
      },
    )

    if (!response.ok) {
      return { status: 'unavailable' }
    }

    const communityProfile = (await response.json()) as GitHubCommunityProfile

    return {
      status: 'available',
      files: {
        codeOfConduct: Boolean(communityProfile.files?.code_of_conduct),
        contributing: Boolean(communityProfile.files?.contributing),
        issueTemplates: Boolean(communityProfile.files?.issue_template),
        pullRequestTemplate: Boolean(
          communityProfile.files?.pull_request_template,
        ),
      },
    }
  } catch {
    return { status: 'unavailable' }
  }
}

/** Fetch open issues labeled as good first issues. */
export async function fetchGoodFirstIssues(
  owner: string,
  repository: string,
): Promise<GoodFirstIssues> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/issues?state=open&labels=${encodeURIComponent('good first issue')}&per_page=5`,
      {
        headers: githubHeaders,
      },
    )

    if (!response.ok) {
      return { status: 'unavailable' }
    }

    const issues = ((await response.json()) as GitHubIssue[])
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        htmlUrl: issue.html_url,
      }))

    return { status: 'available', issues }
  } catch {
    return { status: 'unavailable' }
  }
}

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

/** Fetch first-review timing for a bounded sample of recently updated pull requests. */
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

    const outsideReviewStats = getReviewStats(
      pullRequests,
      reviewResults as GitHubPullRequestReview[][],
    )
    const affiliatedReviewStats = getReviewStats(
      pullRequests,
      reviewResults as GitHubPullRequestReview[][],
      isRepositoryAffiliatedReview,
    )

    return {
      status: 'available',
      medianFirstReviewTimeDays: outsideReviewStats.medianDays,
      firstReviewSampleSize: outsideReviewStats.sampleSize,
      reviewedPullRequestCount: outsideReviewStats.reviewedPullRequestCount,
      sampledPullRequestCount: pullRequests.length,
      medianAffiliatedReviewTimeDays: affiliatedReviewStats.medianDays,
      affiliatedReviewSampleSize: affiliatedReviewStats.sampleSize,
      affiliatedReviewCount: affiliatedReviewStats.reviewedPullRequestCount,
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
        .sort((firstDuration, secondDuration) => firstDuration - secondDuration)[0]

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

function isRepositoryAffiliatedReview(review: GitHubPullRequestReview) {
  return repositoryAffiliatedAssociations.has(
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

/** Detect a supported framework from the repository's root package.json. */
export async function fetchFrameworkDetection(
  owner: string,
  repository: string,
): Promise<FrameworkDetection> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/contents/package.json`,
      {
        headers: githubHeaders,
      },
    )

    if (response.status === 404) {
      return { status: 'not-detected' }
    }

    if (!response.ok) {
      return { status: 'unavailable' }
    }

    const packageFile = (await response.json()) as GitHubContentFile

    if (packageFile.encoding !== 'base64' || !packageFile.content) {
      return { status: 'unavailable' }
    }

    const packageManifest = JSON.parse(
      decodeBase64(packageFile.content),
    ) as GitHubPackageManifest
    const framework = detectFramework(packageManifest)

    return framework
      ? { status: 'detected', framework }
      : { status: 'not-detected' }
  } catch {
    return { status: 'unavailable' }
  }
}

function detectFramework(packageManifest: GitHubPackageManifest) {
  if (!packageManifest || typeof packageManifest !== 'object') {
    return null
  }

  const packageNames = [
    ...Object.keys(packageManifest.dependencies ?? {}),
    ...Object.keys(packageManifest.devDependencies ?? {}),
    ...Object.keys(packageManifest.peerDependencies ?? {}),
  ]

  return (
    frameworkDependencies.find(({ packageName }) =>
      packageNames.includes(packageName),
    )?.framework ?? null
  )
}

function decodeBase64(value: string) {
  const binaryValue = atob(value.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binaryValue, (character) =>
    character.charCodeAt(0),
  )

  return new TextDecoder().decode(bytes)
}

function githubRepoUrl(owner: string, repository: string) {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`
}
