import { githubHeaders, githubRepoUrl } from './githubApi'

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
  archived: boolean
  license: GitHubLicense | null
}

type GitHubLicense = {
  name?: string | null
  spdx_id?: string | null
  html_url?: string | null
}

type GitHubCommunityProfile = {
  files?: {
    code_of_conduct?: GitHubCommunityFile | null
    code_of_conduct_file?: GitHubCommunityFile | null
    contributing?: GitHubCommunityFile | null
    issue_template?: GitHubCommunityFile | null
    pull_request_template?: GitHubCommunityFile | null
  }
}

type GitHubCommunityFile = {
  html_url?: string | null
}

type GitHubIssue = {
  number: number
  title: string
  html_url: string
  pull_request?: unknown
}

export type CommunityHealthFile = {
  found: boolean
  htmlUrl: string | null
}

export type CommunityHealthFileStates = {
  codeOfConduct: CommunityHealthFile
  contributing: CommunityHealthFile
  issueTemplates: CommunityHealthFile
  pullRequestTemplate: CommunityHealthFile
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

export type RepositoryFetchResult =
  | { status: 'success'; repository: GitHubRepository }
  | { status: 'not-found' }
  | { status: 'rate-limited' }
  | { status: 'forbidden' }
  | { status: 'failed' }
  | { status: 'network-error' }

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
    const files = communityProfile.files
    const codeOfConductFile = files?.code_of_conduct_file
    const codeOfConduct = files?.code_of_conduct

    return {
      status: 'available',
      files: {
        codeOfConduct: {
          found: Boolean(codeOfConduct || codeOfConductFile),
          htmlUrl: codeOfConductFile?.html_url || null,
        },
        contributing: getCommunityFileState(files?.contributing),
        issueTemplates: getCommunityFileState(files?.issue_template),
        pullRequestTemplate: getCommunityFileState(
          files?.pull_request_template,
        ),
      },
    }
  } catch {
    return { status: 'unavailable' }
  }
}

function getCommunityFileState(
  file: GitHubCommunityFile | null | undefined,
): CommunityHealthFile {
  return {
    found: Boolean(file),
    htmlUrl: file?.html_url || null,
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
