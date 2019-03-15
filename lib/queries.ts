import { Toolkit } from 'actions-toolkit';
import { IGithubPRNode } from './interfaces';

const getPullRequestPages = (tools: Toolkit, cursor?: string) => {
  let query;
  const context = tools.context.repo();
  if (cursor) {
    query = `{
      repository(owner: "${context.owner}", name: "${context.repo}") {
        pullRequests(first: 100, states: OPEN, after: "${cursor}") {
          edges {
            node {
              id
              number
              mergeable
              labels(first: 100) {
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
            cursor
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }`;
  } else {
    query = `{
      repository(owner: "${context.owner}", name: "${context.repo}") {
        pullRequests(first: 100, states: OPEN) {
          edges {
            node {
              id
              number
              mergeable
              labels(first: 100) {
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
            cursor
          }
          pageInfo {
            endCursor
            hasNextPage
          }
        }
      }
    }`;
  }

  return tools.github.graphql(query, {
    headers: { Accept: 'application/vnd.github.ocelot-preview+json' }
  });
};

// fetch all PRs
export const getPullRequests = async (
  tools: Toolkit
): Promise<IGithubPRNode[]> => {
  let pullrequestData;
  let pullrequests: IGithubPRNode[] = [];
  let cursor;
  let hasNextPage = true;

  while (hasNextPage) {
    try {
      pullrequestData = await getPullRequestPages(tools, cursor);
    } catch (error) {
      tools.exit.failure('getPullRequests request failed');
    }

    pullrequests = pullrequests.concat(
      pullrequestData.repository.pullRequests.edges
    );

    cursor = pullrequestData.repository.pullRequests.pageInfo.endCursor;
    hasNextPage = pullrequestData.repository.pullRequests.pageInfo.hasNextPage;
  }

  return pullrequests;
};

export const getLabels = (tools: Toolkit, labelName: string) => {
  const context = tools.context.repo();
  const query = `{
    repository(owner: "${context.owner}", name: "${context.repo}") {
      labels(first: 100, query: "${labelName}") {
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

export const addLabelsToLabelable = (
  tools: Toolkit,
  {
    labelIds,
    labelableId
  }: {
    labelIds: string;
    labelableId: string;
  }
) => {
  const query = `
    mutation {
      addLabelsToLabelable(input: {labelIds: ${labelIds}, labelableId: "${labelableId}"}) {
        clientMutationId
      }
    }`;

  return tools.github.graphql(query, {
    headers: { Accept: 'application/vnd.github.starfire-preview+json' }
  });
};
