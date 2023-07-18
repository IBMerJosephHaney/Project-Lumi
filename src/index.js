import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
//import './index.css';
import * as THREE from "three";
import { createNoise3D } from 'simplex-noise';
import mic from './img/mic.gif';
import mic2 from './img/mic_active.png';
//import synthesize from 'watson-speech/text-to-speech/synthesize';
//import recognizeMic from 'watson-speech/speech-to-text/recognize-microphone';
import Dropzone from 'react-dropzone';
import {
  Icon, Tabs, Pane, Alert,
} from 'watson-react-components';
import recognizeMicrophone from 'watson-speech/speech-to-text/recognize-microphone';
import recognizeFile from 'watson-speech/speech-to-text/recognize-file';
import synthesize from 'watson-speech/text-to-speech/synthesize';
import Transcript from './transcript.jsx';
import SpeakersView from './speaker.jsx';
import cachedModels from '../src/resources/models.json';


const ERR_MIC_NARROWBAND = 'Microphone transcription cannot accommodate narrowband voice models, please select a broadband one.';
const NEW_DEMO_NOTIFICATION = 'A new Speech to Text demo is available, check it out ';


var context;

class App extends Component {
  constructor(props) {
    super();
    this.state = {
      model: 'en-US_BroadbandModel',
      rawMessages: [],
      formattedMessages: [],
      audioSource: null,
      speakerLabels: false,
      
      // Changing them during a transcription would cause a mismatch between the setting sent to the
      // service and what is displayed on the demo, and could cause bugs.
      settingsAtStreamStart: {
        model: '',
        speakerLabels: false,
      },
      error: null,
      responseBack: '',
      responseBackAudio: null,
    };
    this.reset = this.reset.bind(this);
    this.captureSettings = this.captureSettings.bind(this);
    this.stopTranscription = this.stopTranscription.bind(this);
    this.getRecognizeOptions = this.getRecognizeOptions.bind(this);
    this.isNarrowBand = this.isNarrowBand.bind(this);
    this.handleMicClick = this.handleMicClick.bind(this);
    this.handleUserFile = this.handleUserFile.bind(this);
    this.handleUserFileRejection = this.handleUserFileRejection.bind(this);
    this.playFile = this.playFile.bind(this);
    this.handleStream = this.handleStream.bind(this);
    this.handleRawMessage = this.handleRawMessage.bind(this);
    this.handleFormattedMessage = this.handleFormattedMessage.bind(this);
    this.handleTranscriptEnd = this.handleTranscriptEnd.bind(this);
    this.handleModelChange = this.handleModelChange.bind(this);
    this.supportsSpeakerLabels = this.supportsSpeakerLabels.bind(this);
    this.handleSpeakerLabelsChange = this.handleSpeakerLabelsChange.bind(this);
    this.getFinalResults = this.getFinalResults.bind(this);
    this.getCurrentInterimResult = this.getCurrentInterimResult.bind(this);
    this.getFinalAndLatestInterimResult = this.getFinalAndLatestInterimResult.bind(this);
    this.handleError = this.handleError.bind(this);
  }

  reset() {
    if (this.state.audioSource) {
      this.stopTranscription();
    }
    this.setState({ rawMessages: [], formattedMessages: [], error: null });
  }

  captureSettings() {
    const { model, speakerLabels } = this.state;
    this.setState({
      settingsAtStreamStart: {
        model,
        speakerLabels,
      },
    });
  }

  stopTranscription() {
    if (this.stream) {
      this.stream.stop();
      // this.stream.removeAllListeners();
      // this.stream.recognizeStream.removeAllListeners();
    }
    this.setState({ audioSource: null });
  }

  getRecognizeOptions(extra) {
    return Object.assign({
      // formats phone numbers, currency, etc. (server-side)
      accessToken: this.state.accessToken,
      token: this.state.token,
      smartFormatting: true,
      format: true, // adds capitals, periods, and a few other things (client-side)
      model: this.state.model,
      objectMode: true,
      interimResults: true,
      // note: in normal usage, you'd probably set this a bit higher
      wordAlternativesThreshold: 0.01,
       // note: in normal usage, you'd probably set this a bit higher
      timestamps: true, // set timestamps for each word - automatically turned on by speaker_labels
      // includes the speaker_labels in separate objects unless resultsBySpeaker is enabled
      speakerLabels: this.state.speakerLabels,
      // combines speaker_labels and results together into single objects,
      // making for easier transcript outputting
      resultsBySpeaker: this.state.speakerLabels,
      // allow interim results through before the speaker has been determined
      speakerlessInterim: this.state.speakerLabels,
      url: this.state.serviceUrl,
    }, extra);
  }

  getSynthesizeOptions(theText) {
    return Object.assign({
      // formats phone numbers, currency, etc. (server-side)
      accessToken: this.state.accessToken_tts,
      token: this.state.token_tts,
      text: 'Watson says ' + theText,
      url: this.state.serviceUrl_tts,
      autoPlay: true,
    });
  }

  isNarrowBand(model) {
    model = model || this.state.model;
    return model.indexOf('Narrowband') !== -1;
  }

  downloadFile(src) {
    fetch(src, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/ogg',
      },
    })
    .then((response) => response.blob())
    .then((blob) => {
      // // Create blob link to download
      // const url = window.URL.createObjectURL(
      //   new Blob([blob]),
      // );

      this.setState({
        responseBackAudio: new File([blob], "audio.ogg"),
      });
    });    
    
  }

  respondBack(text){
    const audioEle = synthesize(this.getSynthesizeOptions(text));
    console.log('audioEle',audioEle);
    console.log('audioEle.src',audioEle.src);
    //this.downloadFile(audioEle.src);
    this.setState({
      responseBack: text,
      responseBackAudio: audioEle,
    });
  }

  handleMicClick() {
    if (this.state.audioSource === 'mic') {
      const finalText = this.getFinalAndLatestInterimResult();
      this.respondBack(finalText[0].results[0].alternatives[0].transcript)
      //handleMute();
      this.stopTranscription();
      return;
    }
    this.reset();
    this.setState({ audioSource: 'mic' });

    // The recognizeMicrophone() method is a helper method provided by the watson-speech package
    // It sets up the microphone, converts and downsamples the audio, and then transcribes it
    // over a WebSocket connection
    // It also provides a number of optional features, some of which are enabled by default:
    //  * enables object mode by default (options.objectMode)
    //  * formats results (Capitals, periods, etc.) (options.format)
    //  * outputs the text to a DOM element - not used in this demo because it doesn't play nice
    // with react (options.outputElement)
    //  * a few other things for backwards compatibility and sane defaults
    // In addition to this, it passes other service-level options along to the RecognizeStream that
    // manages the actual WebSocket connection.
    this.handleStream(recognizeMicrophone(this.getRecognizeOptions()));
  }

  handleUserFile(files) {
    const file = files[0];
    if (!file) {
      return;
    }
    this.reset();
    this.setState({ audioSource: 'upload' });
    this.playFile(file);
  }

  handleUserFileRejection() {
    this.setState({ error: 'Sorry, that file does not appear to be compatible.' });
  }
  /**
   * @param {File|Blob|String} file - url to an audio file or a File
   * instance fro user-provided files.
   */
  playFile(file) {
    // The recognizeFile() method is a helper method provided by the watson-speach package
    // It accepts a file input and transcribes the contents over a WebSocket connection
    // It also provides a number of optional features, some of which are enabled by default:
    //  * enables object mode by default (options.objectMode)
    //  * plays the file in the browser if possible (options.play)
    //  * formats results (Capitals, periods, etc.) (options.format)
    //  * slows results down to realtime speed if received faster than realtime -
    // this causes extra interim `data` events to be emitted (options.realtime)
    //  * combines speaker_labels with results (options.resultsBySpeaker)
    //  * outputs the text to a DOM element - not used in this demo because it doesn't play
    //  nice with react (options.outputElement)
    //  * a few other things for backwards compatibility and sane defaults
    // In addition to this, it passes other service-level options along to the RecognizeStream
    // that manages the actual WebSocket connection.
    this.handleStream(recognizeFile(this.getRecognizeOptions({
      file,
      play: true, // play the audio out loud
      // use a helper stream to slow down the transcript output to match the audio speed
      realtime: true,
    })));
  }

  handleStream(stream) {
    console.log(stream);
    // cleanup old stream if appropriate
    if (this.stream) {
      this.stream.stop();
      this.stream.removeAllListeners();
      this.stream.recognizeStream.removeAllListeners();
    }
    this.stream = stream;
    this.captureSettings();

    // grab the formatted messages and also handle errors and such
    stream.on('data', this.handleFormattedMessage).on('end', this.handleTranscriptEnd).on('error', this.handleError);

    // when errors occur, the end event may not propagate through the helper streams.
    // However, the recognizeStream should always fire a end and close events
    stream.recognizeStream.on('end', () => {
      if (this.state.error) {
        this.handleTranscriptEnd();
      }
    });

    // grab raw messages from the debugging events for display on the JSON tab
    stream.recognizeStream
      .on('message', (frame, json) => this.handleRawMessage({ sent: false, frame, json }))
      .on('send-json', json => this.handleRawMessage({ sent: true, json }))
      .once('send-data', () => this.handleRawMessage({
        sent: true, binary: true, data: true, // discard the binary data to avoid waisting memory
      }))
      .on('close', (code, message) => this.handleRawMessage({ close: true, code, message }));

    // ['open','close','finish','end','error', 'pipe'].forEach(e => {
    //     stream.recognizeStream.on(e, console.log.bind(console, 'rs event: ', e));
    //     stream.on(e, console.log.bind(console, 'stream event: ', e));
    // });
  }

  handleRawMessage(msg) {
    const { rawMessages } = this.state;
    this.setState({ rawMessages: rawMessages.concat(msg) });
  }

  handleFormattedMessage(msg) {
    const { formattedMessages } = this.state;
    this.setState({ formattedMessages: formattedMessages.concat(msg) });
  }

  handleTranscriptEnd() {
    // note: this function will be called twice on a clean end,
    // but may only be called once in the event of an error
    this.setState({ audioSource: null });
  }


  componentDidMount() {
    this.fetchToken();
    this.fetchToken_tts();

     // tokens expire after 60 minutes, so automatcally fetch a new one ever 50 minutes
    // Not sure if this will work properly if a computer goes to sleep for > 50 minutes
    // and then wakes back up
    // react automatically binds the call to this
    // eslint-disable-next-line
    this.setState({
      tokenInterval: setInterval(this.fetchToken, 50 * 60 * 1000),
      tokenInterval_tts: setInterval(this.fetchToken_tts, 50 * 60 * 1000)
    });
   
    const recordMic = document.getElementById('stt2');

    var noise3 = new createNoise3D();
    
    document.body.addEventListener('touchend', function (ev) { context.resume(); });

    //recordMic.onclick = clickRecord

    function play(aud, delay=500) {
      context = new AudioContext();
      var src = context.createMediaElementSource(aud);
      var analyser = context.createAnalyser();
      src.connect(analyser);
      analyser.connect(context.destination);
      analyser.fftSize = 256;
      var bufferLength = analyser.frequencyBinCount;
      var dataArray = new Uint8Array(bufferLength);

      //here comes the webgl
      var scene = new THREE.Scene();
      var group = new THREE.Group();
      var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(0, 0, 100);
      camera.lookAt(scene.position);
      scene.add(camera);

      var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      document.body.appendChild(renderer.domElement);

      // var planeGeometry = new THREE.PlaneGeometry(400, 400, 10, 10);
      // var planeMaterial = new THREE.MeshLambertMaterial({
      //     color: 0x6904ce,
      //     side: THREE.DoubleSide,
      //     wireframe: true
      // });

      // var plane = new THREE.Mesh(planeGeometry, planeMaterial);
      // plane.rotation.x = -0.5 * Math.PI;
      // plane.position.set(0, 30, 0);
      // group.add(plane);

      // var plane2 = new THREE.Mesh(planeGeometry, planeMaterial);
      // plane2.rotation.x = -0.5 * Math.PI;
      // plane2.position.set(0, -30, 0);
      // group.add(plane2);

      var icosahedronGeometry = new THREE.IcosahedronGeometry(10, 4);
      var lambertMaterial = new THREE.MeshLambertMaterial({
        color: 0xff00ee,
        wireframe: true
      });

      var ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
      ball.position.set(0, 0, 0);
      group.add(ball);

      var ambientLight = new THREE.AmbientLight(0xaaaaaa);
      scene.add(ambientLight);

      var spotLight = new THREE.SpotLight(0xffffff);
      spotLight.intensity = 0.9;
      spotLight.position.set(-10, 40, 20);
      spotLight.lookAt(ball);
      spotLight.castShadow = true;
      scene.add(spotLight);

      // var orbitControls = new OrbitControls(camera, renderer.domElement);
      // orbitControls.autoRotate = true;

      scene.add(group);

      document.getElementById('out').appendChild(renderer.domElement);

      window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

      render();

    
      function render() {
        analyser.getByteFrequencyData(dataArray);

        var lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
        var upperHalfArray = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

        // var overallAvg = avg(dataArray);
        var lowerMax = max(lowerHalfArray);
        // var lowerAvg = avg(lowerHalfArray);
        // var upperMax = max(upperHalfArray);
        var upperAvg = avg(upperHalfArray);

        var lowerMaxFr = lowerMax / lowerHalfArray.length;
        // var lowerAvgFr = lowerAvg / lowerHalfArray.length;
        // var upperMaxFr = upperMax / upperHalfArray.length;
        var upperAvgFr = upperAvg / upperHalfArray.length;

        // makeRoughGround(plane, modulate(upperAvgFr, 0, 1, 0.5, 4));
        // makeRoughGround(plane2, modulate(lowerMaxFr, 0, 1, 0.5, 4));

        makeRoughBall(ball, modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8), modulate(upperAvgFr, 0, 1, 0, 4));

        group.rotation.y += 0.005;
        renderer.render(scene, camera);
        requestAnimationFrame(render);
      }
      // function makeRoughGround(mesh, distortionFr) {
      //   var positionAttribute = mesh.geometry.attributes.position.array;
      //   var vertex = new THREE.Vector3();

      //   for ( let vertexIndex = 0; vertexIndex < positionAttribute.length; vertexIndex ++ ) {
      //     vertex.fromArray( positionAttribute, vertexIndex );
      //     var amp = 2;
      //     var time = Date.now();
      //     var distance = (noise2(vertex.getComponent(0) + time * 0.0003, vertex.getComponent(1) + time * 0.0001) + 0) * distortionFr * amp;
      //     vertex.setComponent(2, distance);
      //     mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(0);
      //     vertexIndex++;
      //     mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(1);
      //     vertexIndex++;
      //     mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(2);
      //   }
      //   mesh.geometry.attributes.position.updateProjectionMatrix = true;
      //   mesh.geometry.verticesNeedUpdate = true;
      // }
      if (delay>0){
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        sleep(delay).then(()=>aud.play())
      }
      // aud.play();
    };


    function onWindowResize(cam, ren) {
      cam.aspect = window.innerWidth / window.innerHeight;
      cam.updateProjectionMatrix();
      ren.setSize(window.innerWidth, window.innerHeight);
    }

    function makeRoughBall(mesh, bassFr, treFr) {
      const positionAttribute = mesh.geometry.attributes.position.array;
      var vertex = new THREE.Vector3();

      for (let vertexIndex = 0; vertexIndex < positionAttribute.length; vertexIndex++) {
        vertex.fromArray(positionAttribute, vertexIndex);
        var offset = mesh.geometry.parameters.radius;
        var amp = 7;
        var time = window.performance.now();
        var rf = 0.00001;
        vertex.normalize();
        var distance = (offset + bassFr) + noise3(vertex.getComponent(0) + time * rf * 7, vertex.getComponent(1) + time * rf * 8, vertex.getComponent(2) + time * rf * 9) * amp * treFr;
        vertex.multiplyScalar(.5 * distance);
        mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(0);
        vertexIndex++;
        mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(1);
        vertexIndex++;
        mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(2);
      }
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.attributes.position.updateProjectionMatrix = true;
      mesh.geometry.verticesNeedUpdate = true;
    }

    // function clickRecord () {
    //   var paragraph = document.getElementById("output");
    //   if (recordMic.id == 'stt2') {
    //     try {
    //       recordMic.src = mic2;
    //       recordMic.id = 'stt';
    //       // startRecording();
    //       fetch('http://localhost:3002//api/v1/credentials')
    // .then((response) =>{
    //   console.log("This is the response" + response)
    //     return response.text();
    // }).then((token) => {

    //   console.log(token)
    //   var stream = recognizeMic({
    //       token: token,
    //       objectMode: true, // send objects instead of text
    //       extractResults: true, // convert {results: [{alternatives:[...]}], result_index: 0} to {alternatives: [...], index: 0}
    //       format: false // optional - performs basic formatting on the results such as capitals an periods
    //   });

    //   /**
    //    * Prints the users speech to the console
    //    * and assigns the text to the state.
    //    */
    //   stream.on('data',(data) => {
    //     this.setState({
    //       text: data.alternatives[0].transcript
    //     })

    //     // console.log(data.alternatives[0].transcript)
    //   });
    //   stream.on('error', function(err) {
    //       console.log(err);
    //   });
    //   document.querySelector('#stop').onclick = stream.stop.bind(stream);
    // }).catch(function(error) {
    //     console.log(error);
    // });


    //       console.log('recorder started');
    //       paragraph.innerHTML = "I am listening...";
    //     } catch (ex) {
    //       console.log("Ooops.....", ex);
    //       paragraph.innerHTML = "";
    //     }
    //   } 
    // }

    //some helper functions here
    function fractionate(val, minVal, maxVal) {
      return (val - minVal) / (maxVal - minVal);
    }

    function modulate(val, minVal, maxVal, outMin, outMax) {
      var fr = fractionate(val, minVal, maxVal);
      var delta = outMax - outMin;
      return outMin + (fr * delta);
    }

    function avg(arr) {
      var total = arr.reduce(function (sum, b) { return sum + b; });
      return (total / arr.length);
    }

    function max(arr) {
      return arr.reduce(function (a, b) { return Math.max(a, b); })
    }
  }

  componentWillUnmount() {
    clearInterval(this.state.tokenInterval);
    clearInterval(this.state.tokenInterval_tts);
  }

  fetchToken() {
    return fetch('/api/v1/credentials').then((res) => {
      if (res.status !== 200) {
        throw new Error('Error retrieving auth token');
      }
      return res.json();
    }) // todo: throw here if non-200 status
      .then(creds => this.setState({ ...creds })).catch(this.handleError);
  }

  fetchToken_tts() {
    return fetch('/api/v1/credentials_tts').then((res) => {
      if (res.status !== 200) {
        throw new Error('Error retrieving auth token');
      }
      return res.json();
    }) // todo: throw here if non-200 status
      .then(creds => this.setState({ ...creds })).catch(this.handleError);
  }

  handleModelChange(model) {
    this.reset();
    this.setState({
      model,
      speakerLabels: this.supportsSpeakerLabels(model),
    });

    // clear the microphone narrowband error if it's visible and a broadband model was just selected
    if (this.state.error === ERR_MIC_NARROWBAND && !this.isNarrowBand(model)) {
      this.setState({ error: null });
    }

    // clear the speaker_lables is not supported error - e.g.
    // speaker_labels is not a supported feature for model en-US_BroadbandModel
    if (this.state.error && this.state.error.indexOf('speaker_labels is not a supported feature for model') === 0) {
      this.setState({ error: null });
    }
  }

  supportsSpeakerLabels(model) {
    model = model || this.state.model;
    // todo: read the upd-to-date models list instead of the cached one
    return cachedModels.some(m => m.name === model && m.supported_features.speaker_labels);
  }

  handleSpeakerLabelsChange() {
    this.setState(prevState => ({ speakerLabels: !prevState.speakerLabels }));
  }


  getFinalResults() {
    return this.state.formattedMessages.filter(r => r.results
      && r.results.length && r.results[0].final);
  }

  getCurrentInterimResult() {
    const r = this.state.formattedMessages[this.state.formattedMessages.length - 1];

    // When resultsBySpeaker is enabled, each msg.results array may contain multiple results.
    // However, all results in a given message will be either final or interim, so just checking
    // the first one still works here.
    if (!r || !r.results || !r.results.length || r.results[0].final) {
      return null;
    }
    return r;
  }

  getFinalAndLatestInterimResult() {
    const final = this.getFinalResults();
    const interim = this.getCurrentInterimResult();
    if (interim) {
      final.push(interim);
    }
    return final;
  }

  handleError(err, extra) {
    console.error(err, extra);
    if (err.name === 'UNRECOGNIZED_FORMAT') {
      err = 'Unable to determine content type from file name or header; mp3, wav, flac, ogg, opus, and webm are supported. Please choose a different file.';
    } else if (err.name === 'NotSupportedError' && this.state.audioSource === 'mic') {
      err = 'This browser does not support microphone input.';
    } else if (err.message === '(\'UpsamplingNotAllowed\', 8000, 16000)') {
      err = 'Please select a narrowband voice model to transcribe 8KHz audio files.';
    } else if (err.message === 'Invalid constraint') {
      // iPod Touch does this on iOS 11 - there is a microphone, but Safari claims there isn't
      err = 'Unable to access microphone';
    }
    this.setState({ error: err.message || err });
  }

  render() {
    const {
      token, accessToken, token_tts, accessToken_tts, audioSource, error, model, speakerLabels, settingsAtStreamStart,
      formattedMessages, rawMessages,
    } = this.state;

    const buttonsEnabled = !!token || !!accessToken;
    const buttonClass = buttonsEnabled
      ? 'base--button'
      : 'base--button base--button_black';

    let micIconFill = '#000000';
    let micButtonClass = buttonClass;
    if (audioSource === 'mic') {
      micButtonClass += ' mic-active';
      micIconFill = '#FFFFFF';
    } else if (!recognizeMicrophone.isSupported) {
      micButtonClass += ' base--button_black';
    }

    const err = error
      ? (
        <Alert type="error" color="red">
          <p className="base--p">
            {error}
          </p>
        </Alert>
      )
      : null;

    const messages = this.getFinalAndLatestInterimResult();
    const micBullet = (typeof window !== 'undefined' && recognizeMicrophone.isSupported)
      ? <li className="base--li">Use your microphone to record audio. For best results, use broadband models for microphone input.</li>
      : <li className="base--li base--p_light">Use your microphone to record audio. (Not supported in current browser)</li>;// eslint-disable-line
    return (
      // <div ref={ref => (this.mount = ref)} />
      <Dropzone
      onDropAccepted={this.handleUserFile}
      onDropRejected={this.handleUserFileRejection}
      maxSize={200 * 1024 * 1024}
      accept="audio/wav, audio/mp3, audio/mpeg, audio/l16, audio/ogg, audio/flac, .mp3, .mpeg, .wav, .ogg, .opus, .flac" // eslint-disable-line
      disableClick
      className="dropzone _container _container_large"
      activeClassName="dropzone-active"
      rejectClassName="dropzone-reject"
      ref={(node) => {
        this.dropzone = node;
      }}
    >


      <div className="flex buttons">

        <button type="button" className={micButtonClass} onClick={this.handleMicClick}>
          <Icon type={audioSource === 'mic' ? 'stop' : 'microphone'} fill={micIconFill} /> Record Audio
        </button>

      </div>

    <div className="lumi-content">
      <h2>Lumi should be here</h2>
      <div id="out"></div>
    </div>

      {err}

      <div id="audioResponse"></div>
    </Dropzone>
    )

  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);