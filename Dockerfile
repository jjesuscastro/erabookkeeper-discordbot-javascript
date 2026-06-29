FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

CMD ["sh", "-c", "node deploy-commands.js && node index.js"]
