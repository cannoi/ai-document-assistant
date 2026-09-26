FROM node:14

WORKDIR /usr/src/app

COPY package*.json ./

RUN apt-get update && apt-get install -y build-essential python3
RUN npm install

COPY . .

EXPOSE 8080

CMD ["npm", "start"]