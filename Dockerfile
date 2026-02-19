# Stage 1: Build the React app
FROM node:20-alpine AS build
WORKDIR /app

# Faster, reproducible installs with cache
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/root/.cache/yarn \
    yarn install --frozen-lockfile

# Copy the rest and build
COPY . .
RUN yarn build

# Stage 2: Serve with NGINX
FROM nginx:stable-alpine
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
