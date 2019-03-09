"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const actions_toolkit_1 = require("actions-toolkit");
const queries_1 = require("./lib/queries");
const util_1 = require("./lib/util");
const tools = new actions_toolkit_1.Toolkit({
    event: ['pull_request.closed']
});
const conflictLabelName = process.env['CONFLICT_LABEL_NAME'];
const maxRetries = 5;
const waitMs = 5000;
(async () => {
    // check configuration
    if (!conflictLabelName) {
        tools.exit.failure('Please set environment variable CONFLICT_LABEL_NAME');
    }
    // only run on actual merges
    if (tools.context.payload.pull_request &&
        !tools.context.payload.pull_request.merged) {
        tools.exit.neutral('PR was closed but not merged');
    }
    let labelData;
    try {
        labelData = await queries_1.getLabels(tools, tools.context.repo());
    }
    catch (error) {
        tools.exit.failure('getLabels request failed');
    }
    // fetch label data
    let conflictLabel = labelData.repository.labels.edges.find((label) => {
        return label.node.name === conflictLabelName;
    });
    if (!conflictLabel) {
        tools.exit.failure(`"${conflictLabelName}" label not found in your repository!`);
    }
    let pullrequestData;
    // fetch PRs up to $maxRetries times
    // multiple fetches are necessary because Github computes the 'mergeable' status asynchronously, on request,
    // which might not be available directly after the merge
    let pullrequestsWithoutMergeStatus = [];
    let tries = 0;
    while ((pullrequestsWithoutMergeStatus.length > 0 && tries < maxRetries) ||
        tries === 0) {
        tries++;
        // wait a bit
        if (pullrequestsWithoutMergeStatus.length > 0) {
            tools.log.info(`...waiting for mergeable info...`);
            await util_1.wait(waitMs);
        }
        try {
            pullrequestData = await queries_1.getPullRequests(tools, tools.context.repo());
        }
        catch (error) {
            tools.exit.failure('getPullRequests request failed');
        }
        // check if there are PRs with unknown mergeable status
        pullrequestsWithoutMergeStatus = util_1.getPullrequestsWithoutMergeStatus(pullrequestData.repository.pullRequests.edges);
    }
    // after $maxRetries we give up, probably Github has some issues
    if (pullrequestsWithoutMergeStatus.length > 0) {
        tools.exit.failure('Cannot determine mergeable status!');
    }
    let pullrequestsWithConflicts;
    pullrequestsWithConflicts = pullrequestData.repository.pullRequests.edges.filter((pullrequest) => {
        return pullrequest.node.mergeable === 'CONFLICTING';
    });
    // label PRs with conflicts
    if (pullrequestsWithConflicts.length > 0) {
        pullrequestsWithConflicts.forEach(async (pullrequest) => {
            const isAlreadyLabeled = pullrequest.node.labels.edges.find((label) => {
                return label.node.id === conflictLabel.node.id;
            });
            if (isAlreadyLabeled) {
                tools.log.info(`Skipping PR #${pullrequest.node.number}, it has conflicts but is already labeled`);
            }
            else {
                tools.log.info(`Labeling PR #${pullrequest.node.number}`);
                try {
                    await queries_1.addLabelsToLabelable(tools, {
                        labelIds: conflictLabel.node.id,
                        labelableId: pullrequest.node.id
                    });
                }
                catch (error) {
                    tools.exit.failure('addLabelsToLabelable request failed');
                }
            }
        });
    }
    else {
        // nothing to do
        tools.exit.success('No PR has conflicts, congrats!');
    }
})();
