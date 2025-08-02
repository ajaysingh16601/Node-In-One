FROM node:20-slim AS build
RUN apt-get update && apt-get upgrade -y && apt-get clean
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY . .
CMD ["node", "dist/server.js"]