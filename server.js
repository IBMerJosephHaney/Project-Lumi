'use strict';
const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, '..', '.env') });
const fs = require('fs');
const express = require('express');
const app = express();
const cors = require('cors');
const { IamTokenManager } = require('ibm-watson/auth');
const vcapServices = require('vcap_services');

// on bluemix, enable rate-limiting and force https
if (process.env.VCAP_SERVICES) {
  // enable rate-limiting
  const RateLimit = require('express-rate-limit');
  app.enable('trust proxy'); // required to work properly behind Bluemix's reverse proxy

  const limiter = new RateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    delayMs: 0 // disable delaying - full speed until the max limit is reached
  });

  //  apply to /api/*
  app.use('/api/', limiter);

  // force https - microphone access requires https in Chrome and possibly other browsers
  // (*.mybluemix.net domains all have built-in https support)
  const secure = require('express-secure-only');
  app.use(secure());
}

app.use(express.static(__dirname + '/static'));
app.use(cors());

// token endpoints
// **Warning**: these endpoints should probably be guarded with additional authentication & authorization for production use

// speech to text token endpoint

const serviceUrl_stt = process.env.SPEECH_TO_TEXT_URL;
const serviceUrl_tts = process.env.TEXT_TO_SPEECH_URL;

const sttTokenManager = new IamTokenManager({
    apikey: process.env.SPEECH_TO_TEXT_IAM_APIKEY || '<iam_apikey>',
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


//---------------------------------------------------------------------------------------------------//


const port = process.env.PORT || process.env.VCAP_APP_PORT || 3002;
app.listen(port, function() {
  console.log('Example IBM Watson Speech JS SDK client app & token server live at http://localhost:%s/', port);
});

// Chrome requires https to access the user's microphone unless it's a localhost url so
// this sets up a basic server on port 3001 using an included self-signed certificate
// note: this is not suitable for production use
// however bluemix automatically adds https support at https://<myapp>.mybluemix.net
if (!process.env.VCAP_SERVICES) {
  const fs = require('fs');
  const https = require('https');
  const HTTPS_PORT = 3001;

  const options = {
    key: fs.readFileSync(__dirname + '/keys/localhost.pem'),
    cert: fs.readFileSync(__dirname + '/keys/localhost.cert')
  };
  https.createServer(options, app).listen(HTTPS_PORT, function() {
    console.log('Secure server live at https://localhost:%s/', HTTPS_PORT);
  });
}