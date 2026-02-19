# Stage 1: Build the React app
FROM node:20-alpine AS build
WORKDIR /app

# Copy dependency files first for caching
COPY package.json yarn.lock ./

# If you use Yarn Berry, you may also have .yarn/ and .yarnrc.yml
# (These are important for Yarn v3/v4 installs)
COPY .yarnrc.yml ./
COPY .yarn/ .yarn/

# Enable Corepack so Yarn version matches repo config
RUN corepack enable

# Install deps (Yarn v3/v4)
RUN --mount=type=cache,target=/root/.cache/yarn \
    yarn install --immutable

# Copy rest of the project and build
COPY . .
RUN yarn build


# Stage 2: Serve with NGINX
FROM nginx:stable-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
