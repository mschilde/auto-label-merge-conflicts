# auto-label-merge-conflicts
> A Github action to auto-label PRs with merge conflicts

## Purpose

This action checks all open Pull Requests for merge conflicts and marks them with a Github label.

![Github action in action](./demo.png)

The typical use case is to run this action post merge (e.g. push to `master`) to quickly see which other PRs are now in conflict.
 
We use this setup e.g. on our monorepo at [Comtravo](https://github.com/comtravo). Instead of a grumpy CTO pinging developers to fix their merge conflicts there's now a shiny bot.

## Set up

To configure the action on your repo you have to do 2 things:
 
1) configure the new workflow by creating a YML config file in your `.github/workflows` folder:

```
on:
  push:
    branches:
      - master
jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - uses: mschilde/auto-label-merge-conflicts@master
        with:
          CONFLICT_LABEL_NAME: "has conflicts"
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Check out [this repo](https://github.com/mschilde/auto-label-merge-conflicts/blob/master/.github/workflows/label_merge_conflicts.yml) for inspiration.

2) make sure the label referenced in the parameter `CONFLICT_LABEL_NAME` exists on your repo

This label will then be applied to PRs with merge conflicts. Just set it up manually if you haven't done so.

## Limitations

Github does not reliably compute the `mergeable` status which is used by this action to detect merge conflicts. 

If `master` changes the mergeable status is unknown until someone (most likely this action) requests it. [Github then tries to compute the status with an async job.](https://stackoverflow.com/a/30620973) 

This is usually quick and simple, but there are no guarantees and Github might have issues.

## Local dev setup

To play around with the code base, you need `Docker` and `make` set up locally.

Run `make build`, `make develop`, then `yarn install`.
