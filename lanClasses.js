/* William Myers, CNT 5008, Fall 17 */
var DATA_SIZE_IN_BYTES = 100; //Integer in the interval [1, 2312]
var USE_RTS_CTS = true;
var USE_HIDDEN_NODES = true;

function getVariables() {

    DATA_SIZE_IN_BYTES = document.getElementById("dataSizeBox").value;
    if (document.getElementById("useRtsCtsBox").value == "Yes" || document.getElementById("useRtsCtsBox").value == "yes") {
        USE_RTS_CTS = true;
    } else if (document.getElementById("useRtsCtsBox").value == "No" || document.getElementById("useRtsCtsBox").value == "no") {
        USE_RTS_CTS = false;
    }
    else {
        document.getElementById("useRtsCtsBox").value = "Invalid Input";

    }
    if (document.getElementById("useHiddenNodesBox").value == "Yes" || document.getElementById("useHiddenNodesBox").value == "yes") {
        USE_HIDDEN_NODES = true;
    } else if (document.getElementById("useHiddenNodesBox").value == "No" || document.getElementById("useHiddenNodesBox").value == "no") {
        USE_HIDDEN_NODES = false;
    }
    else {
        document.getElementById("useRtsCtsBox").value = "Invalid Input";
    }
    updateConstants();
}

var NUM_STATIONS = 4;
var NUM_SECTORS = 4;
var NUM_FRAMES = 3;
var NUM_TESTS = 1000;
var MAX_TIME = 10000000;

var CONTROL_SIZE_IN_BYTES = 34;
var TRANSFER_RATE_IN_MEGABITS_PER_SECOND = 2500;

//Lengths of interframe spaces and slot time
var DIFS = 34;
var SIFS = 16;
var SLOT_TIME = 9;

var CONTROL_SIZE_IN_BITS = CONTROL_SIZE_IN_BYTES * 8;
var DATA_SIZE_IN_BITS = (DATA_SIZE_IN_BYTES * 8) + CONTROL_SIZE_IN_BITS;
var TRANSFER_RATE_IN_BITS_PER_MICROSECOND = TRANSFER_RATE_IN_MEGABITS_PER_SECOND * 1024 / 1000000;
var RTS_CTS_THRESH = 0;

//Used to identify the access point
var AP = 0;
var AP_LOC = -1;

//Definition of frame IDs and Lengths
var CONTROL_FRAME_LENGTH = Math.ceil(CONTROL_SIZE_IN_BITS / TRANSFER_RATE_IN_BITS_PER_MICROSECOND);
var ACK = 0;
var ACK_LEN = CONTROL_FRAME_LENGTH;
var DATA = 1;
var DATA_LEN = Math.ceil(DATA_SIZE_IN_BITS / TRANSFER_RATE_IN_BITS_PER_MICROSECOND);
var RTS = 2;
var RTS_LEN = CONTROL_FRAME_LENGTH;
var CTS = 3;
var CTS_LEN = CONTROL_FRAME_LENGTH;

function updateConstants() {
    DATA_SIZE_IN_BITS = (DATA_SIZE_IN_BYTES * 8) + CONTROL_SIZE_IN_BITS;
    DATA_LEN = Math.ceil(DATA_SIZE_IN_BITS / TRANSFER_RATE_IN_BITS_PER_MICROSECOND);
}

/* Each frame has a type, a length (determined by the type) */
class frame {
    constructor(type, receiver, sender, option, id) {
        this.type = type;
        if (this.type === ACK) {
            this.nav = ACK_LEN;
            this.length = ACK_LEN;
        } else if (this.type === DATA) {
            this.nav = DATA_LEN + SIFS + ACK_LEN;
            this.length = DATA_LEN;
        } else if (this.type === RTS) {
            this.nav = RTS_LEN + SIFS + CTS_LEN + SIFS + DATA_LEN + SIFS + ACK_LEN;
            this.length = RTS_LEN;
        } else if (this.type === CTS) {
            this.nav = CTS_LEN + SIFS + DATA_LEN + SIFS + ACK_LEN;
            this.length = CTS_LEN;
        } else {
            this.nav = null;
            this.length = null;
        }
        this.receiver = receiver;
        this.sender = sender;
        this.option = option;
        this.id = id;
    }

    //Returns a numerical identifier corresponding to the type of frame
    getType() {
        return this.type;
    }

    //Returns the amount of time (in microseconds) required to transmit the frame
    getLength() {
        return this.length;
    }

    //Returns the NAV for the frame.
    getNav() {
        return this.nav;
    }

    //Returns the address of the frame's sender
    getSender() {
        return this.sender;
    }

    //Returns the address of the frame's receiver
    getReceiver() {
        return this.receiver;
    }

    //Returns the option field for the frame
    getOption() {
        return this.option;
    }

    //Updates the receiver field
    setReceiver(address) {
        this.receiver = address;
    }

    //Updates the sender field
    setSender(address) {
        this.sender = address;
    }

    //Updates the option field
    setOption(address) {
        this.option = address;
    }

    //Returns the ID of the frame
    getID() {
        return this.id;
    }

}

/* Stations represent the machines that communicate on the wireless LAN. Stations have the following parameters:

-Address: A unique idintifier for the station, used to direct frames
-waitTime: A timer required by the 802.11 protocol
-backoffTime: A timer required by the 802.11 protocol
-isTransmitting: A boolean value that indicates whether or not the station is transmitting
-inBuffer: Temporary storage for incoming frames
-outBuffer: Temporary storage for frames that are being transmitted
-frames: A queue of DATA frames that the station needs to transmit
-useRtsCts: A boolean that indicates whether or not the station will use the RTS/CTS protocol to transmit its
 next DATA frame
-nav: Network Allocation Vector. The NAV is updated anytime another station on the BSS transmits, and helps
 make sure the station remains "quiet" while other stations are transmitting.
-transmissionTime: This timer is set when the station begins transmitting. Its value depends on the size of the
 frame being transmitted. When the timer reaches 0, the station is finished transmitting
-bss: The Basic Service Set to which the station belongs
-physicalLocation: Where the station is located physically in the air. Used to simulate the hidden node problem.
-isAccessPoint: A boolean that indicates whether or not a station is the Access Point (determines certain
 behaviors)
-numCollisions: Indicates how many times the current frame has collided with other frames. Used to generate
 an appropriate backOff time in accordance with 802.11
-isReadyToSend: A boolean that indicates if the station is ready to send its frame. When this is true, the
 station WILL begin transmitting in the current time loop.
-timeToCollision: A counter that is set occording to when the station is expecting an ACK. Once this timer
 reaches 0, the station assumes there was a collision.
-apCache: An array used by the Access Point for troubleshooting. The AP cache keeps a list of all frames that
 the AP has sent and had aknowledged. The AP Cache is used to prevent duplicate frames from being sent.
-isCTS: A boolean that indicates that a station has received a CTS frame, and is "clear to send"
 */
class station {
    constructor(address, physicalLocation, apBool, bss) {
        this.address = address;
        this.waitTime = DIFS;
        this.backoffTime = null;
        this.isTransmitting = false;
        this.inBuffer = null;
        this.outBuffer = null;
        this.frames = [];
        this.useRtsCts = false;
        this.nav = null;
        this.transmissionTime = null;
        this.bss = bss;
        this.physicalLocation = physicalLocation;
        this.isAccessPoint = apBool;
        this.numCollisions = 0;
        this.isReadyToSend = false;
        this.timeToCollision = null;
        this.apCache = [];
        this.isCTS = false;
    }

    //Returns the address of the station
    getAddress() {
        return this.address;
    }

    /* When sending:
        Station is transmitting.
        Station will transmit for a time determined by the size of the frame.
        Station is heard on its sector of the medium. Access Point is heard by all sectors
        The medium contains the transmitted frame
        
        Reset the wait time
        Reset the backoff time
    */
    sendFrame() {
        this.isTransmitting = true;
        this.transmissionTime = this.outBuffer.getLength();

        //Since the AP is heard throughout the BSS, all sectors are busy during transmission.
        if (this.isAccessPoint) {
            for (var i = 0; i < NUM_SECTORS; i++) {
                this.bss.medium.addSignal(i);
            }
        } else {
            //Other stations occupy only their sector
            this.bss.medium.addSignal(this.physicalLocation);
        }
        this.bss.medium.storeFrame(this.outBuffer);

        this.bss.setNavs(this.outBuffer.nav, this.physicalLocation);

        this.waitTime = DIFS;
        this.backoffTime = null;
        if (this.outBuffer.getType() == RTS) {
            this.timeToCollision = this.transmissionTime + SIFS + CTS_LEN + 1;
        } else if (this.outBuffer.getType() == DATA) {
            this.timeToCollision = this.transmissionTime + SIFS + ACK_LEN + 1;
        }
        this.isReadyToSend = false;
    }

	/*
	Protocol to receive a frame from the medium:
	-If there is a DATA frame in the outBuffer, store it in the frames[] array
	-Copy the frameBuffer of the medium to the inBuffer
	-Based on the type of frame received:
		-Set wait and backoff timers
		-Set timeToCollision (if applicable)
		-Generate frame for outBuffer
	-Nullify NAV and discard frame in inBuffer
	*/
    receiveFrame() {
        this.inBuffer = this.bss.medium.frameBuffer;
        this.numCollisions = 0;
        this.timeToCollision = null;
        if (this.inBuffer.getType() == CTS) {
            this.waitTime = SIFS;
            this.backoffTime = 0;
            this.timeToCollision = null;
            this.useRtsCts = false;
            this.outBuffer = this.frames.pop();
        } else if (this.inBuffer.getType() == RTS) {
            if (this.outBuffer != null && this.outBuffer != undefined && this.outBuffer.getType() == DATA) {
                if (this.isAccessPoint) {
                    let foundMatch = false;
                    for (var i = 0; i < this.frames.length; i++) {
                        if (this.frames[i].getOption() == this.outBuffer.getSender() && this.frames[i].getID() == this.outBuffer.getID()) {
                            foundMatch = true;
                        }
                        if (!foundMatch) {
                            this.frames.push(this.outBuffer);
                        }
                    }
                } else {
                    this.frames.push(this.outBuffer);
                }
            }
            this.outBuffer = this.generateFrame(CTS, this.inBuffer.sender, null, null);
            this.waitTime = SIFS;
            this.backoffTime = 0;
            this.numCollisions = 0;
        } else if (this.inBuffer.getType() == DATA) {
            if (this.outBuffer != null && this.outBuffer != undefined) {
                if (this.isAccessPoint) {
                    if (this.outBuffer.getType() == ACK) {
                        this.frames.pop();
                    } else if (this.outBuffer.getType() == DATA) {
                        this.frames.push(this.outBuffer);
                    }
                } else if (this.outBuffer.getType() == DATA) {
                    this.frames.push(this.outBuffer);
                }
            }
            this.outBuffer = this.generateFrame(ACK, this.inBuffer.sender, this.inBuffer.getOption(), this.inBuffer.getID());
            if (this.isAccessPoint) {
                let tempSender = AP;
                let tempReceiver = this.inBuffer.getOption();
                let tempOption = this.inBuffer.getSender();
                let newDataFrame = this.generateFrame(DATA, tempReceiver, tempOption, this.inBuffer.getID());
                this.frames.push(newDataFrame);
                this.timeToCollision = null;

            }
            this.waitTime = SIFS;
            this.backoffTime = 0;
            this.numCollisions = 0;
        } else if (this.inBuffer.getType() == ACK) {
            if (this.isAccessPoint) {
                this.apCache.push([this.inBuffer.getOption(), this.inBuffer.getID()]);
            }
            this.outBuffer = null;
            this.numCollisions = 0;
            this.waitTime = DIFS;
            this.backoffTime = null;
            this.timeToCollision = null;
        }
        this.nav = null;
        this.inBuffer = null;
    }

    // "Listens" to the medium for signals. If there is at least one signal in the station's sector, this will return false.
    listen(medium) {
        return medium.isQuiet(this.physicalLocation);
    }

    // Generates a frame of a specified type, destined for a receiver, sent by this station's address, with specified option (only used for DATA frames)
    generateFrame(type, receiver, option, id) {
        var generatedFrame = new frame(type, receiver, this.address, option, id);
        return generatedFrame;
    }

    /* The NAV overrides all other timers. */
    setNav(newNav) {
        if (!this.isTransmitting) {
            this.nav = newNav;
            this.waitTime = DIFS;
        }
    }

    //Randomly generates a backoff time in the range [0, 2^n - 1], where n is the number of
    //collisions the current frame has encountered
    generateBackoff() {
        let backOffTime = Math.floor(Math.random() * Math.pow(2, 3 + (this.numCollisions)));
        backOffTime *= SLOT_TIME;
        this.backoffTime = backOffTime;
    }

    //Declares that this station is ready to send the frame in its outBuffer
    setReadyToSend() {
        this.isReadyToSend = true;
    }

    //Returns 'true' if the station is finished transmitting, false if it is not
    isFinishedTransmitting() {
        if (this.isTransmitting && this.transmissionTime === 0) {
            return true;
        }
        return false;
    }

    //Terminates the current transmission (this is called when the transmission timer = 0)
    //Declares that the station is not transmitting, nullifies the transmissionTimer, sets the
    //wait time to DIFS by default, nullifies the backoff timer, and removes the station's
    //signal from the medium
    terminateTransmission() {
        this.isTransmitting = false;
        this.transmissionTime = null;
        this.waitTime = DIFS;
        this.backoffTime = null;
        if (this.outBuffer.getType() != RTS && this.outBuffer.getType() != DATA) {
            this.outBuffer = null;
        }
        if (this.isAccessPoint) {
            for (var i = 0; i < NUM_SECTORS; i++) {
                this.bss.medium.removeSignal(i);
            }
        } else {
            this.bss.medium.removeSignal(this.physicalLocation);
        }
    }

    //Returns the physical location (sector number) of the station
    getPhysicalLocation() {
        return this.physicalLocation;
    }

    //Set physical location
    setPhysicalLocation(l) {
        this.physicalLocation = l;
    }

    //Returns the time left until the station detects a collision
    getTimeToColllision() {
        return this.timeToCollision;
    }

    //Sets the collision timer
    setTimeToCollision(t) {
        this.timeToCollision = t;
    }

    //Checks if the station is ready to send
    readyCheck() {
        if (this.outBuffer == null) {
            this.loadNewDataFrame();
        }
        if (this.waitTime == 0 && this.backoffTime == 0 && this.outBuffer != null) {
            this.isReadyToSend = true;
        }
    }

    //Loads a new DATA frame
    loadNewDataFrame() {
        if (this.frames.length == 0) {
            return null;
        }
        let newDataFrame = this.frames.pop();
        if (USE_RTS_CTS && newDataFrame.getLength() > RTS_CTS_THRESH) {
            this.outBuffer = this.generateFrame(RTS, newDataFrame.getReceiver(), null, newDataFrame.getID());
            this.frames.push(newDataFrame);
        } else {
            this.outBuffer = newDataFrame;
        }
    }

}

/*The medium used to send the data, in this case, the air. A medium has:
    Frame Buffer: The frame buffer rerpresents a frame 'in transit'. For the purpose of this simulation, a frame which is transmitted is instantaneously present in full in the medium. After a 'transmission time', the frame is offloaded from the medium's buffer and on to the intended receiver.
    Sectors: These are sections of the service area in which stations can hear one another. Sectors are used to simulate hidden nodes. All sectors can hear the Access Point, and the Access Point can hear stations in every sector, but stations in different sectors cannot hear one another.
*/
class medium {
    constructor() {
        this.sectors = new Array(NUM_SECTORS);
        for (var i = 0; i < NUM_SECTORS; i++) {
            this.sectors[i] = 0;
        }
        this.frameBuffer = null;
    }

    discardFrame() {
        this.frameBuffer = null;
    }

    getFrame() {
        return this.frameBuffer;
    }

    storeFrame(frame) {
        this.frameBuffer = frame;
    }

    isQuiet(sector) {
        if (sector == AP_LOC) {
            for (var i = 0; i < NUM_SECTORS; i++) {
                if (this.sectors[i] > 0) {
                    return false;
                }
                else {
                    return true;
                }
            }
        }
        else if (this.sectors[sector] > 0) {
            return false;
        }
        else {
            return true;
        }
    }

    addSignal(physicalLocation) {
        this.sectors[physicalLocation]++;
    }

    removeSignal(physicalLocation) {
        this.sectors[physicalLocation]--;
    }
}


class basicServiceSet {
    constructor() {
        this.stations = [];
        this.medium = new medium;
    }

    mediumIsQuiet(sector) {
        return medium.isQuiet(sector);
    }

    addStation(station) {
        this.stations.push(station);
    }

    /*When a station transmits, all stations within range set their NAVs according to the transmitted frame. */
    setNavs(newNav, location) {
        for (var i = 0; i <= NUM_STATIONS; i++) {
            if (location == AP_LOC) {
                this.stations[i].setNav(newNav);
            }
            else if (this.stations[i].physicalLocation == location && !this.stations[i].isTransmitting) {
                this.stations[i].setNav(newNav);
            }
            else if (this.stations[i].isAccessPoint && !this.stations[i].isTransmitting) {
                this.stations[i].setNav(newNav);
            }
        }
    }

}