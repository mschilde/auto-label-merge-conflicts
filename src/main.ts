import * as core from '@actions/core'
import * as github from '@actions/github'
import {IGithubLabelNode, IGithubPRNode, IGithubRepoLabels} from './interfaces'
import {addLabelsToLabelable, getLabels, getPullRequests, removeLabelsFromLabelable} from './queries'
import {
  getPullrequestsWithoutMergeStatus,
  getPullrequestsWithoutConflictingStatus,
  getPullrequestsWithoutMergeableStatus,
  isAlreadyLabeled
} from './util'
import {wait} from './wait'

async function run(): Promise<void> {
  try {
    const conflictLabelName = core.getInput('conflict_label_name', {
      required: true
    })
    const myToken = core.getInput('github_token', {required: true})

    const octokit = github.getOctokit(myToken)
    const maxRetries = parseInt(core.getInput('max_retries'), 10)
    const waitMs = parseInt(core.getInput('wait_ms'), 10)
    core.debug(`maxRetries=${maxRetries}; waitMs=${waitMs}`)

    // Get the label to use
    const conflictLabel = findConflictLabel(
      await getLabels(octokit, github.context, conflictLabelName),
      conflictLabelName
    ) as IGithubLabelNode

    let pullRequests!: IGithubPRNode[]

    // fetch PRs up to $maxRetries times
    // multiple fetches are necessary because Github computes the 'mergeable' status asynchronously, on request,
    // which might not be available directly after the merge
    let pullrequestsWithoutMergeStatus: IGithubPRNode[] = []
    let tries = 0
    while ((pullrequestsWithoutMergeStatus.length > 0 && tries < maxRetries) || tries === 0) {
      tries++
      // if merge status is unknown for any PR, wait a bit and retry
      if (pullrequestsWithoutMergeStatus.length > 0) {
        core.debug(`...waiting for mergeable info...`)
        await wait(waitMs)
      }

      pullRequests = await getPullRequests(octokit, github.context)

      // check if there are PRs with unknown mergeable status
      pullrequestsWithoutMergeStatus = getPullrequestsWithoutMergeStatus(pullRequests)
    }

    // after $maxRetries we give up, probably Github has some issues
    if (pullrequestsWithoutMergeStatus.length > 0) {
      core.setFailed('Cannot determine mergeable status!')
    }

    for (const pullrequest of getPullrequestsWithoutConflictingStatus(pullRequests)) {
      if (isAlreadyLabeled(pullrequest, conflictLabel)) {
        core.debug(`Skipping PR #${pullrequest.node.number}, it has conflicts but is already labeled`)
        continue
      }

      core.debug(`Labeling PR #${pullrequest.node.number}...`)
      await addLabelsToLabelable(octokit, {
        labelIds: conflictLabel.node.id,
        labelableId: pullrequest.node.id
      })
    }

    // unlabel PRs without conflicts
    for (const pullrequest of getPullrequestsWithoutMergeableStatus(pullRequests)) {
      if (isAlreadyLabeled(pullrequest, conflictLabel)) {
        core.debug(`Unlabeling PR #${pullrequest.node.number}...`)
        await removeLabelsFromLabelable(octokit, {
          labelIds: conflictLabel.node.id,
          labelableId: pullrequest.node.id
        })
      }
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

function findConflictLabel(labelData: IGithubRepoLabels, conflictLabelName: string): IGithubLabelNode | undefined {
  for (const label of labelData.repository.labels.edges) {
    if (label.node.name === conflictLabelName) {
      return label
    }
  }

  core.setFailed(`"${conflictLabelName}" label not found in your repository!`)
}

run()
