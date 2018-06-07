/* William Myers, CNT 5008 Fall 17

This code simulates a simple wireless LAN operating under IEEE 802.11 */

//Creates the basic service set
function createBasicServiceSet() {
    var bss = new basicServiceSet();
    let tempAP = new station(0, AP_LOC, true, bss);
    bss.addStation(tempAP);
    for (var i = 1; i <= NUM_STATIONS; i++) {
        var tempStation = new station(i, 0, false, bss);
        bss.addStation(tempStation);
    }
    return bss;
}

//Initializes each station with a number of data frames
//The simulation ends when all frames reach their intended
// destinations and are aknowledged
function generateDataFrames(bss) {
    for (var i = 1; i <= NUM_STATIONS; i++) {
        for (var j = 0; j < NUM_FRAMES; j++) {
            let destination = Math.floor(Math.random() * NUM_STATIONS + 1);
            //Ensure station does not send frame to itself
            while (destination == i) {
                destination = Math.floor(Math.random() * NUM_STATIONS + 1);
            }
            bss.stations[i].frames.push(new frame(DATA, AP, bss.stations[i].getAddress(), destination, j));
        }
    }
}

//At the begining of each Unit Time Loop, check to see if the simulation is finished
function checkIfFinished(bss) {
    for (var i = 0; i <= NUM_STATIONS; i++) {
        //Condition 1: No station should have a frame prepared to transmit.
        if (bss.stations[i].outBuffer != null && bss.stations[i].outBuffer != undefined) {
            return false;
        }
        //Condition 2: No station should have any data frames in its queue
        if (bss.stations[i].frames.length > 0) {
            return false;
        }
    }
    //Condition 3: There should not be any frames in transit
    if (bss.medium.frameBuffer != null) {
        return false;
    }
    return true;
}

//Handles how a station should react when it detects a collision
function collisionDetected(station) {
    //station.numCollisions++;
    station.timeToCollision = null;
}

function changeOutputText() {
    document.getElementById("outputText").innerHTML = "running simulation...";
}


function main() {
    if(!getVariables()) {
        document.getElementById("outputText").innerHTML = "Simulation Failed :(";
        return;
    }
    
    //Stores the average amount of time for the simulation to finish, in microseconds.
    var averageTfin = 0;
    //The user can specify how many times to run the simulation
    for (var n = 0; n < NUM_TESTS; n++) {
        var bss = createBasicServiceSet();
        let t = 0;
        generateDataFrames(bss);
        let isFinished = false;
        let acksReceived = 0;

        //For my simulation, I only use one hidden node -- station 1.
        //If a user wishes to add aditional hidden nodes, they can do so here
        if (USE_HIDDEN_NODES) {
            bss.stations[1].setPhysicalLocation(1);
        }

        //Pops a data frame from the station's queue, if one is available
        for (var i = 0; i <= NUM_STATIONS; i++) {
            bss.stations[i].loadNewDataFrame();
        }

        //To prevent an infinite loop, a maximum number of iterations is implemented
        //As of 20-Nov-17, this should not occur (provided the user does not give illegal parameters)
        //I refer to this loop as the Unit Time Loop. The code that is executed within this loop represents
        // events occuring in the LAN in one unit of time -- one microsecond for this simulation.
        while (!isFinished && t < MAX_TIME) {
            //At the beginning of each Unit Time Loop, check if the simulation is finished
            isFinished = checkIfFinished(bss);

            //Load outBuffer of stations which have data to send
            //Check for Stations that are ready to send
            for (var i = 0; i <= NUM_STATIONS; i++) {
                bss.stations[i].readyCheck();
            }

            //Found an error where stations' outbuffers were being populated with frames they should not have. This is a fix, but doesn't deal with the root of the problem.
            for (var i = 0; i <= NUM_STATIONS; i++) {
                if (bss.stations[i].outBuffer != null && bss.stations[i].outBuffer.getSender() != bss.stations[i].getAddress()) {
                }
            }

            //Check for completed transmissions
            for (var i = 0; i <= NUM_STATIONS; i++) {
                var tempFrame = bss.medium.frameBuffer;
                if (bss.stations[i].isFinishedTransmitting()) {

                    if (tempFrame == null) {
                        //console.log("Collision detected.");
                        bss.stations[i].numCollisions++;
                    } else {
                        //Handles the receiver-end
                        bss.stations[tempFrame.getReceiver()].receiveFrame(tempFrame);
                        if (tempFrame.getType() == ACK) acksReceived++;
                    }
                    //Handles the sender-end
                    bss.stations[i].terminateTransmission();
                }
            }

            //Send transmissions if ready
            for (var i = 0; i <= NUM_STATIONS; i++) {
                if (bss.stations[i].isReadyToSend) {
                    bss.stations[i].sendFrame();
                }
            }

            //Check number of transmissions
            let numTransmissions = 0;
            for (var i = 0; i <= NUM_STATIONS; i++) {
                if (bss.stations[i].isTransmitting) numTransmissions++;
            }
            //If multiple stations are transmitting, collision occurs, and the medium loses its frame
            if (numTransmissions > 1) {
                bss.medium.frameBuffer = null;
            }

            //Decrement timers
            for (var i = 0; i <= NUM_STATIONS; i++) {
                //The Network Allocation Vector takes precedence over the wait and backoff timers. 
                // If the NAV has a value, it is decremented, while waitTime and backoffTime are not.
                if (bss.stations[i].nav != null) {
                    bss.stations[i].nav--;
                    if (bss.stations[i].nav == 0) bss.stations[i].nav = null;
                }
                //If the NAV does not have an entry, first decrement the waitTime.
                else if (bss.stations[i].listen(bss.medium)) {
                    if (bss.stations[i].waitTime > 0) {
                        bss.stations[i].waitTime--;
                        //One the wait time is 0, all stations MUST generate a backOff, provided
                        // they have not already generated one.
                        if (bss.stations[i].waitTime == 0 && bss.stations[i].backoffTime == null) bss.stations[i].generateBackoff();
                    }
                    //If the waitTime is 0, decrement the backoffTime
                    else if (bss.stations[i].backoffTime > 0) {
                        bss.stations[i].backoffTime--;
                    }
                }
				/*
				//Regardless of other timers, decremented timeToCollision, if the station awaits an ACK
				if (bss.stations[i].timeToCollision != null) {
					bss.stations[i].timeToCollision--;
					if (bss.stations[i].timeToCollision === 0) collisionDetected(bss.stations[i]);
				}
				*/
                //If the station is transmitting, decrement its transmission timer
                if (bss.stations[i].isTransmitting) {
                    bss.stations[i].transmissionTime--;
                }
            }

            //This code checks to see if any portion of the air hears a station (or stations) transmitting.
            // If no stations are transmitting, the medium's frameBuffer is emptied.
            let sectorTotal = 0;
            for (var i = 0; i < NUM_SECTORS; i++) {
                sectorTotal += bss.medium.sectors[i];
            }
            if (sectorTotal == 0) {
                bss.medium.frameBuffer = null;
            }

            t++;
        }
        averageTfin += t;
    }
    averageTfin /= NUM_TESTS * 1000;
    document.getElementById("outputText").innerHTML = "Average T_fin: " + averageTfin + " miliseconds.";
    console.log("CONTROL_LEN: " + ACK_LEN + " Data size: " + DATA_SIZE_IN_BYTES + ", RTS/CTS: " + USE_RTS_CTS + ", Hidden Nodes: " + USE_HIDDEN_NODES);
    console.log("Average T_fin: " + averageTfin + " miliseconds.");
}