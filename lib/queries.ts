import { Toolkit } from 'actions-toolkit';

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
    }
  }`;

  return tools.github.graphql(query, {
    headers: { Accept: 'application/vnd.github.ocelot-preview+json' }
  });
};


export const getLabels = (
  tools: Toolkit,
  {
    owner,
    repo
  }: {
    owner: string;
    repo: string;
  },
  labelName: string
) => {
  const query = `{
    repository(owner: "${owner}", name: "${repo}") {
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
