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
    if (!request) throw new Error('Body sin “request”.');

    /* --- 1) LAUNCH REQUEST ------------------------------------ */
    if (request.type === 'LaunchRequest') {
      return res.status(200).json({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'Bienvenido a fondo mágico. Puedes decir, pon el fondo rojo.'
          },
          reprompt: {
            outputSpeech: {
              type: 'PlainText',
              text: '¿Qué color quieres para el fondo?'
            }
          },
          shouldEndSession: false
        }
      });
    }

    /* --- 2) INTENT REQUEST ------------------------------------ */
    if (request.type === 'IntentRequest') {
      const intent = request.intent || {};
      if (intent.name === 'SetBackgroundColorIntent') {
        const color = (intent.slots?.color?.value || 'blanco').toLowerCase();

        const COLORS = {
          rojo:      '#ff0000',
          azul:      '#0000ff',
          verde:     '#00ff00',
          amarillo:  '#ffff00',
          blanco:    '#ffffff',
          negro:     '#000000'
        };
        const colorHex = COLORS[color] || '#ffffff';

        // Enviar a todos los clientes WebSocket
        clients.forEach((c) => {
          if (c.readyState === OPEN) c.send(colorHex);
        });

        return res.status(200).json({
          version: '1.0',
          response: {
            outputSpeech: {
              type: 'PlainText',
              text: `Cambiando el fondo a ${color}`
            },
            shouldEndSession: true
          }
        });
      }

      /* INTENT NO RECONOCIDO */
      return res.status(200).json({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'No entendí esa petición. Intenta “pon el fondo rojo”.'
          },
          shouldEndSession: false
        }
      });
    }

    /* --- 3) SESSION ENDED ------------------------------------- */
    if (request.type === 'SessionEndedRequest') {
      console.log('SessionEnded:', request.reason || 'sin razón');
      return res.sendStatus(200);      // 200 vacío, Alexa lo acepta
    }

    /* --- 4) OTRO TIPO DE REQUEST ------------------------------ */
    return res.status(200).json({
      version: '1.0',
      response: { shouldEndSession: true }
    });
  } catch (err) {
    console.error('❌  Error manejando la request:', err);
    return res.status(200).json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'Hubo un error procesando tu solicitud.'
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
