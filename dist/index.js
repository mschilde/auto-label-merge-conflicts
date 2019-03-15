"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actions_toolkit_1 = require("actions-toolkit");
const queries_1 = require("./lib/queries");
const util_1 = require("./lib/util");
const toolkit = new actions_toolkit_1.Toolkit({
    event: ['pull_request.closed']
});
const conflictLabelName = process.env.CONFLICT_LABEL_NAME;
const maxRetries = 5;
const waitMs = 5000;
(async () => {
    // check configuration
    if (!conflictLabelName) {
        toolkit.exit.failure('Please set environment variable CONFLICT_LABEL_NAME');
    }
    // only run on actual merges
    if (toolkit.context.payload.pull_request &&
        !toolkit.context.payload.pull_request.merged) {
        toolkit.exit.neutral('PR was closed but not merged');
    }
    // fetch label data
    let labelData;
    try {
        labelData = await queries_1.getLabels(toolkit, conflictLabelName);
    }
    catch (error) {
        toolkit.exit.failure('getLabels request failed');
    }
    // note we have to iterate over the labels despite the 'query' since query match is quite fuzzy
    const conflictLabel = labelData.repository.labels.edges.find((label) => {
        return label.node.name === conflictLabelName;
    });
    if (!conflictLabel) {
        toolkit.exit.failure(`"${conflictLabelName}" label not found in your repository!`);
    }
    let pullRequests;
    // fetch PRs up to $maxRetries times
    // multiple fetches are necessary because Github computes the 'mergeable' status asynchronously, on request,
    // which might not be available directly after the merge
    let pullrequestsWithoutMergeStatus = [];
    let tries = 0;
    while ((pullrequestsWithoutMergeStatus.length > 0 && tries < maxRetries) ||
        tries === 0) {
        tries++;
        // if merge status is unknown for any PR, wait a bit and retry
        if (pullrequestsWithoutMergeStatus.length > 0) {
            toolkit.log.info(`...waiting for mergeable info...`);
            await util_1.wait(waitMs);
        }
        try {
            pullRequests = await queries_1.getPullRequests(toolkit);
        }
        catch (error) {
            toolkit.exit.failure('getPullRequests request failed');
        }
        // check if there are PRs with unknown mergeable status
        pullrequestsWithoutMergeStatus = util_1.getPullrequestsWithoutMergeStatus(pullRequests);
    }
    // after $maxRetries we give up, probably Github has some issues
    if (pullrequestsWithoutMergeStatus.length > 0) {
        toolkit.exit.failure('Cannot determine mergeable status!');
    }
    let pullrequestsWithConflicts;
    pullrequestsWithConflicts = pullRequests.filter((pullrequest) => {
        return pullrequest.node.mergeable === 'CONFLICTING';
    });
    // label PRs with conflicts
    if (pullrequestsWithConflicts.length > 0) {
        pullrequestsWithConflicts.forEach(async (pullrequest) => {
            const isAlreadyLabeled = pullrequest.node.labels.edges.find((label) => {
                return label.node.id === conflictLabel.node.id;
            });
            if (isAlreadyLabeled) {
                toolkit.log.info(`Skipping PR #${pullrequest.node.number}, it has conflicts but is already labeled`);
            }
            else {
                toolkit.log.info(`Labeling PR #${pullrequest.node.number}`);
                try {
                    await queries_1.addLabelsToLabelable(toolkit, {
                        labelIds: conflictLabel.node.id,
                        labelableId: pullrequest.node.id
                    });
                }
                catch (error) {
                    toolkit.exit.failure('addLabelsToLabelable request failed');
                }
            }
        });
    }
    else {
        // nothing to do
        toolkit.exit.success('No PR has conflicts, congrats!');
    }
})();
