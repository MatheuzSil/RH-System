# Usa Node 18 LTS
FROM node:18

# Define diretório de trabalho
WORKDIR /app

# Copia package.json e package-lock.json primeiro (melhora cache)
COPY package*.json ./

# Instala dependências
RUN npm install

# Copia o resto do código
COPY . .

# Define a porta (Railway usa PORT automaticamente)
EXPOSE 8080

# Comando para iniciar a aplicação
CMD ["npm", "run", "start"]
