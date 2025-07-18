// Process class with all required properties
class Process {
    constructor(id, arrivalTime, burstTime, priority = 1) {
        this.id = id;
        this.arrivalTime = arrivalTime;
        this.burstTime = burstTime;
        this.remainingTime = burstTime;
        this.completionTime = 0;
        this.turnaroundTime = 0;
        this.waitingTime = 0;
        this.responseTime = -1; // -1 means not responded yet
        this.priority = priority;
        this.queueLevel = 0; // For MLFQ (0 = highest priority)
    }
}

// Base Scheduler class with common functionality
class Scheduler {
    constructor(processes) {
        this.processes = processes;
        this.ganttChart = [];
        this.currentTime = 0;
        this.completedProcesses = [];
    }

    calculateMetrics() {
        let totalTurnaround = 0;
        let totalWaiting = 0;
        let totalResponse = 0;

        this.completedProcesses.forEach(process => {
            process.turnaroundTime = process.completionTime - process.arrivalTime;
            process.waitingTime = process.turnaroundTime - process.burstTime;
            
            totalTurnaround += process.turnaroundTime;
            totalWaiting += process.waitingTime;
            totalResponse += process.responseTime;
        });

        return {
            avgTurnaround: totalTurnaround / this.completedProcesses.length,
            avgWaiting: totalWaiting / this.completedProcesses.length,
            avgResponse: totalResponse / this.completedProcesses.length,
            totalExecution: this.currentTime
        };
    }

    // Common method to execute a process and update Gantt chart
    executeProcess(process, executionTime, queueLevel = null) {
        // Record first response if not already responded
        if (process.responseTime === -1) {
            process.responseTime = this.currentTime - process.arrivalTime;
        }

        // Add to Gantt chart
        this.ganttChart.push({
            process: process.id,
            start: this.currentTime,
            end: this.currentTime + executionTime,
            queueLevel: queueLevel
        });

        // Update process state
        this.currentTime += executionTime;
        process.remainingTime -= executionTime;

        if (process.remainingTime === 0) {
            process.completionTime = this.currentTime;
            this.completedProcesses.push(process);
            return true; // Process completed
        }
        return false; // Process not completed
    }

    // To be implemented by subclasses
    schedule() {
        throw new Error("Schedule method must be implemented by subclass");
    }
}

// FIFO Scheduler
class FIFOScheduler extends Scheduler {
    schedule() {
        // Sort processes by arrival time
        this.processes.sort((a, b) => a.arrivalTime - b.arrivalTime);
        
        this.currentTime = 0;
        this.completedProcesses = [];
        
        for (const process of this.processes) {
            // Handle idle time if no process is ready
            if (this.currentTime < process.arrivalTime) {
                this.ganttChart.push({
                    process: 'IDLE',
                    start: this.currentTime,
                    end: process.arrivalTime,
                    queueLevel: null
                });
                this.currentTime = process.arrivalTime;
            }
            
            // Execute the process to completion (non-preemptive)
            this.executeProcess(process, process.burstTime);
        }
        
        return this.calculateMetrics();
    }
}

// SJF Scheduler (Non-Preemptive)
class SJFScheduler extends Scheduler {
    schedule() {
        this.currentTime = 0;
        this.completedProcesses = [];
        const processesCopy = [...this.processes];
        
        while (this.completedProcesses.length < this.processes.length) {
            // Get arrived processes that haven't completed
            const readyProcesses = processesCopy.filter(p => 
                p.arrivalTime <= this.currentTime && p.remainingTime > 0);
            
            if (readyProcesses.length > 0) {
                // Sort by burst time (shortest first)
                readyProcesses.sort((a, b) => a.burstTime - b.burstTime);
                const process = readyProcesses[0];
                
                // Execute to completion (non-preemptive)
                this.executeProcess(process, process.burstTime);
            } else {
                // No processes ready, advance time
                this.currentTime++;
            }
        }
        
        return this.calculateMetrics();
    }
}

// SRTF Scheduler (Preemptive)
class SRTFScheduler extends Scheduler {
    schedule() {
        this.currentTime = 0;
        this.completedProcesses = [];
        const processesCopy = [...this.processes];
        
        while (this.completedProcesses.length < this.processes.length) {
            // Get arrived processes that haven't completed
            const readyProcesses = processesCopy.filter(p => 
                p.arrivalTime <= this.currentTime && p.remainingTime > 0);
            
            if (readyProcesses.length > 0) {
                // Sort by remaining time (shortest first)
                readyProcesses.sort((a, b) => a.remainingTime - b.remainingTime);
                const process = readyProcesses[0];
                
                // Execute for 1 time unit (preemptive)
                this.executeProcess(process, 1);
            } else {
                // No processes ready, advance time
                this.currentTime++;
            }
        }
        
        return this.calculateMetrics();
    }
}

// Round Robin Scheduler
class RoundRobinScheduler extends Scheduler {
    constructor(processes, quantum) {
        super(processes);
        this.quantum = quantum;
    }

    schedule() {
        this.currentTime = 0;
        this.completedProcesses = [];
        const readyQueue = [];
        const processesCopy = [...this.processes];
        
        // Initialize with processes that arrive at time 0
        processesCopy.filter(p => p.arrivalTime <= this.currentTime)
            .forEach(p => readyQueue.push(p));
        
        while (this.completedProcesses.length < this.processes.length) {
            if (readyQueue.length > 0) {
                const process = readyQueue.shift();
                
                // Determine execution time (quantum or remaining time)
                const execTime = Math.min(this.quantum, process.remainingTime);
                const completed = this.executeProcess(process, execTime);
                
                // Add newly arrived processes to queue
                processesCopy.filter(p => 
                    p.arrivalTime > this.currentTime - execTime && 
                    p.arrivalTime <= this.currentTime && 
                    !this.completedProcesses.includes(p) &&
                    !readyQueue.includes(p)
                ).forEach(p => readyQueue.push(p));
                
                // If not completed, add back to queue
                if (!completed) {
                    readyQueue.push(process);
                }
            } else {
                // No processes ready, advance time
                this.currentTime++;
                
                // Check if any processes arrive at this time
                processesCopy.filter(p => p.arrivalTime === this.currentTime)
                    .forEach(p => readyQueue.push(p));
            }
        }
        
        return this.calculateMetrics();
    }
}

// MLFQ Scheduler
class MLFQScheduler extends Scheduler {
    constructor(processes, quantums) {
        super(processes);
        this.quantums = quantums; // Array of quantums for each queue level
        this.queues = [[], [], [], []]; // Q0 (highest) to Q3 (lowest)
    }

    schedule() {
        this.currentTime = 0;
        this.completedProcesses = [];
        
        // Initialize all processes in Q0
        this.processes.forEach(p => {
            p.queueLevel = 0;
            if (p.arrivalTime <= this.currentTime) {
                this.queues[0].push(p);
            }
        });
        
        while (this.completedProcesses.length < this.processes.length) {
            let currentProcess = null;
            let queueIndex = 0;
            
            // Find highest priority queue with available processes
            for (let i = 0; i < 4; i++) {
                if (this.queues[i].length > 0) {
                    currentProcess = this.queues[i][0];
                    queueIndex = i;
                    break;
                }
            }
            
            if (currentProcess) {
                const quantum = this.quantums[queueIndex];
                const execTime = Math.min(quantum, currentProcess.remainingTime);
                const completed = this.executeProcess(currentProcess, execTime, queueIndex);
                
                // Remove from current queue
                this.queues[queueIndex].shift();
                
                if (!completed) {
                    // Demote to lower queue if not in lowest queue
                    if (queueIndex < 3) {
                        currentProcess.queueLevel = queueIndex + 1;
                        this.queues[queueIndex + 1].push(currentProcess);
                    } else {
                        // Stay in lowest queue but go to end
                        this.queues[queueIndex].push(currentProcess);
                    }
                }
                
                // Check for newly arrived processes
                this.processes.forEach(p => {
                    if (p.arrivalTime > this.currentTime - execTime && 
                        p.arrivalTime <= this.currentTime && 
                        !this.completedProcesses.includes(p) &&
                        !this.queues.flat().includes(p)) {
                        p.queueLevel = 0;
                        this.queues[0].push(p);
                    }
                });
            } else {
                // No processes ready, advance time
                this.currentTime++;
                
                // Check for newly arrived processes
                this.processes.forEach(p => {
                    if (p.arrivalTime === this.currentTime && 
                        !this.completedProcesses.includes(p)) {
                        p.queueLevel = 0;
                        this.queues[0].push(p);
                    }
                });
            }
        }
        
        return this.calculateMetrics();
    }
}

// UI Controller
class CPU_Scheduler_UI {
    constructor() {
        this.processes = [];
        this.currentScheduler = null;
        this.animationSpeed = 500; // ms per time unit
        this.isAnimating = false;
        
        // Bind event listeners
        document.getElementById('generateRandom').addEventListener('click', () => this.generateRandomProcesses());
        document.getElementById('simulate').addEventListener('click', () => this.runSimulation());
        document.getElementById('reset').addEventListener('click', () => this.reset());
        document.getElementById('algorithm').addEventListener('change', (e) => this.toggleQuantumInput(e.target.value));
        document.getElementById('processLength').addEventListener('change', () => this.updateProcessTable());
        document.getElementById('animationSpeed').addEventListener('change', (e) => {
            this.animationSpeed = parseInt(e.target.value);
        });
        
        // Manual process input
        document.querySelector('.add-process').addEventListener('click', () => this.addManualProcess());
        
        // Initialize
        this.toggleQuantumInput(document.getElementById('algorithm').value);
        this.updateProcessTable();
    }
    
    toggleQuantumInput(algorithm) {
        const quantumGroup = document.getElementById('quantumGroup');
        quantumGroup.style.display = (algorithm === '4' || algorithm === '5') ? 'block' : 'none';
    }
    
    addManualProcess() {
        const idInput = document.querySelector('.process-id');
        const arrivalInput = document.querySelector('.arrival-time');
        const burstInput = document.querySelector('.burst-time');
        const priorityInput = document.querySelector('.priority');
        
        const id = idInput.value.trim() || `P${this.processes.length + 1}`;
        const arrivalTime = parseInt(arrivalInput.value) || 0;
        const burstTime = parseInt(burstInput.value) || 1;
        const priority = parseInt(priorityInput.value) || 1;
        
        this.processes.push(new Process(id, arrivalTime, burstTime, priority));
        
        // Clear inputs
        idInput.value = '';
        arrivalInput.value = '';
        burstInput.value = '';
        priorityInput.value = '';
        
        this.updateProcessTable();
        this.showMessage('Process added manually', 'success');
    }
    
    generateRandomProcesses() {
        const count = parseInt(document.getElementById('processLength').value);
        this.processes = [];
        
        for (let i = 1; i <= count; i++) {
            const arrivalTime = Math.floor(Math.random() * 10);
            const burstTime = Math.floor(Math.random() * 10) + 1;
            const priority = Math.floor(Math.random() * 4) + 1; // For MLFQ
            this.processes.push(new Process(`P${i}`, arrivalTime, burstTime, priority));
        }
        
        this.updateProcessTable();
        this.showMessage('Random processes generated', 'success');
    }
    
    updateProcessTable() {
        const tableBody = document.querySelector('#processTable tbody');
        tableBody.innerHTML = '';
        
        this.processes.forEach((process, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${process.id}</td>
                <td>${process.arrivalTime}</td>
                <td>${process.burstTime}</td>
                <td>${process.priority}</td>
                <td><button class="remove-process" data-index="${index}">Remove</button></td>
            `;
            tableBody.appendChild(row);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-process').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                this.processes.splice(index, 1);
                this.updateProcessTable();
                this.showMessage('Process removed', 'success');
            });
        });
    }
    
    runSimulation() {
        if (this.isAnimating) {
            this.showMessage('Simulation is already running', 'error');
            return;
        }
        
        if (this.processes.length === 0) {
            this.showMessage('No processes to schedule', 'error');
            return;
        }
        
        const algorithm = document.getElementById('algorithm').value;
        let scheduler;
        let quantum;
        
        // Create a deep copy of processes for simulation
        const processesCopy = this.processes.map(p => new Process(
            p.id, p.arrivalTime, p.burstTime, p.priority
        ));
        
        switch (algorithm) {
            case '1': // FIFO
                scheduler = new FIFOScheduler(processesCopy);
                break;
            case '2': // SJF
                scheduler = new SJFScheduler(processesCopy);
                break;
            case '3': // SRTF
                quantum = parseInt(document.getElementById('timeQuantum').value) || 1;
                scheduler = new SRTFScheduler(processesCopy, quantum);
                break;
            case '4': // Round Robin
                quantum = parseInt(document.getElementById('timeQuantum').value) || 2;
                scheduler = new RoundRobinScheduler(processesCopy, quantum);
                break;
            case '5': // MLFQ
                quantum = parseInt(document.getElementById('timeQuantum').value) || 2;
                scheduler = new MLFQScheduler(processesCopy, [quantum, quantum*2, quantum*3, quantum*4]);
                break;
            default:
                this.showMessage('Invalid algorithm selected', 'error');
                return;
        }
        
        // Run simulation
        const metrics = scheduler.schedule();
        this.currentScheduler = scheduler;
        
        // Display results
        this.displayMetrics(metrics);
        this.displayProcessDetails(scheduler.completedProcesses);
        this.animateGanttChart(scheduler.ganttChart, algorithm === '5');
    }
    
    displayMetrics(metrics) {
        document.getElementById('avgWaitingTime').textContent = metrics.avgWaiting.toFixed(2);
        document.getElementById('avgTurnaroundTime').textContent = metrics.avgTurnaround.toFixed(2);
        document.getElementById('avgResponseTime').textContent = metrics.avgResponse.toFixed(2);
        document.getElementById('totalExecTime').textContent = metrics.totalExecution;
    }
    
    displayProcessDetails(processes) {
        const tableBody = document.querySelector('#statusTable tbody');
        tableBody.innerHTML = '';
        
        processes.forEach(process => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${process.id}</td>
                <td>${process.arrivalTime}</td>
                <td>${process.burstTime}</td>
                <td>${process.completionTime}</td>
                <td>${process.turnaroundTime}</td>
                <td>${process.waitingTime}</td>
                <td>${process.responseTime}</td>
            `;
            tableBody.appendChild(row);
        });
    }
    
    animateGanttChart(ganttChart, isMLFQ = false) {
        const ganttContainer = document.getElementById('ganttChart');
        const timelineContainer = document.getElementById('ganttTimeline');
        const legendContainer = document.getElementById('ganttLegend');
        
        ganttContainer.innerHTML = '';
        timelineContainer.innerHTML = '';
        legendContainer.innerHTML = '';
        
        // Create timeline
        const timeline = document.createElement('div');
        timeline.className = 'gantt-timeline';
        timeline.style.display = 'flex';
        
        // Create process bars container
        const barsContainer = document.createElement('div');
        barsContainer.className = 'gantt-bars';
        barsContainer.style.display = 'flex';
        barsContainer.style.height = '40px';
        
        // Add initial time marker
        const initialTime = document.createElement('div');
        initialTime.textContent = '0';
        initialTime.style.width = '40px';
        initialTime.style.textAlign = 'center';
        timeline.appendChild(initialTime);
        
        // Create legend if MLFQ
        if (isMLFQ) {
            const legend = document.createElement('div');
            legend.className = 'gantt-legend';
            legend.innerHTML = `
                <strong>Queue Legend:</strong>
                <span style="background-color: #ff9999; padding: 2px 5px; margin: 0 5px;">Q0 (Highest)</span>
                <span style="background-color: #99ff99; padding: 2px 5px; margin: 0 5px;">Q1</span>
                <span style="background-color: #9999ff; padding: 2px 5px; margin: 0 5px;">Q2</span>
                <span style="background-color: #ffff99; padding: 2px 5px; margin: 0 5px;">Q3 (Lowest)</span>
            `;
            legendContainer.appendChild(legend);
        }
        
        let currentPosition = 0;
        let currentItem = 0;
        this.isAnimating = true;
        
        const animateStep = () => {
            if (currentItem >= ganttChart.length) {
                // Animation complete
                this.isAnimating = false;
                timelineContainer.appendChild(timeline);
                ganttContainer.appendChild(barsContainer);
                this.showMessage('Simulation completed', 'success');
                return;
            }
            
            const item = ganttChart[currentItem];
            const duration = item.end - item.start;
            const width = duration * 40;
            
            // Add time marker
            const timeMarker = document.createElement('div');
            timeMarker.textContent = item.end;
            timeMarker.style.width = `${width}px`;
            timeMarker.style.textAlign = 'center';
            timeline.appendChild(timeMarker);
            
            // Add process bar
            const bar = document.createElement('div');
            bar.className = 'gantt-item';
            bar.style.width = `${width}px`;
            bar.textContent = item.process === 'IDLE' ? 'IDLE' : item.process;
            
            if (isMLFQ && item.process !== 'IDLE') {
                // Color code by queue level
                const colors = ['#ff9999', '#99ff99', '#9999ff', '#ffff99'];
                bar.style.backgroundColor = colors[item.queueLevel] || '#cccccc';
            } else if (item.process === 'IDLE') {
                bar.className = 'gantt-item idle';
            }
            
            barsContainer.appendChild(bar);
            currentPosition += width;
            currentItem++;
            
            // Update the containers
            timelineContainer.innerHTML = '';
            timelineContainer.appendChild(timeline);
            ganttContainer.innerHTML = '';
            ganttContainer.appendChild(barsContainer);
            
            // Schedule next step
            setTimeout(animateStep, this.animationSpeed);
        };
        
        // Start animation
        animateStep();
    }
    
    showMessage(message, type = 'info') {
        const messageDiv = document.getElementById('actionMessage');
        messageDiv.textContent = message;
        messageDiv.className = `status-message ${type}`;
    }
    
    reset() {
        if (this.isAnimating) {
            this.showMessage('Cannot reset during simulation', 'error');
            return;
        }
        
        this.processes = [];
        this.currentScheduler = null;
        document.getElementById('ganttChart').innerHTML = '';
        document.getElementById('ganttTimeline').innerHTML = '';
        document.getElementById('ganttLegend').innerHTML = '';
        document.querySelector('#statusTable tbody').innerHTML = '';
        document.getElementById('avgWaitingTime').textContent = '--';
        document.getElementById('avgTurnaroundTime').textContent = '--';
        document.getElementById('avgResponseTime').textContent = '--';
        document.getElementById('totalExecTime').textContent = '--';
        document.getElementById('actionMessage').textContent = 'Ready to simulate. Add processes first.';
        document.getElementById('actionMessage').className = 'status-message info';
        document.getElementById('processLength').value = '5';
        document.getElementById('timeQuantum').value = '2';
        document.getElementById('animationSpeed').value = '500';
        this.updateProcessTable();
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CPU_Scheduler_UI();
});
