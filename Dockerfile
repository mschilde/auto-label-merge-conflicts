FROM node:alpine

WORKDIR /home/autolabel

COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile
COPY . .

ENTRYPOINT ["node", "/home/autolabel/dist/index.js"]
