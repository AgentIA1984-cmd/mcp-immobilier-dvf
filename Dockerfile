# MCPize-ready Docker image (Node, Streamable HTTP transport).
# MCPize builds from this Dockerfile on each push to the connected branch.
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV TRANSPORT=http
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
# MCPize injects PORT; the server reads process.env.PORT (default 3000).
EXPOSE 3000
CMD ["node", "dist/index.js"]
