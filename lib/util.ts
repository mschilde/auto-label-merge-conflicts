import { IGithubPRNode } from './interfaces';

export async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getUnknownMergeStatusPRs(
  pullrequests: IGithubPRNode[]
): IGithubPRNode[] {
  return pullrequests.filter((pullrequest: IGithubPRNode) => {
    return pullrequest.node.mergeable === 'UNKNOWN';
  });
}

export function getMergeablePRs(
  pullrequests: IGithubPRNode[]
): IGithubPRNode[] {
  return pullrequests.filter((pullrequest: IGithubPRNode) => {
    return pullrequest.node.mergeable === 'MERGEABLE';
  });
}

export function getConflictingPRs(
  pullrequests: IGithubPRNode[]
): IGithubPRNode[] {
  return pullrequests.filter((pullrequest: IGithubPRNode) => {
    return pullrequest.node.mergeable === 'CONFLICTING';
  });
}
