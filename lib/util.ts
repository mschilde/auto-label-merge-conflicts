import { GithubPRNode } from './interfaces';

export async function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getPullrequestsWithoutMergeStatus(
  pullrequests: GithubPRNode[]
): GithubPRNode[] {
  return pullrequests.filter((pullrequest: GithubPRNode) => {
    return pullrequest.node.mergeable === 'UNKNOWN';
  });
}
