"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function wait(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
exports.wait = wait;
function getPullrequestsWithoutMergeStatus(pullrequests) {
    return pullrequests.filter((pullrequest) => {
        return pullrequest.node.mergeable === 'UNKNOWN';
    });
}
exports.getPullrequestsWithoutMergeStatus = getPullrequestsWithoutMergeStatus;
