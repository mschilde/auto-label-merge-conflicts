import { IGithubPRNode } from './interfaces';

export async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getPullrequestsWithoutMergeStatus(
  pullrequests: IGithubPRNode[]
): IGithubPRNode[] {
  return pullrequests.filter((pullrequest: IGithubPRNode) => {
    return pullrequest.node.mergeable === 'UNKNOWN';
  });
}
