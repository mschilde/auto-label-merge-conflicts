import { Toolkit } from 'actions-toolkit';
import { GithubLabelNode, GithubPRNode } from './lib/interfaces';
import {
  addLabelsToLabelable,
  getLabels,
  getPullRequests
} from './lib/queries';
import { getPullrequestsWithoutMergeStatus, wait } from './lib/util';

const tools = new Toolkit({
  event: ['pull_request.closed']
});

const conflictLabelName = process.env.CONFLICT_LABEL_NAME!;
const maxRetries = 5;
const waitMs = 5000;

(async () => {
  // check configuration
  if (!conflictLabelName) {
    tools.exit.failure('Please set environment variable CONFLICT_LABEL_NAME');
  }

  // only run on actual merges
  if (
    tools.context.payload.pull_request &&
    !tools.context.payload.pull_request.merged
  ) {
    tools.exit.neutral('PR was closed but not merged');
  }

  let labelData;
  try {
    labelData = await getLabels(tools, tools.context.repo(), conflictLabelName);
  } catch (error) {
    tools.exit.failure('getLabels request failed');
  }

  // fetch label data
  // note we have to iterate over the labels despite the query since query match is quite fuzzy
  const conflictLabel = labelData.repository.labels.edges.find(
    (label: GithubLabelNode) => {
      return label.node.name === conflictLabelName;
    }
  );

  if (!conflictLabel) {
    tools.exit.failure(
      `"${conflictLabelName}" label not found in your repository!`
    );
  }

  let pullrequestData;

  // fetch PRs up to $maxRetries times
  // multiple fetches are necessary because Github computes the 'mergeable' status asynchronously, on request,
  // which might not be available directly after the merge
  let pullrequestsWithoutMergeStatus: GithubPRNode[] = [];
  let tries = 0;
  while (
    (pullrequestsWithoutMergeStatus.length > 0 && tries < maxRetries) ||
    tries === 0
  ) {
    tries++;
    // wait a bit
    if (pullrequestsWithoutMergeStatus.length > 0) {
      tools.log.info(`...waiting for mergeable info...`);
      await wait(waitMs);
    }

    try {
      pullrequestData = await getPullRequests(tools, tools.context.repo());
    } catch (error) {
      tools.exit.failure('getPullRequests request failed');
    }

    // check if there are PRs with unknown mergeable status
    pullrequestsWithoutMergeStatus = getPullrequestsWithoutMergeStatus(
      pullrequestData.repository.pullRequests.edges
    );
  }

  // after $maxRetries we give up, probably Github has some issues
  if (pullrequestsWithoutMergeStatus.length > 0) {
    tools.exit.failure('Cannot determine mergeable status!');
  }

  let pullrequestsWithConflicts: GithubPRNode[];
  pullrequestsWithConflicts = pullrequestData.repository.pullRequests.edges.filter(
    (pullrequest: GithubPRNode) => {
      return pullrequest.node.mergeable === 'CONFLICTING';
    }
  );

  // label PRs with conflicts
  if (pullrequestsWithConflicts.length > 0) {
    pullrequestsWithConflicts.forEach(async (pullrequest: GithubPRNode) => {
      const isAlreadyLabeled = pullrequest.node.labels.edges.find(
        (label: GithubLabelNode) => {
          return label.node.id === conflictLabel.node.id;
        }
      );

      if (isAlreadyLabeled) {
        tools.log.info(
          `Skipping PR #${
            pullrequest.node.number
          }, it has conflicts but is already labeled`
        );
      } else {
        tools.log.info(`Labeling PR #${pullrequest.node.number}`);
        try {
          await addLabelsToLabelable(tools, {
            labelIds: conflictLabel.node.id,
            labelableId: pullrequest.node.id
          });
        } catch (error) {
          tools.exit.failure('addLabelsToLabelable request failed');
        }
      }
    });
  } else {
    // nothing to do
    tools.exit.success('No PR has conflicts, congrats!');
  }
})();
