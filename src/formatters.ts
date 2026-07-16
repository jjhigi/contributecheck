import type { FrameworkDetection, PullRequestReviewActivity } from './githubApi'

export const numberFormatter = new Intl.NumberFormat('en-US')

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return dateFormatter.format(date)
}

export function formatAge(value: string) {
  const date = new Date(value)
  const elapsedMilliseconds = Date.now() - date.getTime()

  if (Number.isNaN(date.getTime()) || elapsedMilliseconds < 0) {
    return 'Unknown'
  }

  if (elapsedMilliseconds < 60 * 1000) {
    return 'Less than a minute'
  }

  const ageUnits = [
    { label: 'year', milliseconds: 365 * 24 * 60 * 60 * 1000 },
    { label: 'month', milliseconds: 30 * 24 * 60 * 60 * 1000 },
    { label: 'day', milliseconds: 24 * 60 * 60 * 1000 },
    { label: 'hour', milliseconds: 60 * 60 * 1000 },
    { label: 'minute', milliseconds: 60 * 1000 },
  ]
  const ageUnit =
    ageUnits.find((unit) => elapsedMilliseconds >= unit.milliseconds) ||
    ageUnits[ageUnits.length - 1]
  const age = Math.floor(elapsedMilliseconds / ageUnit.milliseconds)

  return `${age} ${ageUnit.label}${age === 1 ? '' : 's'}`
}

export function formatFramework(detection: FrameworkDetection) {
  switch (detection.status) {
    case 'detected':
      return detection.framework
    case 'not-detected':
      return 'Not detected'
    case 'unavailable':
      return 'Unavailable'
  }
}

export function formatFirstReviewTime(activity: PullRequestReviewActivity) {
  if (activity.status === 'unavailable') {
    return 'Unavailable'
  }

  if (activity.sampledPullRequestCount === 0) {
    return 'No recent closed PRs'
  }

  if (activity.firstReviewSampleSize === 0) {
    return 'No valid timing data'
  }

  if (activity.medianFirstReviewTimeDays === null) {
    return 'Unavailable'
  }

  return formatDuration(activity.medianFirstReviewTimeDays)
}

export function formatFirstReviewSampleNote(
  activity: PullRequestReviewActivity,
) {
  if (activity.status === 'unavailable') {
    return 'Review sample unavailable'
  }

  if (activity.sampledPullRequestCount === 0) {
    return 'No recent closed PRs were available'
  }

  if (activity.firstReviewSampleSize === 0) {
    if (activity.reviewedPullRequestCount === 0) {
      return `No outside reviews found in ${numberFormatter.format(
        activity.sampledPullRequestCount,
      )} recent closed PRs`
    }

    return `${numberFormatter.format(
      activity.reviewedPullRequestCount,
    )} of ${numberFormatter.format(
      activity.sampledPullRequestCount,
    )} recent closed PRs had outside reviews, but none had valid timing data`
  }

  const pullRequestLabel =
    activity.firstReviewSampleSize === 1 ? 'PR' : 'PRs'

  return `${numberFormatter.format(
    activity.firstReviewSampleSize,
  )} ${pullRequestLabel} with valid timing data`
}

export function formatReviewCoverage(activity: PullRequestReviewActivity) {
  if (activity.status === 'unavailable') {
    return 'Unavailable'
  }

  if (activity.sampledPullRequestCount === 0) {
    return 'No recent closed PRs'
  }

  const coverage = Math.round(
    (activity.reviewedPullRequestCount / activity.sampledPullRequestCount) *
      100,
  )

  return `${coverage}%`
}

export function formatReviewCoverageNote(
  activity: PullRequestReviewActivity,
) {
  if (activity.status === 'unavailable') {
    return 'Review sample unavailable'
  }

  if (activity.sampledPullRequestCount === 0) {
    return 'No recent closed PRs were available'
  }

  const pullRequestLabel =
    activity.sampledPullRequestCount === 1 ? 'PR' : 'PRs'

  return `${numberFormatter.format(
    activity.reviewedPullRequestCount,
  )} of ${numberFormatter.format(
    activity.sampledPullRequestCount,
  )} recent closed ${pullRequestLabel} received an outside review`
}

function formatDuration(days: number) {
  if (days < 1) {
    return 'Less than a day'
  }

  return `${days} day${days === 1 ? '' : 's'}`
}
