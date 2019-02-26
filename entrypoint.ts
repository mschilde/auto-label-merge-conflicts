import { Toolkit } from 'actions-toolkit';
import * as _ from 'lodash';

const tools = new Toolkit({
  event: ['pull_request.opened', 'pull_request.synchronize']
});

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
})();
