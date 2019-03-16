# auto-label-merge-conflicts
> A Github action to auto-label PRs with merge conflicts

## Set up

To configure the action on your repo you have to do 2 things:
 
1) add the following code to your `.github/main.workflow` workflow file:

```
workflow "auto-label merge conflicts" {
  on = "pull_request"
  resolves = ["Auto label merge conflicts"]
}

action "Auto label merge conflicts" {
  uses = "mschilde/auto-label-merge-conflicts@master"
  secrets = ["GITHUB_TOKEN"]
  env = {
    CONFLICT_LABEL_NAME = "has conflicts"
  }
}
```

2) make sure the label referenced in the parameter `CONFLICT_LABEL_NAME` exists on your repo

This label will then be applied to PRs with merge conflicts. Just set it up manually if you haven't done so.

## What does this action do?

The idea is that after a PR is merged all other open Pull Requests are checked. Those with a merge conflict are marked with a label.

We use this setup e.g. on our monorepo at [Comtravo](https://github.com/comtravo). Instead of a grumpy CTO pinging developers to fix their merge conflicts there's now a shiny bot.

![Github action in action](./demo.png)

## Pitfalls

Since this action runs post merge in a PR context it is only working if you don't immediately click the `delete branch` button after merging a PR. (I know, muscle memory)

A good workaround is the [`branch cleanup`](https://github.com/jessfraz/branch-cleanup-action) action by @jessfraz

See also the [workflow file](/.github/main.workflow) of this repo for inspiration.

## Limitations

Github does not reliably compute the `mergeable` status which is used by this action to detect merge conflicts. 

If `master` changes the mergeable status is unknown until someone (most likely this action) requests it. [Github then tries to compute the status with an async job.](https://stackoverflow.com/a/30620973) 

This is usually quick and simple, but there are no guarantees and Github might have issues.

## Local dev setup

To play around with the code base, you need `Docker` and `make` set up locally.

Run `make build`, `make develop`, then `yarn install`.
