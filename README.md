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

## Limitations

I didn't bother yet with pagination handling. 

This action checks the latest 50 open PRs and deals with up to 100 labels. See [queries.ts](lib/queries.ts) Feel free to fix and submit a PR :-)

## Local dev setup

To play around with the code base, you need `Docker` and `make` set up locally.

Run `make build`, `make develop`, then `yarn install`.
