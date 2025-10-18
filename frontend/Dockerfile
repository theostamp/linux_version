FROM node:20-alpine

WORKDIR /app

# Set npm configuration for better network handling
RUN npm config set registry https://registry.npmjs.org/
RUN npm config set fetch-retries 5
RUN npm config set fetch-retry-mintimeout 20000
RUN npm config set fetch-retry-maxtimeout 120000

COPY package*.json ./

# Use npm install instead of npm ci for better compatibility
# Use --legacy-peer-deps to handle React 19 compatibility issues
RUN npm install --no-optional --legacy-peer-deps

COPY . ./

# Pre-cache SWC packages to avoid download delay on first startup
# Create Next.js cache directory structure
RUN mkdir -p /root/.cache/next-swc

# Download common SWC packages that Next.js typically needs
RUN npx --yes @next/swc-linux-x64-gnu@latest --version || true
RUN npx --yes @next/swc-linux-x64-musl@latest --version || true

# Pre-build Next.js to cache SWC packages and reduce startup time
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build || true

# Clean up build artifacts but keep SWC cache
RUN rm -rf .next/static .next/server || true

EXPOSE 3000
CMD ["npm", "run", "dev"]
