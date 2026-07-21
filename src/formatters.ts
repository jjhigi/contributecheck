import type { FrameworkDetection } from './github/frameworkDetection'
import type { PullRequestReviewActivity } from './github/activityApi'
import type { IssueResponseActivity } from './github/issueActivityApi'

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

export function formatProjectMemberReviewTime(
  activity: PullRequestReviewActivity,
) {
  return formatReviewTime(
    activity,
    activity.status === 'available'
      ? activity.projectMemberReviewSampleSize
      : 0,
    activity.status === 'available'
      ? activity.medianProjectMemberReviewTimeDays
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
    'reviews from someone other than the author',
  )
}

export function formatProjectMemberReviewSampleNote(
  activity: PullRequestReviewActivity,
) {
  if (activity.status === 'unavailable') {
    return 'Review sample unavailable'
  }

  return formatReviewSampleNote(
    activity,
    activity.projectMemberReviewCount,
    activity.projectMemberReviewSampleSize,
    'project-member reviews',
  )
}

function formatReviewSampleNote(
  activity: Extract<PullRequestReviewActivity, { status: 'available' }>,
  reviewedCount: number,
  sampleSize: number,
  reviewDescription: string,
) {
  if (activity.sampledPullRequestCount === 0) {
    return 'No recent closed PRs were available'
  }

  if (sampleSize === 0) {
    if (reviewedCount === 0) {
      return `No ${reviewDescription} found in ${numberFormatter.format(
        activity.sampledPullRequestCount,
      )} recent closed PRs`
    }

    return `${numberFormatter.format(
      reviewedCount,
    )} of ${numberFormatter.format(
      activity.sampledPullRequestCount,
    )} recent closed PRs received ${reviewDescription}, but none had valid timing data`
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

export function formatProjectMemberReviewCoverage(
  activity: PullRequestReviewActivity,
) {
  return formatCoverage(
    activity,
    activity.status === 'available'
      ? activity.projectMemberReviewCount
      : 0,
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
    'a review from someone other than the author',
  )
}

export function formatProjectMemberReviewCoverageNote(
  activity: PullRequestReviewActivity,
) {
  return formatCoverageNote(
    activity,
    activity.status === 'available'
      ? activity.projectMemberReviewCount
      : 0,
    'a project-member review',
  )
}

export function formatProjectMemberReviewerNote(
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

  return `Each reviewer counted once across ${numberFormatter.format(
    activity.sampledPullRequestCount,
  )} recent closed ${pullRequestLabel}`
}

export function formatIssueResponseTime(activity: IssueResponseActivity) {
  if (activity.status === 'unavailable') {
    return 'Unavailable'
  }

  if (activity.sampledIssueCount === 0) {
    return 'No recent closed issues'
  }

  if (activity.responseTimingSampleSize === 0) {
    return 'No valid timing data'
  }

  if (activity.medianProjectMemberResponseTimeDays === null) {
    return 'Unavailable'
  }

  return formatDuration(activity.medianProjectMemberResponseTimeDays)
}

export function formatIssueResponseSampleNote(activity: IssueResponseActivity) {
  if (activity.status === 'unavailable') {
    return 'Issue response sample unavailable'
  }

  if (activity.sampledIssueCount === 0) {
    return 'No recent closed issues were available'
  }

  if (activity.responseTimingSampleSize === 0) {
    if (activity.projectMemberResponseCount === 0) {
      return `No project-member responses found in ${numberFormatter.format(
        activity.sampledIssueCount,
      )} recent closed issues`
    }

    return `${numberFormatter.format(
      activity.projectMemberResponseCount,
    )} of ${numberFormatter.format(
      activity.sampledIssueCount,
    )} recent closed issues received a project-member response, but none had valid timing data`
  }

  const issueLabel =
    activity.responseTimingSampleSize === 1 ? 'issue' : 'issues'

  return `${numberFormatter.format(
    activity.responseTimingSampleSize,
  )} ${issueLabel} with valid timing data`
}

export function formatIssueResponseCoverage(activity: IssueResponseActivity) {
  if (activity.status === 'unavailable') {
    return 'Unavailable'
  }

  if (activity.sampledIssueCount === 0) {
    return 'No recent closed issues'
  }

  const coverage = Math.round(
    (activity.projectMemberResponseCount / activity.sampledIssueCount) * 100,
  )

  return `${coverage}%`
}

export function formatIssueResponseCoverageNote(
  activity: IssueResponseActivity,
) {
  if (activity.status === 'unavailable') {
    return 'Issue response sample unavailable'
  }

  if (activity.sampledIssueCount === 0) {
    return 'No recent closed issues were available'
  }

  return `${numberFormatter.format(
    activity.projectMemberResponseCount,
  )} of ${numberFormatter.format(
    activity.sampledIssueCount,
  )} recent closed issues received a project-member response`
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
