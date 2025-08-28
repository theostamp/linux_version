FROM node:20-alpine

WORKDIR /app

# Set npm configuration for better network handling
RUN npm config set registry https://registry.npmjs.org/
RUN npm config set fetch-retries 5
RUN npm config set fetch-retry-mintimeout 20000
RUN npm config set fetch-retry-maxtimeout 120000

COPY package*.json ./

# Use npm install instead of npm ci for better compatibility
RUN npm install --no-optional

COPY . ./  

EXPOSE 3000
CMD ["npm", "run", "dev"]
