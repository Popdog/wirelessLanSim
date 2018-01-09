# wirelessLanSim
Author: William Myers
11/25/2017

				* * * * PURPOSE * * * *

This program was written as a tool to investigate the impact of the RTS/CTS protocol
on a wireless LAN operating on the IEEE 802.11 standard. To accomplish this, it simulates a
simple scenario a number of times: A user-specified number of machines generate a user-
specified number of data frames, each of which is addressed to a randomly-assigned station
in the same basic service set. The simulation ends when all data frames are successfully sent.
The simulation is run a user-specified number of times, and the amount of time it takes for
the simulation to finish is averaged based on the number of times the simulation is run.



				 * * * * SETUP * * * *

No installation is required for this code. To use this program, all you need are:
"lanClasses.js", "lanSim.js", and "projectMain.html". To run the program, open projectMain
in any web browser. In its current state, you need to open your browser's console to see
the output of the code.


				  * * * * USE * * * *

When projectMain.html is opened, the simulation will run automatically. The relevant
information will be printed to your web browser's console. 

Outputs:
CONTROL_LEN: [#] Data size: [#], RTS/CTS: [true/false], Hidden Nodes: [true/false]

Average T_fin: [#] miliseconds.

CONTROL_LEN is not dependent on a primary user input, but is determined by the 802.11 standard
I have used in writing the simulation.

Data size should always be user-specified. This is the size, in bytes, of the data which the
stations send.

RTS/CTS: This corresponds to a boolean user input variable. This tells the program whether or not
to use the RTS/CTS protocol.

Hidden Nodes: Another boolean user input variable. Specifies whether or not the simulation will
have hidden nodes.

Average T-fin: This is the average amount of time, in miliseconds, that the simulated wireless LAN
needed to send all of the generated data frames.

Inputs:
There are 3 'primary' user inputs. 'Primary' inputs are ones that MUST be updated every time the 
simulation is run to get meaningful output (for the situation that I am investigating).

-DATA_SIZE_IN_BYTES: The amount of data, in bytes, in each data frame. REQUIREMENTS: Integer in the 
range [1, 2312]

-USE_RTS_CTS: Specify whether or not to use RTS/CTS. REQUIREMENTS: Boolean

-USE_HIDDEN_NODES: Specify if there is a hidden node. REQUIREMENTS: Boolean

The rest of the user input constants are secondary inputs. They will alter the physical architecture
of the LAN being simulated, or the spcifications of the 802.11 standard being used. For this reason,
all remaining inputs MUST remain constant from test-to-test to get meaningful output.

-NUM_STATIONS: The number of stations in the lan. REQUIREMENTS: INTEGER >= 2.

-NUM_SECTORS: This is used to segment the air into different regions in order to facilitate hidden
node simulation. REQUIREMENTS: INTEGER >= 2 if using hidden nodes, >=1 if not. (Reccomended >=2)

-NUM_FRAMES: The number of data frames that each station will generate. REQUIREMENTS: Integer >= 1

-NUM_TESTS: The number of times the simulation will run. The higher, the better, but it can cause
long runtimes. REQUIREMENTS: Integer >=1.

-MAX_TIME: A troubleshooting parameter. This is an exit parameter for the loop used in the simulation.
As of this submission, the simulation should not loop infinitely if legal parameters are provided.

-CONTROL_SIZE_IN_BYTES: This specifies how large a control frame is, in bytes. The default setting is 
that a control frame is the size of a data frame whose data is size 0. (34 bytes). REQUIREMENTS: 
Integer >= 1.

TRANSFER_RATE_IN_MEGABITS_PER_SECOND: How fast data is sent over the LAN. Originally, this was physically-
based on the transfer rate on a 802.11ac network, but I increased the default to 2500Mbps so the simulation
could run more quickly. REQUIREMENTS: Integer >= 1. 

DIFS: DCF Inter-frame space. For 802.11ac, this is 34 microseconds. REQUIREMENTS: Integer >= 2 (must be larger
than SIFS).

SIFS: Short Inter-frame space. For 802.11ac, this is 16 microseconds. REQUIREMENTS: Integer >= 1, < DIFS.

SLOT_TIME: Determines the length of the time units used by the backOff. REQUIREMENTS: Integer >=1
(I wouldn't recommend making this very large).
