import { Toolkit } from 'actions-toolkit';
import * as _ from 'lodash';

const tools = new Toolkit({
  event: ['pull_request.opened', 'pull_request.synchronize']
});

interface GithubLabelNode {
  node: {
    id: string;
    name: string;
  }
}

interface GithubPRNode {
  node: {
    id: string;
    number: string;
    mergeable: string;
  }
}

export const getPullRequests = (
  tools: Toolkit,
  {
    owner,
    repo
  }: {
    owner: string;
    repo: string;
  }
) => {
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

(async () => {
  // check configuration
  if (!process.env['CONFLICT_LABEL']) {
    tools.exit.failure('Please set environment variable CONFLICT_LABEL');
  }

  let result;

  try {
    result = await getPullRequests(tools, tools.context.repo());
  } catch (error) {
    console.error('Request failed: ', error.request, error.message);
    tools.exit.failure('getPullRequests has failed.');
  }

  console.log('Result: ', result);
  console.log(result.repository.pullRequests.edges);
  console.log(result.repository.labels.edges);

  let conflictLabel = result.repository.labels.edges.find((label: GithubLabelNode) => {
    return (label.node.name === process.env['CONFLICT_LABEL']);
  });

  if (!conflictLabel) {
    tools.exit.failure(`"${process.env['CONFLICT_LABEL']}" label not found in your repository!`);
  }

  let pullrequestsWithConflicts = result.repository.pullRequests.edges.filter((pullrequest: GithubPRNode) => {
    return (pullrequest.node.mergeable === 'CONFLICTING');
  });

  if (pullrequestsWithConflicts.length > 0) {
    pullrequestsWithConflicts.forEach((pullrequest: GithubPRNode) => {
      console.log(pullrequest.node.id);
    })
  } else {
    tools.exit.success('No PR has conflicts, congrats!')
  }

})();
