'use strict';
const path = require('path');
require('dotenv').config({ silent: true });
const fs = require('fs');
const express = require('express');
const app = express();
const cors = require('cors');
const { IamTokenManager } = require('ibm-watson/auth');
const SocketServer = require('ws').Server;


app.use(express.static(__dirname + '/static'));
app.use(cors());

const serviceUrl_stt = process.env.SPEECH_TO_TEXT_URL;
const serviceUrl_tts = process.env.TEXT_TO_SPEECH_URL;

const sttTokenManager = new IamTokenManager({
    apikey: process.env.SPEECH_TO_TEXT_IAM_APIKEY 
  });

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
    apikey: process.env.TEXT_TO_SPEECH_IAM_APIKEY 
  });


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