let video;
let poseNet;
let noseX = 0, noseY = 0;
let poses = [];

let mouth;
let center, leftEye, rightEye;
let nose;
let fingerPointer;

var recordingState = 0;
var mic, recorder, soundFile;
var startRecordingAtFrame = 0;

let speechRec;
let continuous = true;
let interim = false;

var vol = 0;
var onset_times;
let onset_flag = false
var split_sounds = [];
var number_of_particles = 0;

let units_of_sound = [];

var frameAtResponse;


function preload(){
}

function setup() {
	createCanvas(640, 480);
	video = createCapture(VIDEO);
	video.hide();
	poseNet = ml5.poseNet(video, modelReady);
	poseNet.on('pose', gotPoses);

	center = createVector(0,0);
	leftEye = createVector(0,0);
	rightEye = createVector(0,0);
	mouth = createVector(0,0);
	fingerPointer = createVector(0,0);



	// Sound recording stuff
	mic = new p5.AudioIn();

	//getAudioContext().resume()
	mic.start();
	recorder = new p5.SoundRecorder();
	recorder.setInput(mic)
	soundFile = new p5.SoundFile();


	speechRec = new p5.SpeechRec('en-US', gotSpeech);
	speechRec.start(continuous, false);

}


function gotSpeech(){
	console.log("calling got speech");
	console.log(speechRec);

	if (speechRec.resultValue){
		console.log(speechRec.resultString);
	}
}


function gotPoses(pose) {

	if (pose.length > 0){
		let newX = pose[0].pose.keypoints[0].position.x
		let newY = pose[0].pose.keypoints[0].position.y

		noseX = lerp(noseX, newX, 0.5);
		noseY = lerp(noseY, newY, 0.5);
		nose = createVector(noseX, noseY);

		leftEye = createVector(pose[0].pose.keypoints[1].position.x, pose[0].pose.keypoints[1].position.y)
		rightEye = createVector(pose[0].pose.keypoints[2].position.x, pose[0].pose.keypoints[2].position.y)
		fingerPointer = createVector(pose[0].pose.keypoints[10].position.x, pose[0].pose.keypoints[10].position.y)

	  center = p5.Vector.sub(leftEye, rightEye).mult(0.5);
		center.x = (center.x + rightEye.x);
		center.y = (center.y + rightEye.y);

		mouth = p5.Vector.sub(nose, center).mult(1.5);
		mouth.x = (mouth.x + nose.x);
		mouth.y = (mouth.y + nose.y);


    // Assigning it to a global variable poses to use elsewhere
	  poses = pose;
 }
}

function modelReady() {
	console.log("model ready");
}

function draw() {

	frameRate(20);

	image(video, 0, 0);
	filter(THRESHOLD);


  noStroke();

  // Print face keypoints from pose estimation
	fill(255, 0, 0);
	ellipse(noseX, noseY, 20);

	fill(0,0,200);
	ellipse(mouth.x, mouth.y, 20);
	fill(0,200,0);
	ellipse(leftEye.x, leftEye.y, 20);
	ellipse(rightEye.x, rightEye.y, 20);

	fill(255, 0, 0);
	ellipse(fingerPointer.x, fingerPointer.y, 20);


	// Print Sound Waves if being recorded

  // if(mic.enabled){
	//  vol = mic.getLevel();
	//  fill(127);
	//  var h = map(vol, 0, 1, height, 0);
  //  ellipse(100,100, 50, 50);
  // }

	// Draw the pose
  //drawKeypoints();
	//drawSkeleton();
	

	// Draw the units of onsets
	if (onset_flag){
		console.log(onset_times);
		onset_flag = false;
		splitSounds();
	}


	if(number_of_particles > 0){
		// Draw the particles
		console.log("Drawing particles");
		for(let i = 0; i < number_of_particles; i++){
			units_of_sound[i].show();
			units_of_sound[i].update();
		}
	}


}


function mousePressed(){

	if (mic.enabled == false){

			console.log("context started from mouse press");
			console.log(getAudioContext().state);
			getAudioContext().resume();
	}

	if (recordingState==0 && mic.enabled) {

		recorder.record(soundFile);
		console.log('Recording now! Click to stop.');
		startRecordingAtFrame = frameCount

		recordingState = 1;
	}
	else if (recordingState == 1) {
		recorder.stop();
	  console.log('Recording Stopped! Click will over-write recording and start recording again.');
		//var s = saveSound(soundFile, 'mySound.wav');

    audio_data = soundFile.buffer.getChannelData(0);
		// console.log(audio_data)
		//saveJson(soundFile);
		recordingState = 0;

		// Calling python API for getting onset timestamps
		sendDataJson('http://18.191.133.216/audio', audio_data);
		// sendData('http://127.0.0.1:8888/audio', '/Users/aditi/Desktop/Freelance/speaking_finger/audios/mySound.wav')
	}

}

// Function to send formdata
function sendData(url, audio_file) {
  var formData  = new FormData();

  formData.append("audio", audio_file)
  // for(var name in audio_file) {
  //   formData.append(name, data[name]);
  // }

  fetch(url, {
    method: 'POST',
		mode: 'no-cors',
    body: formData
  }).then(function (response) {
     console.log(response)
  });
}

function sendDataJson(url, audio_data){

	// TODO: DEBUG WHY THE JSON IS MAKING THE AUDIO DATA A DICTIONARY

	fetch(url, {
	    method: 'POST',
			mode: 'no-cors',
	    body:  JSON.stringify({
					data: audio_data
			}),// string or object
	    headers:{
	    'Content-Type': 'application/json'
	    }
	})
	.then(function(response){
			return response.json();
	}).then(function(data){
		frameAtResponse = frameCount;
		console.log("Response Received")
		onset_times = data["times_array"];
		onset_flag = true;
		number_of_particles = onset_times.length;
		for( let i = 0; i < number_of_particles; i++){
			units_of_sound[i] = new Particles();
		}
		console.log(units_of_sound);
	});
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints()  {
  // Loop through all the poses detected
  for (let i = 0; i < poses.length; i++) {
    // For each pose detected, loop through all the keypoints
    for (let j = 0; j < poses[i].pose.keypoints.length; j++) {
      // A keypoint is an object describing a body part (like rightArm or leftShoulder)
      let keypoint = poses[i].pose.keypoints[j];
      // Only draw an ellipse is the pose probability is bigger than 0.2
      if (keypoint.score > 0.2) {
        fill(255, 0, 0);
        noStroke();
        ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
      }
    }
  }
}

// A function to draw the skeletons
function drawSkeleton() {
  // Loop through all the skeletons detected
  for (let i = 0; i < poses.length; i++) {
    // For every skeleton, loop through all body connections
    for (let j = 0; j < poses[i].skeleton.length; j++) {
      let partA = poses[i].skeleton[j][0];
      let partB = poses[i].skeleton[j][1];
      stroke(255, 0, 0);
      line(partA.position.x, partA.position.y, partB.position.x, partB.position.y);
    }
  }
}



function touchStarted() {
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}

function splitSounds(){
	console.log("Splitting Sounds")
	// console.log(onset_times);

	for(let i = 0; i < onset_times.length - 1; i++){
		split_sounds[i] = [];
		for(let j = onset_times[i]; j < onset_times[i+1]; j++){
			split_sounds[i][j - int(onset_times[i])] = audio_data[j];
		}
		//console.log("sound" + i)
		//console.log(split_sounds[i]);
	}
  let result = (frameCount - frameAtResponse)/20;
	console.log("Number of secs since response" + result );


}


class Particles{
	constructor(){
		this.x = mouth.x + random(0,100);
		this.y = mouth.y + random(0,100);
		this.r = random(5,20);

		this.sound = 0;
	}
	
	update(){
		this.x = this.x + random(-5, 5);
		this.y = this.y + random(-5, 5);

	}

	show(){
		stroke(255);
		strokeWeight(4);

	  fill(0,100,255);
		ellipse(this.x, this.y, this.r)
	}

	add(i, x, y, r){

		this.x = x;
		this.y = y;
		this.r = r;
		this.sound = i;

	}

	connect_Sound(i){
		this.sound = i
	}
};