FROM node:20-slim

# better-sqlite3 needs build tools to compile its native binding
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .

# SQLite file lives here — mount a volume on this path so data survives deploys
VOLUME /app/data

ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
