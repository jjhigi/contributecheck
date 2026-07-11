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
  title: string
  user?: {
    login: string
  } | null
  created_at: string
  html_url: string
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

export type PullRequestSummary = {
  number: number
  title: string
  author: string
  createdAt: string
  htmlUrl: string
}

export type PullRequestActivity =
  | { status: 'available'; pullRequests: PullRequestSummary[] }
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

/** Fetch a small snapshot of currently open pull requests. */
export async function fetchOpenPullRequests(
  owner: string,
  repository: string,
): Promise<PullRequestActivity> {
  try {
    const response = await fetch(
      `${githubRepoUrl(owner, repository)}/pulls?state=open&per_page=5`,
      {
        headers: githubHeaders,
      },
    )

    if (!response.ok) {
      return { status: 'unavailable' }
    }

    const pullRequests = (
      (await response.json()) as GitHubPullRequest[]
    ).map((pullRequest) => ({
      number: pullRequest.number,
      title: pullRequest.title,
      author: pullRequest.user?.login || 'Unknown author',
      createdAt: pullRequest.created_at,
      htmlUrl: pullRequest.html_url,
    }))

    return { status: 'available', pullRequests }
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
