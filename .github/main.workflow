workflow "post merge" {
  on = "pull_request"
  resolves = ["Auto delete branch"]
}

action "Auto label merge conflicts" {
  uses = "mschilde/auto-label-merge-conflicts@master"
  secrets = ["GITHUB_TOKEN"]
  env = {
    CONFLICT_LABEL_NAME = "has conflicts"
  }
}

action "Auto delete branch" {
  needs = "Auto label merge conflicts"
  uses = "jessfraz/branch-cleanup-action@master"
  secrets = ["GITHUB_TOKEN"]
}
