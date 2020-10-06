"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeLabelsFromLabelable = exports.addLabelsToLabelable = exports.getLabels = exports.getPullRequests = void 0;
const core = require("@actions/core");
const getPullRequestPages = (octokit, context, cursor) => {
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
    }
    else {
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
exports.getPullRequests = async (octokit, context) => {
    let pullrequestData;
    let pullrequests = [];
    let cursor;
    let hasNextPage = true;
    while (hasNextPage) {
        try {
            pullrequestData = await getPullRequestPages(octokit, context, cursor);
        }
        catch (error) {
            core.setFailed('getPullRequests request failed: ' + error);
        }
        if (!pullrequestData || !pullrequestData.repository) {
            hasNextPage = false;
            core.setFailed('getPullRequests request failed: ' + pullrequestData);
        }
        else {
            pullrequests = pullrequests.concat(pullrequestData.repository.pullRequests.edges);
            cursor = pullrequestData.repository.pullRequests.pageInfo.endCursor;
            hasNextPage = pullrequestData.repository.pullRequests.pageInfo.hasNextPage;
        }
    }
    return pullrequests;
};
exports.getLabels = (octokit, context, labelName) => {
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
exports.addLabelsToLabelable = (octokit, { labelIds, labelableId }) => {
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
exports.removeLabelsFromLabelable = (octokit, { labelIds, labelableId }) => {
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
