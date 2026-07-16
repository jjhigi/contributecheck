export const githubHeaders = {
  Accept: 'application/vnd.github+json',
}

export function githubRepoUrl(owner: string, repository: string) {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`
}
