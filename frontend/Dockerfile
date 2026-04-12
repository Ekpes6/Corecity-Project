FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY .npmrc ./
RUN npm install
COPY . .
ENV CI=true
ENV GENERATE_SOURCEMAP=false
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
