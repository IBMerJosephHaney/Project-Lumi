'use strict';
const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, '..', '.env') });
const fs = require('fs');
const express = require('express');
const app = express();
const cors = require('cors');
const { IamTokenManager } = require('ibm-watson/auth');
const SocketServer = require('ws').Server;

app.use(express.static(__dirname + '/static'));
app.use(cors());

// token endpoints
// **Warning**: these endpoints should probably be guarded with additional authentication & authorization for production use

// speech to text token endpoint

const serviceUrl_stt = process.env.SPEECH_TO_TEXT_URL;
const serviceUrl_tts = 'https://api.us-south.speech-to-text.watson.cloud.ibm.com';

const sttTokenManager = new IamTokenManager({
    apikey: process.env.SPEECH_TO_TEXT_IAM_APIKEY || 'ee3R9nflWBDAolFYewd7u-gdcD6fb4hVFy9t6XlcwFYN',
  });

// const params = {
//   objectMode: true,
//   contentType: 'audio/wav',
//   model: 'en-US_BroadbandModel',
//   keywords: ['colorado', 'tornado', 'tornadoes'],
//   keywordsThreshold: 0.5,
//   maxAlternatives: 3,
// };

app.get('/', (req, res) => res.render('index'));


/*---------------------------SPEECH TO TEXT----------------------*/

app.get('/api/v1/credentials', async (req, res, next) => {
    try {
      const accessToken = await sttTokenManager.getToken();
      res.json({
        accessToken,
        serviceUrl_stt,
      });
    } catch (err) {
      next(err);
    }
  });
//----------------------------------------TEXT-TO-SPEECH---------------------------------------------//

const ttsTokenManager = new IamTokenManager({
    apikey: process.env.TEXT_TO_SPEECH_IAM_APIKEY || '<iam_apikey>',
  });


const getFileExtension = (acceptQuery) => {
  const accept = acceptQuery || '';
  switch (accept) {
    case 'audio/ogg;codecs=opus':
    case 'audio/ogg;codecs=vorbis':
      return 'ogg';
    case 'audio/wav':
      return 'wav';
    case 'audio/mpeg':
      return 'mpeg';
    case 'audio/webm':
      return 'webm';
    case 'audio/flac':
      return 'flac';
    default:
      return 'mp3';
  }
};

/* app.get('/api/v3/synthesize', async (req, res, next) => {
  try {
    const { result } = await textToSpeech.synthesize(req.query);
    const transcript = result;
    transcript.on('response', (response) => {
      if (req.query.download) {
        response.headers['content-disposition'] = `attachment; filename=transcript.${getFileExtension(req.query.accept)}`;
      }
    });
    transcript.on('error', next);
    transcript.pipe(res);
  } catch (error) {
    res.send(error);
  }
}); */

app.get('/api/v1/credentials_tts', async (req, res, next) => {
    try {
      const accessToken_tts = await sttTokenManager.getToken();
      res.json({
        accessToken_tts,
        serviceUrl_tts,
      });
    } catch (err) {
      next(err);
    }
  });

const port = process.env.PORT || 3002;
console.log('listening at:', port);
let httpServer = app.listen(port)
const wss = new SocketServer({ server : httpServer });

// I'm maintaining all active connections in this object
const clients = {};

// Generates unique userid for every user.
const generateUniqueID = () => {

	const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);

	return s4() + '-' + s4() + '-' + s4();
};

wss.on('request', function(request) {
	var userID = generateUniqueID();

	console.log((new Date()) + ' Recieved a new connection from origin ' + request.origin + '.');

	// You can rewrite this part of the code to accept only the requests from allowed origin
	const connection = request.accept(null, request.origin);

	clients[userID] = connection;
	console.log('connected: ' + userID)

});