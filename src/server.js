'use strict';
const path = require('path');
const { pipeline } = require('stream');
require("dotenv").config({ path: path.resolve(__dirname, '..', '.env') });
const fs = require('fs');
const express = require('express');
const app = express();
const cors = require('cors');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1.js');
const TextToSpeechV1 = require('ibm-watson/text-to-speech/v1.js');
const { IamAuthenticator } = require('ibm-watson/auth');
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

const sttAuthService = new SpeechToTextV1({
  authenticator: new IamAuthenticator({ 
    apikey: 'ee3R9nflWBDAolFYewd7u-gdcD6fb4hVFy9t6XlcwFYN'
   }),
  url: 'https://api.us-south.speech-to-text.watson.cloud.ibm.com/instances/6c0f27d6-6018-4082-8ec6-0cb8bc1cc343'
});

// async function run (){
//   await pipeline(
//     fs.createReadStream('./resources/speech.wav'),
//     sttAuthService.recognizeUsingWebSocket({ contentType: 'audio/l16; rate=44100' }),
//     fs.createWriteStream('./transcription.txt'),
//     (err) => {
//       if (err) {
//         console.error('Pipeline failed.', err);
//       } else {
//         console.log('Pipeline succeeded.');
//       }
//     }
  
//   )

// } 

const params = {
  objectMode: true,
  contentType: 'audio/flac',
  model: 'en-US_BroadbandModel',
  keywords: ['colorado', 'tornado', 'tornadoes'],
  keywordsThreshold: 0.5,
  maxAlternatives: 3,
};

app.get('/api/speech-to-text/token', function(req, res) {
  const recognizeStream = sttAuthService.recognizeUsingWebSocket(params);  
  fs.createReadStream('./resources/audio-file.flac').pipe(recognizeStream);
  recognizeStream.on('data', function(event) { onEvent('Data:', event); });
  recognizeStream.on('error', function(event) { onEvent('Error:', event); });
  recognizeStream.on('close', function(event) { onEvent('Close:', event); });

  function onEvent(name, event) {
    console.log(name, JSON.stringify(event, null, 2));
};
  
  // sttAuthService.recognize(params)
  // .then(response => {
  //   console.log(JSON.stringify(response.result, null, 2));
  // })
  // .catch(err => {
  //   console.log(err);
  // });
});

//----------------------------------------TEXT-TO-SPEECH---------------------------------------------//

const textToSpeech = new TextToSpeechV1({
  authenticator: new IamAuthenticator({
    apikey: process.env.TEXT_TO_SPEECH_IAM_APIKEY
  }),
  serviceurl: process.env.TEXT_TO_SPEECH_URL,
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

app.get('/api/v3/synthesize', async (req, res, next) => {
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