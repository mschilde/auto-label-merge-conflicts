import * as core from '@actions/core'
import * as github from '@actions/github'
import { Context } from '@actions/github/lib/context';
import { IGithubPRNode } from './interfaces';

const getPullRequestPages = (octokit: github.GitHub, context: Context, cursor?: string) => {
  let query;
  if (cursor) {
    query = `{
      repository(owner: "${context.repo.owner}", name: "${context.repo.repo}") {
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
      repository(owner: "${context.repo.owner}", name: "${context.repo.repo}") {
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

  return octokit.graphql(query, {
    headers: { Accept: 'application/vnd.github.ocelot-preview+json' }
  });
};

// fetch all PRs
export const getPullRequests = async (
  octokit: github.GitHub, context: Context
): Promise<IGithubPRNode[]> => {
  let pullrequestData;
  let pullrequests: IGithubPRNode[] = [];
  let cursor: string | undefined;
  let hasNextPage = true;

  while (hasNextPage) {
    try {
      pullrequestData = await getPullRequestPages(octokit, context, cursor);
    } catch (error) {
      core.setFailed('getPullRequests request failed: ' + error);
    }

    if (!pullrequestData || !pullrequestData.repository) {
      hasNextPage = false;
      core.setFailed('getPullRequests request failed: ' + pullrequestData);
    } else {
      pullrequests = pullrequests.concat(
        pullrequestData.repository.pullRequests.edges
      );

      cursor = pullrequestData.repository.pullRequests.pageInfo.endCursor;
      hasNextPage = pullrequestData.repository.pullRequests.pageInfo.hasNextPage;
    }
  }

  return pullrequests;
};

export const getLabels = (octokit: github.GitHub, context: Context, labelName: string) => {
  const query = `{
    repository(owner: "${context.repo.owner}", name: "${context.repo.repo}") {
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

  return octokit.graphql(query, {
    headers: { Accept: 'application/vnd.github.ocelot-preview+json' }
  });
};

export const addLabelsToLabelable = (
  octokit: github.GitHub,
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
      addLabelsToLabelable(input: {labelIds: ["${labelIds}"], labelableId: "${labelableId}"}) {
        clientMutationId
      }
    }`;

  return octokit.graphql(query, {
    headers: { Accept: 'application/vnd.github.starfire-preview+json' }
  });
};

export const removeLabelsFromLabelable = (
  octokit: github.GitHub,
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
      removeLabelsFromLabelable(input: {labelIds: ["${labelIds}"], labelableId: "${labelableId}"}) {
        clientMutationId
      }
    }`;

  return octokit.graphql(query, {
    headers: { Accept: 'application/vnd.github.starfire-preview+json' }
  });
};
