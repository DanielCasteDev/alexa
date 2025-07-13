const express = require('express');
const { WebSocketServer } = require('ws');
const bodyParser = require('body-parser');
const http = require('http');

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  console.log('Cliente WS conectado');
  clients.add(ws);

  ws.on('close', () => {
    console.log('Cliente WS desconectado');
    clients.delete(ws);
  });
});

app.post('/alexa', (req, res) => {
  try {
    const { request } = req.body;

    if (!request) throw new Error('No request in body');

    if (request.type === 'LaunchRequest') {
      return res.json({
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

    if (request.type === 'IntentRequest') {
      const intent = request.intent;
      if (!intent) throw new Error('No intent in request');

      if (intent.name === 'SetBackgroundColorIntent') {
        const color = intent.slots?.color?.value || 'blanco';
        const colors = {
          rojo: '#ff0000',
          azul: '#0000ff',
          verde: '#00ff00',
          amarillo: '#ffff00',
          blanco: '#ffffff',
          negro: '#000000',
        };
        const colorHex = colors[color.toLowerCase()] || '#ffffff';

        // Enviar color a todos los clientes WS conectados
        clients.forEach(client => {
          if (client.readyState === 1) client.send(colorHex);
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
      }

      return res.json({
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: 'No entendí esa petición. Por favor, intenta con otro comando.'
          },
          shouldEndSession: false
        }
      });
    }

    // Para otros tipos de requests
    return res.json({
      version: '1.0',
      response: {
        shouldEndSession: true
      }
    });
  } catch (error) {
    console.error(error);
    return res.json({
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'Hubo un error procesando tu solicitud'
        },
        shouldEndSession: true
      }
    });
  }
});

server.listen(3002, () => {
  console.log('Servidor escuchando en http://localhost:3002');
});
