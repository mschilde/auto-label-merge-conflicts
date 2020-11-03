"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core = require("@actions/core");
const github = require("@actions/github");
const queries_1 = require("./queries");
const util_1 = require("./util");
async function run() {
    const conflictLabelName = core.getInput('CONFLICT_LABEL_NAME', {
        required: true
    });
    const myToken = core.getInput('GITHUB_TOKEN', {
        required: true
    });
    const octokit = new github.GitHub(myToken);
    const maxRetries = 5;
    const waitMs = 5000;
    // fetch label data
    let labelData;
    try {
        labelData = await queries_1.getLabels(octokit, github.context, conflictLabelName);
    }
    catch (error) {
        core.setFailed('getLabels request failed: ' + error);
    }
    let conflictLabel;
    if (labelData) {
        // note we have to iterate over the labels despite the 'query' since query match is quite fuzzy
        conflictLabel = labelData.repository.labels.edges.find((label) => {
            return label.node.name === conflictLabelName;
        });
        if (!conflictLabel) {
            core.setFailed(`"${conflictLabelName}" label not found in your repository!`);
        }
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
            core.debug(`...waiting for mergeable info...`);
            await util_1.wait(waitMs);
        }
        try {
            pullRequests = await queries_1.getPullRequests(octokit, github.context);
        }
        catch (error) {
            core.setFailed('getPullRequests request failed: ' + error);
        }
        // check if there are PRs with unknown mergeable status
        pullrequestsWithoutMergeStatus = util_1.getPullrequestsWithoutMergeStatus(pullRequests);
    }
    // after $maxRetries we give up, probably Github has some issues
    if (pullrequestsWithoutMergeStatus.length > 0) {
        core.setFailed('Cannot determine mergeable status!');
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
                core.debug(`Skipping PR #${pullrequest.node.number}, it has conflicts but is already labeled`);
            }
            else {
                core.debug(`Labeling PR #${pullrequest.node.number}...`);
                try {
                    await queries_1.addLabelsToLabelable(octokit, {
                        labelIds: conflictLabel.node.id,
                        labelableId: pullrequest.node.id
                    });
                    core.debug(`PR #${pullrequest.node.number} done`);
                }
                catch (error) {
                    core.setFailed('addLabelsToLabelable request failed: ' + error);
                }
            }
        });
    }
    else {
        // nothing to do
        core.debug('No PR has conflicts, congrats!');
    }
    let pullrequestsWithConflictResolution;
    pullrequestsWithConflictResolution = pullRequests.filter((pullrequest) => {
        return pullrequest.node.mergeable === 'MERGEABLE';
    });
    // unlabel PRs without conflicts
    if (pullrequestsWithConflictResolution.length > 0) {
        pullrequestsWithConflictResolution.forEach(async (pullrequest) => {
            const isAlreadyLabeled = pullrequest.node.labels.edges.find((label) => {
                return label.node.id === conflictLabel.node.id;
            });
            if (!isAlreadyLabeled) {
                core.debug(`Skipping PR #${pullrequest.node.number}, it has no conflicts and is not labeled`);
            }
            else {
                core.debug(`Unlabeling PR #${pullrequest.node.number}...`);
                try {
                    await queries_1.removeLabelsFromLabelable(octokit, {
                        labelIds: conflictLabel.node.id,
                        labelableId: pullrequest.node.id
                    });
                    core.debug(`PR #${pullrequest.node.number} done`);
                }
                catch (error) {
                    core.setFailed('addLabelsToLabelable request failed: ' + error);
                }
            }
        });
    }
    else {
        // nothing to do
        core.debug('No PR has conflicts, congrats!');
    }
}
exports.run = run;
