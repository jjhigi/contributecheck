export type RepositoryReference = {
  owner: string
  repository: string
}

type ParseRepositoryInputResult =
  | { ok: true; value: RepositoryReference }
  | { ok: false; error: string }

const ownerPattern = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/
const repositoryPattern = /^[A-Za-z0-9._-]{1,100}$/

export function parseRepositoryInput(
  rawInput: string,
): ParseRepositoryInputResult {
  const input = rawInput.trim()

  if (!input) {
    return {
      ok: false,
      error: 'Enter a GitHub repository as owner/repository or a GitHub URL.',
    }
  }

  const path = getRepositoryPath(input)

  if (!path) {
    return {
      ok: false,
      error: 'Enter a valid GitHub repository URL or owner/repository value.',
    }
  }

  const [owner, repository, ...extraSegments] = path
    .replace(/^\/+|\/+$/g, '')
    .split('/')

  if (!owner || !repository || extraSegments.length > 0) {
    return {
      ok: false,
      error: 'Use the format owner/repository, for example facebook/react.',
    }
  }

  const normalizedRepository = repository.endsWith('.git')
    ? repository.slice(0, -4)
    : repository

  if (!ownerPattern.test(owner)) {
    return {
      ok: false,
      error: 'Repository owner names can contain letters, numbers, and hyphens.',
    }
  }

  if (
    !repositoryPattern.test(normalizedRepository) ||
    normalizedRepository === '.' ||
    normalizedRepository === '..'
  ) {
    return {
      ok: false,
      error:
        'Repository names can contain letters, numbers, periods, underscores, and hyphens.',
    }
  }

  return {
    ok: true,
    value: {
      owner,
      repository: normalizedRepository,
    },
  }
}

function getRepositoryPath(input: string) {
  if (/^https?:\/\//i.test(input)) {
    try {
      const url = new URL(input)
      const host = url.hostname.toLowerCase()

      if (host !== 'github.com' && host !== 'www.github.com') {
        return null
      }

      return url.pathname
    } catch {
      return null
    }
  }

  return input
}
