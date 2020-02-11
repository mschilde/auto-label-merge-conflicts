import * as core from '@actions/core';
import * as github from '@actions/github';
import { IGithubLabelNode, IGithubPRNode } from './interfaces';
import { addLabel, getLabels, getPullRequests, addComment, removeLabel } from './queries';
import { getUnknownMergeStatusPRs, wait, getMergeablePRs, getConflictingPRs } from './util';

export async function run() {
  const conflictLabelName = core.getInput('CONFLICT_LABEL_NAME', {
    required: true
  });
  const myToken = core.getInput('GITHUB_TOKEN', {
    required: true
  });
  let comment = core.getInput('COMMENT', {
    required: false
  });
  const octokit = new github.GitHub(myToken);
  const maxRetries = 5;
  const waitMs = 5000;
  try {
    octokit.graphql(`mutation MyMutation {
      addComment(input: {subjectId: "MDExOlB1bGxSZXF1ZXN0MzY5OTUyNzE0", body: "rebase needed"}) {
        clientMutationId
      }
    }`, {
      headers: { Accept: 'application/vnd.github+json' }
    });
  } catch (error) {
    
  }
  
  // fetch label data
  let labelData;
  try {
    labelData = await getLabels(octokit, github.context, conflictLabelName);
  } catch (error) {
    core.setFailed('getLabels request failed: ' + error);
  }

  let conflictLabel: IGithubLabelNode;

  if (labelData) {
    // note we have to iterate over the labels despite the 'query' since query match is quite fuzzy
    conflictLabel = labelData.repository.labels.edges.find(
      (label: IGithubLabelNode) => {
        return label.node.name === conflictLabelName;
      }
    );

    if (!conflictLabel) {
      core.setFailed(
        `"${conflictLabelName}": label not found in your repository!`
      );
    }
  }

  let pullRequests!: IGithubPRNode[];

  // fetch PRs up to $maxRetries times
  // multiple fetches are necessary because Github computes the 'mergeable' status asynchronously, on request,
  // which might not be available directly after the merge
  let pullrequestsWithoutMergeStatus: IGithubPRNode[] = [];
  let tries = 0;
  while (
    (pullrequestsWithoutMergeStatus.length > 0 && tries < maxRetries) ||
    tries === 0
    ) {
    tries++;
    // if merge status is unknown for any PR, wait a bit and retry
    if (pullrequestsWithoutMergeStatus.length > 0) {
      core.debug(`...waiting for mergeable info...`);
      await wait(waitMs);
    }

    try {
      pullRequests = await getPullRequests(octokit, github.context);
    } catch (error) {
      core.setFailed('getPullRequests request failed: ' + error);
    }

    // check if there are PRs with unknown mergeable status
    pullrequestsWithoutMergeStatus = getUnknownMergeStatusPRs(
      pullRequests
    );
  }

  // after $maxRetries we give up, probably Github has some issues
  if (pullrequestsWithoutMergeStatus.length > 0) {
    core.setFailed('Cannot determine mergeable status!');
  }

  let conflictingPRs = getConflictingPRs(pullRequests);

  // label PRs with conflicts
  if (conflictingPRs.length > 0) {
    conflictingPRs.forEach(async (pullrequest: IGithubPRNode) => {
      const isAlreadyLabeled = pullrequest.node.labels.edges.find(
        (label: IGithubLabelNode) => {
          return label.node.id === conflictLabel.node.id;
        }
      );

      if (isAlreadyLabeled) {
        core.debug(
          `Skipping PR #${pullrequest.node.number}, it has conflicts but is already labeled`
        );
      } else {
        core.debug(`Labelling and commenting PR #${pullrequest.node.number}...`);
        try {
          await addLabel(octokit, {
            labelIds: conflictLabel.node.id,
            labelableId: pullrequest.node.id
          });
        } catch (error) {
          core.setFailed('addLabel request failed: ' + error);
        }
        try {
          core.debug('addComment :' + comment);
          core.debug('PR#' + pullrequest.node.number);

          await addComment(comment, octokit, {
            nodeID: pullrequest.node.id
          });
          core.debug("l. 124");

        } catch (error) {
          core.debug('addComment request failed: ' + error);
          core.setFailed('addComment request failed: ' + error);
        }
        core.debug(`PR #${pullrequest.node.number} done`);
      }
    });
  } else {
    // nothing to do
    core.debug('No PR has conflicts, congrats!');
  }

  core.debug('L. 136');
  let mergeablePRs = getMergeablePRs(pullRequests);

  // remove label from PRs without conflicts
  if (mergeablePRs.length > 0) {
    mergeablePRs.forEach(async (pullrequest: IGithubPRNode) => {
      const isLabeled = pullrequest.node.labels.edges.find(
        (label: IGithubLabelNode) => {
          return label.node.id === conflictLabel.node.id;
        }
      );

      if (isLabeled) { // It is labeled but should not
        core.debug(`Removing label from PR #${pullrequest.node.number}...`);
        try {
          await removeLabel(octokit, {
            labelIds: conflictLabel.node.id,
            labelableId: pullrequest.node.id
          });
          core.debug(`PR #${pullrequest.node.number} done`);
        } catch (error) {
          core.debug('removeLabel request failed: ' + error);
          core.setFailed('removeLabel request failed: ' + error);
        }
      } else {
        // PR is clean: no label to remove or to add.
        // Nothing to do
        core.debug(`PR #${pullrequest.node.number} is clean: no label to remove or to add.`);
      }
    });
  } else {
    // No PR without conflicts
    // Nothing to do
    core.debug('No PR without conflicts.');
  }
  core.debug('Whole shit done.');

}
