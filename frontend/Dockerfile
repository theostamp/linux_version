# frontend/Dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci

# όλος ο κώδικας Frontend
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
