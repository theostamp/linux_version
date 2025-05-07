# frontend/Dockerfile

FROM node:20

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
ENTRYPOINT ["/app/entrypoint.sh"]

ENV NEXT_PUBLIC_API_URL=http://backend:8000/api

EXPOSE 3000


CMD ["npm", "run", "dev"]
