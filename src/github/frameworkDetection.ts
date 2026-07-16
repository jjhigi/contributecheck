import { githubHeaders, githubRepoUrl } from './githubApi'

type GitHubContentFile = {
  content?: string
  encoding?: string
}

type GitHubContentEntry = {
  name?: string
  path?: string
  type?: string
}

type GitHubPackageManifest = {
  name?: string
  dependencies?: Record<string, unknown>
  devDependencies?: Record<string, unknown>
  peerDependencies?: Record<string, unknown>
  workspaces?:
    | string[]
    | {
        packages?: string[]
      }
}

export type SupportedFramework =
  | 'Next.js'
  | 'React'
  | 'Vue'
  | 'Angular'
  | 'Svelte'
  | 'Electron'

export type FrameworkDetection =
  | { status: 'detected'; framework: SupportedFramework }
  | { status: 'not-detected' }
  | { status: 'unavailable' }

const frameworkDependencies: Array<{
  framework: SupportedFramework
  packageName: string
}> = [
  { framework: 'Next.js', packageName: 'next' },
  { framework: 'React', packageName: 'react' },
  { framework: 'Vue', packageName: 'vue' },
  { framework: 'Angular', packageName: '@angular/core' },
  { framework: 'Svelte', packageName: 'svelte' },
  { framework: 'Electron', packageName: 'electron' },
]

const workspaceManifestLimit = 20
const frameworkWorkspaceNames = new Set([
  'next',
  'react',
  'vue',
  'angular',
  'svelte',
  'electron',
])

/** Detect a supported framework from root and bounded workspace manifests. */
export async function fetchFrameworkDetection(
  owner: string,
  repository: string,
): Promise<FrameworkDetection> {
  try {
    const packageManifest = await fetchPackageManifest(
      owner,
      repository,
      'package.json',
    )

    if (!packageManifest) {
      return { status: 'not-detected' }
    }

    const framework =
      detectFramework(packageManifest) ||
      (await detectWorkspaceFramework(owner, repository, packageManifest))

    return framework
      ? { status: 'detected', framework }
      : { status: 'not-detected' }
  } catch {
    return { status: 'unavailable' }
  }
}

async function fetchPackageManifest(
  owner: string,
  repository: string,
  path: string,
) {
  const response = await fetch(githubContentsUrl(owner, repository, path), {
    headers: githubHeaders,
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Unable to fetch package manifest')
  }

  const packageFile = (await response.json()) as GitHubContentFile

  if (packageFile.encoding !== 'base64' || !packageFile.content) {
    throw new Error('Invalid package manifest response')
  }

  return JSON.parse(decodeBase64(packageFile.content)) as GitHubPackageManifest
}

async function detectWorkspaceFramework(
  owner: string,
  repository: string,
  packageManifest: GitHubPackageManifest,
) {
  const workspaceManifestPaths = await getWorkspaceManifestPaths(
    owner,
    repository,
    packageManifest,
  )

  for (const path of workspaceManifestPaths) {
    const workspaceManifest = await fetchPackageManifest(
      owner,
      repository,
      path,
    )
    const framework = workspaceManifest
      ? detectFramework(workspaceManifest)
      : null

    if (framework) {
      return framework
    }
  }

  return null
}

async function getWorkspaceManifestPaths(
  owner: string,
  repository: string,
  packageManifest: GitHubPackageManifest,
) {
  const patterns = getWorkspacePatterns(packageManifest)
  const paths: string[] = []

  for (const pattern of patterns) {
    const normalizedPattern = pattern.replace(/\\/g, '/').replace(/\/$/, '')

    if (normalizedPattern.endsWith('/*')) {
      const directoryPath = normalizedPattern.slice(0, -2)
      const entries = await fetchContentEntries(
        owner,
        repository,
        directoryPath,
      )

      entries
        .filter((entry) => entry.type === 'dir' && entry.path)
        .sort((firstEntry, secondEntry) => {
          const firstIsFramework = isFrameworkWorkspace(firstEntry)
          const secondIsFramework = isFrameworkWorkspace(secondEntry)

          return Number(secondIsFramework) - Number(firstIsFramework)
        })
        .slice(0, workspaceManifestLimit)
        .forEach((entry) => {
          if (entry.path) {
            paths.push(`${entry.path}/package.json`)
          }
        })

      continue
    }

    if (!normalizedPattern.includes('*')) {
      paths.push(
        normalizedPattern.endsWith('package.json')
          ? normalizedPattern
          : `${normalizedPattern}/package.json`,
      )
    }
  }

  return [...new Set(paths)].slice(0, workspaceManifestLimit)
}

async function fetchContentEntries(
  owner: string,
  repository: string,
  path: string,
) {
  const response = await fetch(githubContentsUrl(owner, repository, path), {
    headers: githubHeaders,
  })

  if (response.status === 404) {
    return []
  }

  if (!response.ok) {
    throw new Error('Unable to fetch workspace directory')
  }

  return (await response.json()) as GitHubContentEntry[]
}

function getWorkspacePatterns(packageManifest: GitHubPackageManifest) {
  const workspaces = packageManifest.workspaces

  if (Array.isArray(workspaces)) {
    return workspaces.filter(
      (pattern): pattern is string => typeof pattern === 'string',
    )
  }

  if (!workspaces || typeof workspaces !== 'object') {
    return []
  }

  return workspaces.packages?.filter(
    (pattern): pattern is string => typeof pattern === 'string',
  ) || []
}

function isFrameworkWorkspace(entry: GitHubContentEntry) {
  return frameworkWorkspaceNames.has(entry.name?.toLowerCase() || '')
}

function detectFramework(packageManifest: GitHubPackageManifest) {
  if (!packageManifest || typeof packageManifest !== 'object') {
    return null
  }

  const packageNames = [
    packageManifest.name,
    ...Object.keys(packageManifest.dependencies ?? {}),
    ...Object.keys(packageManifest.devDependencies ?? {}),
    ...Object.keys(packageManifest.peerDependencies ?? {}),
  ].filter((packageName): packageName is string => typeof packageName === 'string')

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

function githubContentsUrl(owner: string, repository: string, path: string) {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')

  return `${githubRepoUrl(owner, repository)}/contents/${encodedPath}`
}
