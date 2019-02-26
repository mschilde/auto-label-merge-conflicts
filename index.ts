import { Toolkit } from 'actions-toolkit';
import { GithubLabelNode, GithubPRNode } from './lib/interfaces';
import { addLabelsToLabelable, getPullRequestsAndLabels } from './lib/queries';

const tools = new Toolkit({
  event: ['pull_request.opened', 'pull_request.synchronize']
});

const conflictLabelName = process.env['CONFLICT_LABEL_NAME'];

(async () => {
  // check configuration
  if (!conflictLabelName) {
    tools.exit.failure('Please set environment variable CONFLICT_LABEL_NAME');
  }

  let result;

  try {
    result = await getPullRequestsAndLabels(tools, tools.context.repo());
  } catch (error) {
    tools.exit.failure('getPullRequestsAndLabels request failed');
  }

  let conflictLabel = result.repository.labels.edges.find(
    (label: GithubLabelNode) => {
      return label.node.name === conflictLabelName;
    }
  );

  if (!conflictLabel) {
    tools.exit.failure(
      `"${conflictLabelName}" label not found in your repository!`
    );
  }

  let pullrequestsWithConflicts: GithubPRNode[];
  pullrequestsWithConflicts= result.repository.pullRequests.edges.filter(
    (pullrequest: GithubPRNode) => {
      return pullrequest.node.mergeable === 'CONFLICTING';
    }
  );

  if (pullrequestsWithConflicts.length > 0) {
    pullrequestsWithConflicts.forEach(async (pullrequest: GithubPRNode) => {
      const isAlreadyLabeled = pullrequest.node.labels.edges.find(
        (label: GithubLabelNode) => {
          return label.node.id === conflictLabel.node.id;
        }
      );

      if (isAlreadyLabeled) {
        tools.log.info(
          `Skipping PR #${pullrequest.node.number}, it has conflicts but is already labeled`
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
