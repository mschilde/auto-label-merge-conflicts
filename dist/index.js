"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actions_toolkit_1 = require("actions-toolkit");
const tools = new actions_toolkit_1.Toolkit({
    event: ['pull_request.opened', 'pull_request.synchronize']
});
const getPullRequests = (tools, { owner, repo }) => {
    const query = `{
    repository(owner: "${owner}", name: "${repo}") {
      pullRequests(last: 50, states:OPEN) {
        edges {
          node {
            id
            number
            mergeable
          }
        }
      }
      labels(first: 100) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  }`;
    return tools.github.graphql(query, {
        headers: { Accept: 'application/vnd.github.ocelot-preview+json' }
    });
};
const addLabelsToLabelable = (tools, { labelIds, labelableId, }) => {
    const query = `
    mutation {
      addLabelsToLabelable(input: {labelIds: ${labelIds}, labelableId: "${labelableId}"}) {
        clientMutationId
      }
    }`;
    return tools.github.graphql(query, {
        headers: { Accept: 'application/vnd.github.starfire-preview+json' },
    });
};
(async () => {
    // check configuration
    if (!process.env['CONFLICT_LABEL_NAME']) {
        tools.exit.failure('Please set environment variable CONFLICT_LABEL_NAME');
    }
    let result;
    try {
        result = await getPullRequests(tools, tools.context.repo());
    }
    catch (error) {
        tools.exit.failure('getPullRequests has failed.');
    }
    let conflictLabel = result.repository.labels.edges.find((label) => {
        return (label.node.name === process.env['CONFLICT_LABEL_NAME']);
    });
    if (!conflictLabel) {
        tools.exit.failure(`"${process.env['CONFLICT_LABEL_NAME']}" label not found in your repository!`);
    }
    let pullrequestsWithConflicts = result.repository.pullRequests.edges.filter((pullrequest) => {
        return (pullrequest.node.mergeable === 'CONFLICTING');
    });
    if (pullrequestsWithConflicts.length > 0) {
        pullrequestsWithConflicts.forEach(async (pullrequest) => {
            tools.log.info(`Labeling PR #${pullrequest.node.number}`);
            try {
                await addLabelsToLabelable(tools, {
                    labelIds: conflictLabel.node.id,
                    labelableId: pullrequest.node.id,
                });
            }
            catch (error) {
                tools.exit.failure('addLabelsToLabelable has failed');
            }
        });
    }
    else {
        // nothing to do
        tools.exit.success('No PR has conflicts, congrats!');
    }
})();
