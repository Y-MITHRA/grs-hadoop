// Helper function to emit key-value pairs in Hadoop streaming format
function emit(key, value) {
    console.log(`${key}\t${JSON.stringify(value)}`);
}

function map(line) {
    try {
        const grievance = JSON.parse(line);
        const createdDate = new Date(grievance.createdAt);
        
        // Basic counts by various dimensions
        emit(`department_${grievance.department}`, 1);
        emit(`status_${grievance.status}`, 1);
        emit(`priority_${grievance.priority}`, 1);
        emit(`location_${grievance.location}`, 1);
        
        // Time-based analysis
        const monthKey = `${createdDate.getFullYear()}-${createdDate.getMonth() + 1}`;
        emit(`month_${monthKey}_${grievance.department}`, 1);
        
        // Department performance metrics
        if (grievance.status === 'resolved' && grievance.resolvedAt) {
            const resolutionTime = new Date(grievance.resolvedAt) - createdDate;
            emit(`resolution_time_${grievance.department}`, resolutionTime);
        }
        
        // Priority distribution
        emit(`priority_${grievance.priority}_${grievance.department}`, 1);
        
        // Status distribution
        emit(`status_${grievance.status}_${grievance.department}`, 1);
        
        // Location distribution
        emit(`location_${grievance.location}_${grievance.department}`, 1);
        
        // Escalation tracking
        if (grievance.status === 'escalated') {
            emit(`escalation_${grievance.department}`, 1);
        }
        
        // Urgent cases tracking
        if (grievance.priority === 'High') {
            const currentTime = new Date();
            const ageDays = (currentTime - createdDate) / (24 * 60 * 60 * 1000);
            if (ageDays > 3 && grievance.status === 'pending') {
                emit('urgent_pending_3days', {
                    id: grievance.petitionId,
                    department: grievance.department,
                    age: ageDays
                });
            }
        }
        
        // Resource requirements (based on pending cases)
        if (grievance.status === 'pending') {
            emit(`resource_needs_${grievance.department}`, {
                count: 1,
                priority: grievance.priority
            });
        }
        
    } catch (error) {
        console.error('Error in mapper:', error);
    }
}

// Process each input line
process.stdin.resume();
process.stdin.setEncoding('utf8');

let inputChunks = '';

process.stdin.on('data', function(chunk) {
    inputChunks += chunk;
});

process.stdin.on('end', function() {
    const lines = inputChunks.trim().split('\n');
    lines.forEach(line => {
        if (line.trim()) {
            map(line);
        }
    });
});
