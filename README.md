# auto-label-merge-conflicts
> A Github action to auto-label PRs with merge conflicts

## Purpose

This action checks all open pull requests for merge conflicts and marks them with a [label](https://guides.github.com/features/issues/#filtering).

![Github action in action](./demo.png)

Once a conflict is resolved the label is automatically removed.

The typical use case is to run this action post merge (e.g. push to `master`) to quickly see which other PRs are now in conflict.
 
We use this setup e.g. on our monorepo at [Comtravo](https://github.com/comtravo). Instead of a grumpy CTO pinging developers to fix their merge conflicts there's now a shiny bot.

```yml
name: Auto Label Conflicts
on:
  push:
    branches: [master]
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [master]

jobs:
  auto-label:
    runs-on: ubuntu-latest
    steps:
      - uses: prince-chrismc/label-merge-conflicts-action@v1
        with:
          conflict_label_name: "has conflict" # should match setp 1
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # These are optional incase you need to adjust for the limitations described below
          max_retries: 5
          wait_ms: 15000
```

## Limitations

Github does not reliably compute the `mergeable` status which is used by this action to detect merge conflicts.

If `master` changes the mergeable status is unknown until someone (most likely this action) requests it.
[Github then tries to compute the status with an async job.](https://stackoverflow.com/a/30620973)

This is usually quick and simple, but there are no guarantees and Github might have issues.
You can tweak `max_retries` and `wait_ms` to increase the timeout before giving up on a Pull Request.
