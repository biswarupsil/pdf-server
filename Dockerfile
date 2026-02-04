FROM node:18

RUN apt-get update && apt-get install -y \
  chromium \
  fonts-noto \
  fonts-noto-cjk \
  fonts-noto-core

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY . .
RUN npm install

CMD ["node", "server.js"]
