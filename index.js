// server.js
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
  console.log('Nuevo cliente WebSocket conectado');
  clients.add(ws);

  ws.on('close', () => {
    console.log('Cliente WebSocket desconectado');
    clients.delete(ws);
  });
});

app.post('/alexa', (req, res) => {
  try {
    console.log('--- Nueva petición de Alexa ---');
    console.log('Body recibido:', JSON.stringify(req.body, null, 2));

    const request = req.body.request;

    if (!request) {
      throw new Error('No se encontró el objeto request en el body');
    }

    if (request.type === 'LaunchRequest') {
      console.log('LaunchRequest recibido');
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
      if (!intent) throw new Error('No se encontró intent en la request');

      console.log(`IntentRequest recibido: ${intent.name}`);

      if (intent.name === 'SetBackgroundColorIntent') {
        const colorSlot = intent.slots && intent.slots.color;
        const color = colorSlot && colorSlot.value ? colorSlot.value.toLowerCase() : 'blanco';
        console.log(`Color solicitado: ${color}`);

        const colors = {
          rojo: '#ff0000',
          azul: '#0000ff',
          verde: '#00ff00',
          amarillo: '#ffff00',
          blanco: '#ffffff',
          negro: '#000000',
        };

        const colorHex = colors[color] || '#ffffff';
        console.log(`Color hex a enviar: ${colorHex}`);

        // Enviar color a todos los clientes conectados por WebSocket
        clients.forEach((client) => {
          if (client.readyState === client.OPEN) {
            console.log('Enviando color a un cliente WebSocket');
            client.send(colorHex);
          }
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

      console.log('Intent no reconocido:', intent.name);
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

    console.log('Tipo de request no manejado:', request.type);
    return res.json({
      version: '1.0',
      response: {
        shouldEndSession: true
      }
    });

  } catch (error) {
    console.error('Error capturado:', error);
    return res.json({
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

server.listen(3002, () => {
  console.log('Servidor escuchando en http://localhost:3002');
});
