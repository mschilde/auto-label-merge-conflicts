import { Toolkit } from 'actions-toolkit';
import { IGithubLabelNode, IGithubPRNode } from './lib/interfaces';
import {
  addLabelsToLabelable,
  getLabels,
  getPullRequests
} from './lib/queries';
import { getPullrequestsWithoutMergeStatus, wait } from './lib/util';

const toolkit = new Toolkit({
  event: ['pull_request.closed']
});

const conflictLabelName = process.env.CONFLICT_LABEL_NAME!;
const maxRetries = 5;
const waitMs = 5000;

(async () => {
  // check configuration
  if (!conflictLabelName) {
    toolkit.exit.failure('Please set environment variable CONFLICT_LABEL_NAME');
  }

  // only run on actual merges
  if (
    toolkit.context.payload.pull_request &&
    !toolkit.context.payload.pull_request.merged
  ) {
    toolkit.exit.neutral('PR was closed but not merged');
  }

  // fetch label data
  let labelData;
  try {
    labelData = await getLabels(toolkit, conflictLabelName);
  } catch (error) {
    toolkit.exit.failure('getLabels request failed');
  }
  // note we have to iterate over the labels despite the 'query' since query match is quite fuzzy
  const conflictLabel = labelData.repository.labels.edges.find(
    (label: IGithubLabelNode) => {
      return label.node.name === conflictLabelName;
    }
  );

  if (!conflictLabel) {
    toolkit.exit.failure(
      `"${conflictLabelName}" label not found in your repository!`
    );
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
      toolkit.log.info(`...waiting for mergeable info...`);
      await wait(waitMs);
    }

    try {
      pullRequests = await getPullRequests(toolkit);
    } catch (error) {
      toolkit.exit.failure('getPullRequests request failed');
    }

    // check if there are PRs with unknown mergeable status
    pullrequestsWithoutMergeStatus = getPullrequestsWithoutMergeStatus(
      pullRequests
    );
  }

  // after $maxRetries we give up, probably Github has some issues
  if (pullrequestsWithoutMergeStatus.length > 0) {
    toolkit.exit.failure('Cannot determine mergeable status!');
  }

  let pullrequestsWithConflicts: IGithubPRNode[];
  pullrequestsWithConflicts = pullRequests.filter(
    (pullrequest: IGithubPRNode) => {
      return pullrequest.node.mergeable === 'CONFLICTING';
    }
  );

  // label PRs with conflicts
  if (pullrequestsWithConflicts.length > 0) {
    pullrequestsWithConflicts.forEach(async (pullrequest: IGithubPRNode) => {
      const isAlreadyLabeled = pullrequest.node.labels.edges.find(
        (label: IGithubLabelNode) => {
          return label.node.id === conflictLabel.node.id;
        }
      );

      if (isAlreadyLabeled) {
        toolkit.log.info(
          `Skipping PR #${
            pullrequest.node.number
          }, it has conflicts but is already labeled`
        );
      } else {
        toolkit.log.info(`Labeling PR #${pullrequest.node.number}`);
        try {
          await addLabelsToLabelable(toolkit, {
            labelIds: conflictLabel.node.id,
            labelableId: pullrequest.node.id
          });
        } catch (error) {
          toolkit.exit.failure('addLabelsToLabelable request failed');
        }
      }
    });
  } else {
    // nothing to do
    toolkit.exit.success('No PR has conflicts, congrats!');
  }
})();
