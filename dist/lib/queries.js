"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPullRequests = (tools, { owner, repo }) => {
    const query = `{
    repository(owner: "${owner}", name: "${repo}") {
      pullRequests(last: 50, states:OPEN) {
        edges {
          node {
            id
            number
            mergeable
            labels(first:100) {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }`;
    return tools.github.graphql(query, {
        headers: { Accept: 'application/vnd.github.ocelot-preview+json' }
    });
};
exports.getLabels = (tools, { owner, repo }) => {
    const query = `{
    repository(owner: "${owner}", name: "${repo}") {
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
