FROM node:22-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies inside the container
RUN npm install

# Copy all files into the container, excluding node_modules
COPY . .

EXPOSE 5001

CMD ["node", "Server.js"]