# Héberge le MCP en mode distant : l'acheteur se connecte par URL, zéro installation.
# Déployable tel quel sur un hébergeur conteneur (Smithery container, Render, Railway, Fly…).
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Transport distant + port (la plupart des hébergeurs injectent la variable PORT).
ENV MCP_TRANSPORT=streamable-http
ENV PORT=8000
EXPOSE 8000

CMD ["python", "server.py"]
