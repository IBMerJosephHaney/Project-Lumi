// import React, { Component } from 'react';
// import ReactDOM from 'react-dom/client';
// import './index.css';
// import * as THREE from "three";
// import { createNoise3D } from 'simplex-noise';
// import mic from './img/mic.gif';
// import mic2 from './img/mic_active.png';
// //import synthesize from 'watson-speech/text-to-speech/synthesize';
// import recognizeMic from 'watson-speech/speech-to-text/recognize-microphone';


// var context;

// class App extends Component {
//   constructor() {
//     super()
//     this.state = {}
//   }

//   componentDidMount() {
    
//     let a0 = document.getElementById('audio0')
//     let a1 = document.getElementById('audio1')
//     let a2 = document.getElementById('audio2')
//     let a3 = document.getElementById('audio3')

//     let counter = -1;

//     const recordMic = document.getElementById('stt2');

//     var noise3 = new createNoise3D();
    
//     document.body.addEventListener('touchend', function (ev) { context.resume(); });

//     recordMic.onclick = clickRecord

//     function play(aud, delay=500) {
//       context = new AudioContext();
//       var src = context.createMediaElementSource(aud);
//       var analyser = context.createAnalyser();
//       src.connect(analyser);
//       analyser.connect(context.destination);
//       analyser.fftSize = 256;
//       var bufferLength = analyser.frequencyBinCount;
//       var dataArray = new Uint8Array(bufferLength);

//       //here comes the webgl
//       var scene = new THREE.Scene();
//       var group = new THREE.Group();
//       var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
//       camera.position.set(0, 0, 100);
//       camera.lookAt(scene.position);
//       scene.add(camera);

//       var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
//       renderer.setSize(window.innerWidth, window.innerHeight);
//       document.body.appendChild(renderer.domElement);

//       // var planeGeometry = new THREE.PlaneGeometry(400, 400, 10, 10);
//       // var planeMaterial = new THREE.MeshLambertMaterial({
//       //     color: 0x6904ce,
//       //     side: THREE.DoubleSide,
//       //     wireframe: true
//       // });

//       // var plane = new THREE.Mesh(planeGeometry, planeMaterial);
//       // plane.rotation.x = -0.5 * Math.PI;
//       // plane.position.set(0, 30, 0);
//       // group.add(plane);

//       // var plane2 = new THREE.Mesh(planeGeometry, planeMaterial);
//       // plane2.rotation.x = -0.5 * Math.PI;
//       // plane2.position.set(0, -30, 0);
//       // group.add(plane2);

//       var icosahedronGeometry = new THREE.IcosahedronGeometry(10, 4);
//       var lambertMaterial = new THREE.MeshLambertMaterial({
//         color: 0xff00ee,
//         wireframe: true
//       });

//       var ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
//       ball.position.set(0, 0, 0);
//       group.add(ball);

//       var ambientLight = new THREE.AmbientLight(0xaaaaaa);
//       scene.add(ambientLight);

//       var spotLight = new THREE.SpotLight(0xffffff);
//       spotLight.intensity = 0.9;
//       spotLight.position.set(-10, 40, 20);
//       spotLight.lookAt(ball);
//       spotLight.castShadow = true;
//       scene.add(spotLight);

//       // var orbitControls = new OrbitControls(camera, renderer.domElement);
//       // orbitControls.autoRotate = true;

//       scene.add(group);

//       document.getElementById('out').appendChild(renderer.domElement);

//       window.addEventListener('resize', () => onWindowResize(camera, renderer), false);

//       render();

    
//       function render() {
//         analyser.getByteFrequencyData(dataArray);

//         var lowerHalfArray = dataArray.slice(0, (dataArray.length / 2) - 1);
//         var upperHalfArray = dataArray.slice((dataArray.length / 2) - 1, dataArray.length - 1);

//         // var overallAvg = avg(dataArray);
//         var lowerMax = max(lowerHalfArray);
//         // var lowerAvg = avg(lowerHalfArray);
//         // var upperMax = max(upperHalfArray);
//         var upperAvg = avg(upperHalfArray);

//         var lowerMaxFr = lowerMax / lowerHalfArray.length;
//         // var lowerAvgFr = lowerAvg / lowerHalfArray.length;
//         // var upperMaxFr = upperMax / upperHalfArray.length;
//         var upperAvgFr = upperAvg / upperHalfArray.length;

//         // makeRoughGround(plane, modulate(upperAvgFr, 0, 1, 0.5, 4));
//         // makeRoughGround(plane2, modulate(lowerMaxFr, 0, 1, 0.5, 4));

//         makeRoughBall(ball, modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 8), modulate(upperAvgFr, 0, 1, 0, 4));

//         group.rotation.y += 0.005;
//         renderer.render(scene, camera);
//         requestAnimationFrame(render);
//       }
//       // function makeRoughGround(mesh, distortionFr) {
//       //   var positionAttribute = mesh.geometry.attributes.position.array;
//       //   var vertex = new THREE.Vector3();

//       //   for ( let vertexIndex = 0; vertexIndex < positionAttribute.length; vertexIndex ++ ) {
//       //     vertex.fromArray( positionAttribute, vertexIndex );
//       //     var amp = 2;
//       //     var time = Date.now();
//       //     var distance = (noise2(vertex.getComponent(0) + time * 0.0003, vertex.getComponent(1) + time * 0.0001) + 0) * distortionFr * amp;
//       //     vertex.setComponent(2, distance);
//       //     mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(0);
//       //     vertexIndex++;
//       //     mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(1);
//       //     vertexIndex++;
//       //     mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(2);
//       //   }
//       //   mesh.geometry.attributes.position.updateProjectionMatrix = true;
//       //   mesh.geometry.verticesNeedUpdate = true;
//       // }
//       if (delay>0){
//         const sleep = ms => new Promise(r => setTimeout(r, ms));
//         sleep(delay).then(()=>aud.play())
//       }
//       // aud.play();
//     };


//     function onWindowResize(cam, ren) {
//       cam.aspect = window.innerWidth / window.innerHeight;
//       cam.updateProjectionMatrix();
//       ren.setSize(window.innerWidth, window.innerHeight);
//     }

//     function makeRoughBall(mesh, bassFr, treFr) {
//       const positionAttribute = mesh.geometry.attributes.position.array;
//       var vertex = new THREE.Vector3();

//       for (let vertexIndex = 0; vertexIndex < positionAttribute.length; vertexIndex++) {
//         vertex.fromArray(positionAttribute, vertexIndex);
//         var offset = mesh.geometry.parameters.radius;
//         var amp = 7;
//         var time = window.performance.now();
//         var rf = 0.00001;
//         vertex.normalize();
//         var distance = (offset + bassFr) + noise3(vertex.getComponent(0) + time * rf * 7, vertex.getComponent(1) + time * rf * 8, vertex.getComponent(2) + time * rf * 9) * amp * treFr;
//         vertex.multiplyScalar(.5 * distance);
//         mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(0);
//         vertexIndex++;
//         mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(1);
//         vertexIndex++;
//         mesh.geometry.attributes.position.array[vertexIndex] = vertex.getComponent(2);
//       }
//       mesh.geometry.attributes.position.needsUpdate = true;
//       mesh.geometry.attributes.position.updateProjectionMatrix = true;
//       mesh.geometry.verticesNeedUpdate = true;
//     }

//     function triggerHardcodedAudio(index, delay=1000) {
//       console.log("counter index: " + `${index}`)
//       if (index === 0){
//         console.log('playing audio 0')
//         play(a0, delay);
//       }
//       if (index === 1){
//         console.log('playing audio 1')
//         play(a1, delay);
//       }
//       if (index === 2){
//         console.log('playing audio 2')
//         play(a2, delay);
//       }
//       if (index === 3){
//         console.log('playing audio 3')
//         play(a3, delay);
//       }
//     }

//     function clickRecord () {
//       var paragraph = document.getElementById("output");
//       if (recordMic.id == 'stt2') {
//         try {
//           recordMic.src = mic2;
//           recordMic.id = 'stt';
//           // startRecording();
//           fetch('http://localhost:3002//api/v1/credentials')
//     .then((response) =>{
//       console.log("This is the response" + response)
//         return response.text();
//     }).then((token) => {

//       console.log(token)
//       var stream = recognizeMic({
//           token: token,
//           objectMode: true, // send objects instead of text
//           extractResults: true, // convert {results: [{alternatives:[...]}], result_index: 0} to {alternatives: [...], index: 0}
//           format: false // optional - performs basic formatting on the results such as capitals an periods
//       });

//       /**
//        * Prints the users speech to the console
//        * and assigns the text to the state.
//        */
//       stream.on('data',(data) => {
//         this.setState({
//           text: data.alternatives[0].transcript
//         })

//         // console.log(data.alternatives[0].transcript)
//       });
//       stream.on('error', function(err) {
//           console.log(err);
//       });
//       document.querySelector('#stop').onclick = stream.stop.bind(stream);
//     }).catch(function(error) {
//         console.log(error);
//     });


//           console.log('recorder started');
//           paragraph.innerHTML = "I am listening...";
//         } catch (ex) {
//           console.log("Ooops.....", ex);
//           paragraph.innerHTML = "";
//         }
//       } else {
//         // stopRecording();
//         // $('#q').val(''); need to take event.currentSource and remove that from src
//         document.getElementById('out').innerHTML = ''
//         recordMic.src = mic;
//         recordMic.id = 'stt2';
//         paragraph.innerHTML = "";
//         counter++;
//         // paragraph.innerHTML = `${counter}`;
//         triggerHardcodedAudio(counter)
//       }
//     }

//     //some helper functions here
//     function fractionate(val, minVal, maxVal) {
//       return (val - minVal) / (maxVal - minVal);
//     }

//     function modulate(val, minVal, maxVal, outMin, outMax) {
//       var fr = fractionate(val, minVal, maxVal);
//       var delta = outMax - outMin;
//       return outMin + (fr * delta);
//     }

//     function avg(arr) {
//       var total = arr.reduce(function (sum, b) { return sum + b; });
//       return (total / arr.length);
//     }

//     function max(arr) {
//       return arr.reduce(function (a, b) { return Math.max(a, b); })
//     }
//   }

//   render() {
//     return (
//       // <div ref={ref => (this.mount = ref)} />
//       <div>
//       <div id="content">
//         <div>
//         {/* <audio id="audio" controls></audio> */}
//         <audio id="audio"></audio>
//         {/* <ul id="audios-list"> */}
//         <audio id="audio0" src="audios/blank.mp4"></audio>
//         {/* <audio id="audio1" src="audios/how does a 3d printer work.mp4"></audio>
//         <audio id="audio2" src="audios/why is 3d printing important.mp4"></audio>
//         <audio id="audio3" src="audios/what is the most exciting thing we can do with 3d printing.mp4"></audio> */}
//         <audio id="audio1" src="audios/q1.wav"></audio>
//         <audio id="audio2" src="audios/q2.wav"></audio>
//         <audio id="audio3" src="audios/q3.wav"></audio>
//         {/* </ul> */}
//         <div id="out"></div>
//         </div>
//       </div>
//         <div className="micHolder">
//         <p id="output" className="textfield__input"></p>
//           <img id="stt2" className="microphone" src={mic} alt="disconnected"/>
//         </div>
//       </div>
//     )

//   }
// }


import React, { Component } from 'react';
import ReactDOM from 'react-dom/client';
import logo from './logo.svg';
import './App.css';
import { w3cwebsocket as W3CWebSocket } from "websocket";
import recognizeMic from 'watson-speech/speech-to-text/recognize-microphone';


const client = new W3CWebSocket('ws:localhost:3006');

class App extends Component {
  constructor(){
    super();
    this.state = {};
  }
  componentWillMount() {

    client.onopen = () => {
        console.log('WebSocket Client Connected');
    };

    client.onmessage = (message) => {
        console.log(message);
    };
}

  onClickButton(){

    fetch('http://localhost:3002/api/v1/credentials')
    .then((response) =>{
        return response.text();
    }).then((token) => {

      console.log(token)
      var stream = recognizeMic({
          token: token,
          objectMode: true, // send objects instead of text
          extractResults: true, // convert {results: [{alternatives:[...]}], result_index: 0} to {alternatives: [...], index: 0}
          format: false // optional - performs basic formatting on the results such as capitals an periods
      });

      /**
       * Prints the users speech to the console
       * and assigns the text to the state.
       */
      stream.on('data',(data) => {
        this.setState({
          text: data.alternatives[0].transcript
        })

        // console.log(data.alternatives[0].transcript)
      });
      stream.on('error', function(err) {
          console.log(err);
      });
      document.querySelector('#stop').onclick = stream.stop.bind(stream);
    }).catch(function(error) {
        console.log(error);
    });
  };
    render() {
      return (
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <h1 className="App-title">Welcome to React</h1>
          </header>
          <button id="button" onClick={this.onClickButton.bind(this)}>Listen To Microphone</button>
        <div className="App-Text">{this.state.text}</div> 
        </div>
      );
    }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

export default App;
