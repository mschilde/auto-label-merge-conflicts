FROM node:alpine

LABEL "com.github.actions.name"="Auto-label merge conflicts"
LABEL "com.github.actions.description"="After PR merge parses all open PRs and labels those with conflicts with specific label"
LABEL "com.github.actions.icon"="alert-triangle"
LABEL "com.github.actions.color"="orange"
LABEL "maintainer"="Marko Schilde (@mschilde)"

WORKDIR /home/autolabel

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .

ENTRYPOINT ["node", "/home/autolabel/dist/index.js"]
