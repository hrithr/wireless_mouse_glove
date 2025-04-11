var SerialPort = require('serialport').SerialPort;
var xbee_api = require('xbee-api');
var robot = require("robotjs");
const { count } = require('console');
const express = require('express');
const request = require('request');
const bodyParser = require('body-parser');

const cowLocations = [
    [746, 139],
    [428, 536],
    [900, 413],
    [245, 186],
    [804, 311],
    [751, 374],
    [964, 190],
    [255, 173],
    [800, 480],
    [111, 122],
    [680, 340], //center
    [333, 276],
    [793, 183],
    [245, 524],
    [85, 505],
    [63, 493],
    [122, 181],
    [842, 490],
    [320, 505],
    [879, 143],
    [508, 175],
    [471, 267],
    [517, 517],
    [379, 126],
    [881, 420],
];

let index = 0;
const findRadius = 40;

const app = express();
//app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var C = xbee_api.constants;

var xbeeAPI = new xbee_api.XBeeAPI({
  api_mode: 1
});
 
var serialport = new SerialPort({
    path: "COM4",
    baudRate: 115200
});
 
serialport.pipe(xbeeAPI.parser);
xbeeAPI.builder.pipe(serialport);

/*
serialport.on("open", function() {
    let dataByteArray = [(10).toString(16)];
    var frame_obj = {
        type: 0x01, // xbee_api.constants.FRAME_TYPE.TX_REQUEST_16 
        id: 0x01, // optional, nextFrameId() is called per default
        destination16: "ffff",
        options: 0x00, // optional, 0x00 is default
        data: dataByteArray // Can either be string or byte array.
    };
    xbeeAPI.builder.write(frame_obj);
    console.log(dataByteArray);

    dataByteArray = [0x0A, (11).toString(16), (9).toString(16), "11", (11).toString()];
    frame_obj = {
        type: 0x01, // xbee_api.constants.FRAME_TYPE.TX_REQUEST_16 
        id: 0x01, // optional, nextFrameId() is called per default
        destination16: "ffff",
        options: 0x00, // optional, 0x00 is default
        data: dataByteArray // Can either be string or byte array.
    };
    xbeeAPI.builder.write(frame_obj);
    console.log(dataByteArray);
});*/


let screenDimensions = robot.getScreenSize();
let centerX = screenDimensions.width/2;
let centerY = screenDimensions.height/2;
let sensitivity = 30; // from 10 to 90
let tolerance = 3;

let pitchRange = sensitivity;
let yawRange = sensitivity;
let cowLocation = {x: cowLocations[index][0], y: cowLocations[index][1]};

const maxLevel = 11;
const maxDistance = Math.sqrt(screenDimensions.width**2 + (screenDimensions.height-(70+45))**2);

console.log(centerX);
console.log(centerY);

/*
// request handler
app.use('/', (req, res) => {
    console.log(req.body);
    cowLocation.x = req.body.x;
    cowLocation.x = req.body.y;
    windowWidth = req.body.windowWidth;
    windowHeight = req.body.windowHeight;
})

app.listen(5000, () => console.log('Listening...'))
*/

function parsePitchYawRoll(data) {
    return {
        pitch: data.slice(3, 5), 
        yaw: data.slice(1, 3),
        //roll: data.slice(5, 7)
    };
}


function convertByteArrayToInt(data) {
    let negative = (data[0] == 255);
    let result = data[0] << 8;

    result |= data[1];

    if (negative) {
        result = result-65536;
    }
    return result;
}

/*
function adjustSensitivity(roll) {

}
*/
              

function convertPitchYawToXY(pitch, yaw) {
    //pitch
    let y_coord = screenDimensions.height - Math.max(Math.min(screenDimensions.height, centerY + pitch*(centerY/pitchRange)), 0);

    //yaw
    let x_coord = centerX;
    if (yaw >= 180) {
        x_coord = Math.max(0, (yaw-360)*(centerX/yawRange) + centerX);
    }
    else {
        x_coord = Math.min(centerX + yaw*(centerX/yawRange), screenDimensions.width);
    }

    return {x: x_coord, y: y_coord}
}


function updateCowLocation() {
    console.log("in updateCowLocation()");
    console.log("index previous: " + index);
    index = (index+1) % 25;
    console.log("index next: " + index);
    cowLocation = {x: cowLocations[index][0], y: cowLocations[index][1]};
}


function getCursorDistanceToCow(x_coord, y_coord) {
    return Math.sqrt((x_coord-cowLocation.x)**2 + ((y_coord-(70))-cowLocation.y)**2);
}


function hapticsLevelBetween0And11(distance) {
    const distanceRatio = 1 - Math.min(maxDistance, distance)/maxDistance;
    const scaledRatio = (Math.exp(distanceRatio)-1) / (Math.E-1);
    return Math.floor(scaledRatio*maxLevel);
}

// All frames parsed by the XBee will be emitted here
let CLICK = 1;
let MOVE = 0;
let previousDataClickOrMove = MOVE;
let countClicks = 0;
//let PWMMode = 0;

xbeeAPI.parser.on("data", function(frame) {
    let incomingData = new Uint8Array(frame["data"]);
    let incomingDataClickOrMove = incomingData[0];
    
    let dataByteArray = [0xFF];
    
    if (incomingDataClickOrMove == CLICK || incomingDataClickOrMove == MOVE) {
        console.log("index: " + index);
        console.log("cow x: " + cowLocation.x);
        console.log("cow y: " + cowLocation.y);

        let pitchYawRollBytes = parsePitchYawRoll(incomingData);
        let pitch = convertByteArrayToInt(pitchYawRollBytes.pitch);
        let yaw = convertByteArrayToInt(pitchYawRollBytes.yaw);
        //let roll = convertByteArrayToInt(pitchYawRollBytes.roll);
        //console.log("roll: " + roll);
        
        let mouseCoordinates = convertPitchYawToXY(pitch, yaw);
        let cursorDistance = getCursorDistanceToCow(mouseCoordinates.x, mouseCoordinates.y);
        let cowLevel = hapticsLevelBetween0And11(cursorDistance); // 1 to 11
        
        /*if (Math.abs(roll-90) >= 5 || Math.abs(roll+90) <= 5) { // detect PWM mode toggling
            PWMMode = 1-PWMMode;
        }

        if (PWMMode == 1) {
            dataByteArray = [cowLevel.toString()];
        }
        else {
            dataByteArray = [0xFF];
        }*/

        if (incomingDataClickOrMove == CLICK) {
            countClicks++;
            //console.log("click " + countClicks);
            if (countClicks > tolerance) {
                //console.log("click fr");
                robot.mouseClick();
                //let foundCow = (cursorDistance < findRadius); // 0 or 1
                if (cowLevel >= 10) { 
                    dataByteArray = [0xFF]; //reset PWM mode
                    updateCowLocation();
                }
                countClicks = 0;
            }
            else {
                dataByteArray = [cowLevel.toString()]; // you need dataaaaaaaaa
            }
            // robot.mouseClick();
        }
        else {
            countClicks = 0;
            //console.log("move");
            robot.moveMouse(mouseCoordinates.x, mouseCoordinates.y); 
           
            dataByteArray = [cowLevel.toString()];
            //console.log("x: " + mouseCoordinates.x);
            //console.log("y: " + mouseCoordinates.y);
            //console.log("distance: " + cursorDistance);
            //console.log("cow level: " + cowLevel);
        }

        
        var frame_obj = {
            type: 0x01, // xbee_api.constants.FRAME_TYPE.TX_REQUEST_16 
            id: 0x01, // optional, nextFrameId() is called per default
            destination16: "ffff",
            options: 0x00, // optional, 0x00 is default
            data: dataByteArray // Can either be string or byte array.
        };
        //console.log("sending: " + frame_obj);

        xbeeAPI.builder.write(frame_obj);
    }
    else { //Transmit status
        console.log(incomingData);
    }
    
    previousDataClickOrMove = incomingDataClickOrMove;
});

