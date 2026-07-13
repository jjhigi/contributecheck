import type {
  FrameworkDetection,
  PullRequestMergeActivity,
  PullRequestReviewActivity,
} from './githubApi'

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

export function formatMergeRate(activity: PullRequestMergeActivity) {
  if (activity.status === 'unavailable') {
    return 'Unavailable'
  }

  if (activity.closedCount === 0) {
    return 'No closed PRs'
  }

  const mergeRate = Math.round(
    (activity.mergedCount / activity.closedCount) * 100,
  )

  return `${mergeRate}% (${numberFormatter.format(
    activity.mergedCount,
  )} of ${numberFormatter.format(activity.closedCount)})`
}

export function getMergeTimeLabel(activity: PullRequestMergeActivity) {
  if (activity.status === 'unavailable') {
    return 'Median merge time'
  }

  return `Median merge time (${activity.mergeTimeSampleSize} ${
    activity.mergeTimeSampleSize === 1 ? 'PR' : 'PRs'
  } sampled)`
}

export function formatMergeTime(activity: PullRequestMergeActivity) {
  if (activity.status === 'unavailable') {
    return 'Unavailable'
  }

  if (activity.mergedCount === 0) {
    return 'No merged PRs'
  }

  if (activity.medianMergeTimeDays === null) {
    return 'Unavailable'
  }

  return formatDuration(activity.medianMergeTimeDays)
}

export function getFirstReviewTimeLabel(
  activity: PullRequestReviewActivity,
) {
  if (
    activity.status === 'unavailable' ||
    activity.firstReviewSampleSize === 0
  ) {
    return 'Median time to first review'
  }

  return `Median time to first review (${activity.firstReviewSampleSize} ${
    activity.firstReviewSampleSize === 1 ? 'PR' : 'PRs'
  } sampled)`
}

export function formatFirstReviewTime(activity: PullRequestReviewActivity) {
  if (activity.status === 'unavailable') {
    return 'Unavailable'
  }

  if (activity.firstReviewSampleSize === 0) {
    return 'No outside reviews'
  }

  if (activity.medianFirstReviewTimeDays === null) {
    return 'Unavailable'
  }

  return formatDuration(activity.medianFirstReviewTimeDays)
}

export function formatReviewCoverage(activity: PullRequestReviewActivity) {
  if (activity.status === 'unavailable') {
    return 'Unavailable'
  }

  if (activity.sampledPullRequestCount === 0) {
    return 'No recent closed PRs'
  }

  const coverage = Math.round(
    (activity.reviewedPullRequestCount / activity.sampledPullRequestCount) * 100,
  )
  const pullRequestLabel =
    activity.sampledPullRequestCount === 1 ? 'PR' : 'PRs'

  return `${coverage}% (${numberFormatter.format(
    activity.reviewedPullRequestCount,
  )} of ${numberFormatter.format(
    activity.sampledPullRequestCount,
  )} ${pullRequestLabel})`
}

function formatDuration(days: number) {
  if (days < 1) {
    return 'Less than a day'
  }

  return `${days} day${days === 1 ? '' : 's'}`
}
