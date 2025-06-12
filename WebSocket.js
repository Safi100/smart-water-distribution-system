const WebSocket = require("ws");

let wss = null;

const initWebSocket = (server) => {
  wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", (message) => {
      console.log("Received:", message);
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
};

const broadcast = (data) => {
  if (!wss) {
    console.error("WebSocket server not initialized");
    return;
  }
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
};

module.exports = { initWebSocket, broadcast };
