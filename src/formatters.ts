import type { FrameworkDetection } from './github/frameworkDetection'
import type { PullRequestReviewActivity } from './github/activityApi'

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
      return 'No supported framework detected'
    case 'unavailable':
      return 'Unavailable'
  }
}

export function formatFirstReviewTime(activity: PullRequestReviewActivity) {
  return formatReviewTime(
    activity,
    activity.status === 'available' ? activity.firstReviewSampleSize : 0,
    activity.status === 'available'
      ? activity.medianFirstReviewTimeDays
      : null,
  )
}

export function formatAffiliatedReviewTime(
  activity: PullRequestReviewActivity,
) {
  return formatReviewTime(
    activity,
    activity.status === 'available' ? activity.affiliatedReviewSampleSize : 0,
    activity.status === 'available'
      ? activity.medianAffiliatedReviewTimeDays
      : null,
  )
}

function formatReviewTime(
  activity: PullRequestReviewActivity,
  sampleSize: number,
  medianDays: number | null,
) {
  if (activity.status === 'unavailable') {
    return 'Unavailable'
  }

  if (activity.sampledPullRequestCount === 0) {
    return 'No recent closed PRs'
  }

  if (sampleSize === 0) {
    return 'No valid timing data'
  }

  if (medianDays === null) {
    return 'Unavailable'
  }

  return formatDuration(medianDays)
}

export function formatFirstReviewSampleNote(
  activity: PullRequestReviewActivity,
) {
  if (activity.status === 'unavailable') {
    return 'Review sample unavailable'
  }

  return formatReviewSampleNote(
    activity,
    activity.reviewedPullRequestCount,
    activity.firstReviewSampleSize,
    'outside',
  )
}

export function formatAffiliatedReviewSampleNote(
  activity: PullRequestReviewActivity,
) {
  if (activity.status === 'unavailable') {
    return 'Review sample unavailable'
  }

  return formatReviewSampleNote(
    activity,
    activity.affiliatedReviewCount,
    activity.affiliatedReviewSampleSize,
    'repository-affiliated',
  )
}

function formatReviewSampleNote(
  activity: Extract<PullRequestReviewActivity, { status: 'available' }>,
  reviewedCount: number,
  sampleSize: number,
  reviewType: string,
) {
  if (activity.sampledPullRequestCount === 0) {
    return 'No recent closed PRs were available'
  }

  if (sampleSize === 0) {
    if (reviewedCount === 0) {
      return `No ${reviewType} reviews found in ${numberFormatter.format(
        activity.sampledPullRequestCount,
      )} recent closed PRs`
    }

    return `${numberFormatter.format(
      reviewedCount,
    )} of ${numberFormatter.format(
      activity.sampledPullRequestCount,
    )} recent closed PRs had ${reviewType} reviews, but none had valid timing data`
  }

  const pullRequestLabel = sampleSize === 1 ? 'PR' : 'PRs'

  return `${numberFormatter.format(
    sampleSize,
  )} ${pullRequestLabel} with valid timing data`
}

export function formatReviewCoverage(activity: PullRequestReviewActivity) {
  return formatCoverage(
    activity,
    activity.status === 'available' ? activity.reviewedPullRequestCount : 0,
  )
}

export function formatAffiliatedReviewCoverage(
  activity: PullRequestReviewActivity,
) {
  return formatCoverage(
    activity,
    activity.status === 'available' ? activity.affiliatedReviewCount : 0,
  )
}

function formatCoverage(
  activity: PullRequestReviewActivity,
  reviewedCount: number,
) {
  if (activity.status === 'unavailable') {
    return 'Unavailable'
  }

  if (activity.sampledPullRequestCount === 0) {
    return 'No recent closed PRs'
  }

  const coverage = Math.round(
    (reviewedCount / activity.sampledPullRequestCount) *
      100,
  )

  return `${coverage}%`
}

export function formatReviewCoverageNote(
  activity: PullRequestReviewActivity,
) {
  return formatCoverageNote(
    activity,
    activity.status === 'available' ? activity.reviewedPullRequestCount : 0,
    'an outside review',
  )
}

export function formatAffiliatedReviewCoverageNote(
  activity: PullRequestReviewActivity,
) {
  return formatCoverageNote(
    activity,
    activity.status === 'available' ? activity.affiliatedReviewCount : 0,
    'a repository-affiliated review',
  )
}

function formatCoverageNote(
  activity: PullRequestReviewActivity,
  reviewedCount: number,
  reviewLabel: string,
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
    reviewedCount,
  )} of ${numberFormatter.format(
    activity.sampledPullRequestCount,
  )} recent closed ${pullRequestLabel} received ${reviewLabel}`
}

function formatDuration(days: number) {
  if (days < 1) {
    return 'Less than a day'
  }

  return `${days} day${days === 1 ? '' : 's'}`
}
