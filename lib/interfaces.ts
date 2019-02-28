export interface GithubLabelNode {
  node: {
    id: string;
    name: string;
  }
}

export interface GithubPRNode {
  node: {
    id: string;
    number: string;
    mergeable: string;
    labels: {
      edges: [GithubLabelNode]
    }
  }
}
