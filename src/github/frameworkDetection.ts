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
  | 'React'
  | 'Next.js'
  | 'Vue'
  | 'Django'
  | 'Flask'
  | 'FastAPI'
  | 'Spring Boot'
  | 'Quarkus'
  | 'Micronaut'

export type FrameworkDetection =
  | {
      status: 'detected'
      frameworks: SupportedFramework[]
      workspaceAvailable: boolean
    }
  | { status: 'not-detected'; workspaceAvailable: boolean }
  | { status: 'unavailable' }

export type WorkspaceFrameworkDetection =
  | { status: 'detected'; frameworks: SupportedFramework[] }
  | { status: 'not-detected' }
  | { status: 'unavailable' }

type FrameworkCandidate = {
  frameworks: SupportedFramework[]
  workspaceAvailable: boolean
}

const javascriptFrameworkDependencies: Array<{
  framework: SupportedFramework
  packageName: string
}> = [
  { framework: 'React', packageName: 'react' },
  { framework: 'Next.js', packageName: 'next' },
  { framework: 'Vue', packageName: 'vue' },
]

const pythonFrameworkDependencies: Array<{
  framework: SupportedFramework
  packageName: string
}> = [
  { framework: 'Django', packageName: 'django' },
  { framework: 'Flask', packageName: 'flask' },
  { framework: 'FastAPI', packageName: 'fastapi' },
]

const javaFrameworkSignals: Array<{
  framework: SupportedFramework
  signals: string[]
}> = [
  {
    framework: 'Spring Boot',
    signals: ['org.springframework.boot', 'spring-boot-starter'],
  },
  { framework: 'Quarkus', signals: ['io.quarkus'] },
  { framework: 'Micronaut', signals: ['io.micronaut'] },
]

const workspaceManifestLimit = 10
const frameworkDetectionLimit = 3
const pythonManifestPaths = ['pyproject.toml', 'requirements.txt', 'setup.py']
const javaManifestPaths = ['pom.xml', 'build.gradle', 'build.gradle.kts']
const javascriptFrameworkWorkspaceNames = new Set([
  'next',
  'react',
  'vue',
])

/** Detect root framework signals and whether workspace packages are available. */
export async function fetchFrameworkDetection(
  owner: string,
  repository: string,
  primaryLanguage: string | null,
): Promise<FrameworkDetection> {
  try {
    const normalizedLanguage = primaryLanguage?.toLowerCase()
    let detectors: Array<() => Promise<FrameworkCandidate>>

    if (normalizedLanguage === 'python') {
      detectors = [
        () => fetchPythonFrameworks(owner, repository),
        () => fetchJavaScriptRootFrameworks(owner, repository),
      ]
    } else if (normalizedLanguage === 'java') {
      detectors = [
        () => fetchJavaFrameworks(owner, repository),
        () => fetchJavaScriptRootFrameworks(owner, repository),
        () => fetchPythonFrameworks(owner, repository),
      ]
    } else {
      detectors = [
        () => fetchJavaScriptRootFrameworks(owner, repository),
        () => fetchPythonFrameworks(owner, repository),
      ]
    }

    let workspaceAvailable = false

    for (const detectFrameworks of detectors) {
      const candidate = await detectFrameworks()
      workspaceAvailable ||= candidate.workspaceAvailable

      if (candidate.frameworks.length > 0) {
        return {
          status: 'detected',
          frameworks: candidate.frameworks,
          workspaceAvailable,
        }
      }
    }

    return { status: 'not-detected', workspaceAvailable }
  } catch {
    return { status: 'unavailable' }
  }
}

export async function fetchWorkspaceFrameworkDetection(
  owner: string,
  repository: string,
): Promise<WorkspaceFrameworkDetection> {
  try {
    const packageManifest = await fetchPackageManifest(
      owner,
      repository,
      'package.json',
    )

    if (!packageManifest) {
      return { status: 'not-detected' }
    }

    const frameworks = await detectWorkspaceFrameworks(
      owner,
      repository,
      packageManifest,
    )

    return frameworks.length > 0
      ? {
          status: 'detected',
          frameworks: frameworks.slice(0, frameworkDetectionLimit),
        }
      : { status: 'not-detected' }
  } catch {
    return { status: 'unavailable' }
  }
}

async function fetchJavaScriptRootFrameworks(
  owner: string,
  repository: string,
): Promise<FrameworkCandidate> {
  const packageManifest = await fetchPackageManifest(
    owner,
    repository,
    'package.json',
  )

  if (!packageManifest) {
    return { frameworks: [], workspaceAvailable: false }
  }

  const frameworks = detectJavaScriptFrameworks(packageManifest).slice(
    0,
    frameworkDetectionLimit,
  )

  if (frameworks.length === frameworkDetectionLimit) {
    return { frameworks, workspaceAvailable: false }
  }

  const workspacePatterns = await getWorkspacePatterns(
    owner,
    repository,
    packageManifest,
  )

  return {
    frameworks,
    workspaceAvailable: workspacePatterns.length > 0,
  }
}

async function fetchPackageManifest(
  owner: string,
  repository: string,
  path: string,
) {
  const content = await fetchTextFile(owner, repository, path)

  return content
    ? (JSON.parse(content) as GitHubPackageManifest)
    : null
}

async function fetchTextFile(
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
    throw new Error('Unable to fetch repository file')
  }

  const file = (await response.json()) as GitHubContentFile

  if (file.encoding !== 'base64' || !file.content) {
    throw new Error('Invalid repository file response')
  }

  return decodeBase64(file.content)
}

async function fetchPythonFrameworks(
  owner: string,
  repository: string,
): Promise<FrameworkCandidate> {
  const manifests = await Promise.all(
    pythonManifestPaths.map((path) => fetchTextFile(owner, repository, path)),
  )
  const frameworks = new Set<SupportedFramework>()

  for (const manifest of manifests) {
    if (!manifest) {
      continue
    }

    for (const framework of detectPythonFrameworks(manifest)) {
      frameworks.add(framework)
    }

    if (frameworks.size >= frameworkDetectionLimit) {
      break
    }
  }

  return { frameworks: [...frameworks], workspaceAvailable: false }
}

async function fetchJavaFrameworks(
  owner: string,
  repository: string,
): Promise<FrameworkCandidate> {
  const manifests = await Promise.all(
    javaManifestPaths.map((path) => fetchTextFile(owner, repository, path)),
  )
  const frameworks = new Set<SupportedFramework>()

  for (const manifest of manifests) {
    if (!manifest) {
      continue
    }

    for (const framework of detectJavaFrameworks(manifest)) {
      frameworks.add(framework)
    }

    if (frameworks.size >= frameworkDetectionLimit) {
      break
    }
  }

  return { frameworks: [...frameworks], workspaceAvailable: false }
}

async function detectWorkspaceFrameworks(
  owner: string,
  repository: string,
  packageManifest: GitHubPackageManifest,
) {
  const workspaceManifestPaths = await getWorkspaceManifestPaths(
    owner,
    repository,
    packageManifest,
  )
  const frameworks = new Set<SupportedFramework>()

  for (const path of workspaceManifestPaths) {
    const workspaceManifest = await fetchPackageManifest(
      owner,
      repository,
      path,
    )
    const workspaceFrameworks = workspaceManifest
      ? detectJavaScriptFrameworks(workspaceManifest)
      : []

    for (const framework of workspaceFrameworks) {
      frameworks.add(framework)
    }

    if (frameworks.size >= frameworkDetectionLimit) {
      break
    }
  }

  return [...frameworks]
}

async function getWorkspaceManifestPaths(
  owner: string,
  repository: string,
  packageManifest: GitHubPackageManifest,
) {
  const patterns = await getWorkspacePatterns(
    owner,
    repository,
    packageManifest,
  )
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

async function getWorkspacePatterns(
  owner: string,
  repository: string,
  packageManifest: GitHubPackageManifest,
) {
  const packagePatterns = getPackageWorkspacePatterns(packageManifest)

  if (packagePatterns.length > 0) {
    return packagePatterns
  }

  const pnpmWorkspace = await fetchTextFile(
    owner,
    repository,
    'pnpm-workspace.yaml',
  )

  return parsePnpmWorkspacePatterns(pnpmWorkspace)
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

function getPackageWorkspacePatterns(packageManifest: GitHubPackageManifest) {
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

function parsePnpmWorkspacePatterns(content: string | null) {
  if (!content) {
    return []
  }

  const patterns: string[] = []
  let inPackagesSection = false

  for (const line of content.split(/\r?\n/)) {
    const trimmedLine = line.trim()

    if (trimmedLine === 'packages:') {
      inPackagesSection = true
      continue
    }

    if (inPackagesSection && /^[A-Za-z][\w-]*:\s*$/.test(trimmedLine)) {
      break
    }

    if (!inPackagesSection || !trimmedLine.startsWith('-')) {
      continue
    }

    const pattern = trimmedLine
      .slice(1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2')

    if (pattern) {
      patterns.push(pattern)
    }
  }

  return patterns
}

function isFrameworkWorkspace(entry: GitHubContentEntry) {
  return javascriptFrameworkWorkspaceNames.has(entry.name?.toLowerCase() || '')
}

function detectJavaScriptFrameworks(packageManifest: GitHubPackageManifest) {
  if (!packageManifest || typeof packageManifest !== 'object') {
    return []
  }

  const packageNames = new Set([
    packageManifest.name,
    ...Object.keys(packageManifest.dependencies ?? {}),
    ...Object.keys(packageManifest.devDependencies ?? {}),
    ...Object.keys(packageManifest.peerDependencies ?? {}),
  ].filter((packageName): packageName is string => typeof packageName === 'string'))

  return javascriptFrameworkDependencies
    .filter(({ packageName }) => packageNames.has(packageName))
    .map(({ framework }) => framework)
}

function detectPythonFrameworks(content: string) {
  return pythonFrameworkDependencies
    .filter(({ packageName }) => contentIncludesPackage(content, packageName))
    .map(({ framework }) => framework)
}

function detectJavaFrameworks(content: string) {
  const normalizedContent = content.toLowerCase()

  return javaFrameworkSignals
    .filter(({ signals }) =>
      signals.some((signal) => normalizedContent.includes(signal)),
    )
    .map(({ framework }) => framework)
}

function contentIncludesPackage(content: string, packageName: string) {
  const normalizedPackageName = normalizePackageName(packageName)

  return content.split(/\r?\n/).some((line) => {
    const packageNames =
      line.split('#')[0].match(/[A-Za-z][A-Za-z0-9_.-]*/g) || []

    return packageNames.some(
      (name) => normalizePackageName(name) === normalizedPackageName,
    )
  })
}

function normalizePackageName(packageName: string) {
  return packageName.toLowerCase().replace(/[-_.]/g, '')
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
