# CPU_SCHEDULING_SIMULATOR
This project is web-based and it is about CPU_SCHEDULINHG_SIMULATOR. This simulation visualizes five CPU scheduling algorithms: FIFO, SJF, SRTF, Round Robin, and MLFQ.  

How to run this:

1. Web Version:
   - Open `index.html` in any modern browser (Chrome/Firefox/Edge).
   - No installation required.

2. GUI Features:
   - Add processes manually or generate random ones.
   - Select an algorithm and adjust parameters (e.g., time quantum for Round Robin).
   - Click "Simulate" to see results.
     

This simulation includes five CPU scheduling algorithms, each with distinct characteristics and use cases:

First In, First Out (FIFO) or (FCFS) is a non-preemptive strategy that executes processes in the order they arrive, offering a simple and fair approach.

Shortest Job First (SJF) selects the process with the shortest burst time and is also non-preemptive. It's designed to reduce overall waiting time.

Shortest Remaining Time First (SRTF) is a preemptive version of SJF that allows interruption if a shorter job arrives, improving response time.

Round Robin introduces time slicing by giving each process a fixed time quantum in a cyclic order. It's preemptive and ideal for time-sharing systems.

Multi-Level Feedback Queue (MLFQ) uses multiple queues with different priority levels and allows dynamic movement between them. It's preemptive and aims to balance responsiveness with overall throughput.



Here is an example of the output:

<img width="1170" height="617" alt="image" src="https://github.com/user-attachments/assets/6aa25b84-bbc6-4161-9f05-25afe49d0330" />


Known Limitations: 
This simulation also have limitations it isn't perfect but it'll work :) :

- You can only enter up to 10 processes at a time. This is done to keep the user interface easy to use.

- If you're using an older computer or browser, the animations might not run smoothly and could appear slow or choppy.

- The MLFQ (Multi-Level Feedback Queue) algorithm is simplified. Each queue uses a fixed time setting — for example, the first queue runs fast, while the next one is twice as slow, and so on.

- There's no way to save your list of processes or load a saved one later. You’ll need to re-enter everything each time you open the program so once you reset it, it is gone forever.

- Animation Glitches: If you click Simulate multiple times quickly, Gantt chart animations may overlap or freeze.

- This also allows duplicate process IDs  (e.g., two P1), so it's confusing when you look at the metrics tabke.
