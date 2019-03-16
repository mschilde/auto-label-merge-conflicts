"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getPullRequestPages = (tools, cursor) => {
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
    }
    else {
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
exports.getPullRequests = async (tools) => {
    let pullrequestData;
    let pullrequests = [];
    let cursor;
    let hasNextPage = true;
    while (hasNextPage) {
        try {
            pullrequestData = await getPullRequestPages(tools, cursor);
        }
        catch (error) {
            tools.exit.failure('getPullRequests request failed');
        }
        pullrequests = pullrequests.concat(pullrequestData.repository.pullRequests.edges);
        cursor = pullrequestData.repository.pullRequests.pageInfo.endCursor;
        hasNextPage = pullrequestData.repository.pullRequests.pageInfo.hasNextPage;
    }
    return pullrequests;
};
exports.getLabels = (tools, labelName) => {
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
exports.addLabelsToLabelable = (tools, { labelIds, labelableId }) => {
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
