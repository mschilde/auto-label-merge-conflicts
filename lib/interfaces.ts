export interface IGithubLabelNode {
  node: {
    id: string;
    name: string;
  }
}

export interface IGithubPRNode {
  node: {
    id: string;
    number: string;
    mergeable: string;
    labels: {
      edges: [IGithubLabelNode]
    }
  }
}
