# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json yarn.lock ./

# If your repo uses Yarn Berry, these exist and are required for installs
COPY .yarnrc.yml ./
COPY .yarn/ .yarn/

RUN corepack enable

RUN --mount=type=cache,target=/root/.cache/yarn \
    yarn install --immutable

COPY . .
RUN yarn build


# Stage 2: Serve
FROM nginx:stable-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
