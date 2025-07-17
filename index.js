// server.js  (CommonJS + WebSocket)
const express = require('express');
const { WebSocketServer, OPEN } = require('ws');   // ⬅️  usamos OPEN para legibilidad
const bodyParser = require('body-parser');
const http = require('http');

const app = express();
app.use(bodyParser.json());

/* ----------  HTTP + WebSocket ---------- */
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Cliente WS conectado');
  clients.add(ws);
  ws.on('close', () => {
    console.log('Cliente WS desconectado');
    clients.delete(ws);
  });
});

/* ----------  RUTA /alexa --------------- */
app.post('/alexa', (req, res) => {
  try {
    const { request } = req.body;
    console.log('Request:', JSON.stringify(request, null, 2)); // ← Debug

    if (!request) {
      throw new Error('Request no definido en el body');
    }

    // LaunchRequest
    if (request.type === 'LaunchRequest') {
      return res.json({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'Di: "pon el fondo rojo" o "cambia a azul".'
          },
          shouldEndSession: false
        }
      });
    }

    // IntentRequest
    if (request.type === 'IntentRequest') {
      const intent = request.intent;
      if (intent.name === 'SetBackgroundColorIntent') {
        const color = intent.slots?.color?.value || 'blanco';
        const colorHex = {
          rojo: '#FF0000',
          azul: '#0000FF',
          verde: '#00FF00',
          amarillo: '#FFFF00',
          blanco: '#FFFFFF',
          negro: '#000000'
        }[color] || '#FFFFFF';

        // Envía el color a los clientes WebSocket
        clients.forEach(client => {
          if (client.readyState === OPEN) client.send(colorHex);
        });

        return res.json({
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: `Cambiando el fondo a ${color}`
            },
            shouldEndSession: true
          }
        });
      } else {
        // Intent no reconocido
        return res.json({
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: 'No entendí el comando. Prueba con "pon el fondo rojo".'
            },
            shouldEndSession: false
          }
        });
      }
    }

    // SessionEndedRequest
    if (request.type === 'SessionEndedRequest') {
      console.log('Sesión terminada:', request.reason);
      return res.sendStatus(200); // Respuesta vacía
    }

    // Request no manejado
    throw new Error(`Tipo de request no soportado: ${request.type}`);
  } catch (error) {
    console.error('Error:', error);
    return res.status(200).json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'Hubo un error. Intenta de nuevo.'
        },
        shouldEndSession: true
      }
    });
  }
});
/* ----------  ARRANQUE ------------------- */
const PORT = process.env.PORT || 3002;   // ⬅️  Render / Railway usarán su propio puerto
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
