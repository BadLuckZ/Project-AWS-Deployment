# Use a Node.js base image
FROM node:24-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first for dependency caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY backend ./backend
COPY frontend ./frontend

# Document which port the app uses
EXPOSE 3000

# Start the server when the container runs
CMD ["npx", "tsx", "backend/app.ts"]
