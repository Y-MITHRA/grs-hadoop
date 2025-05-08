// Helper function to emit key-value pairs in Hadoop streaming format
function emit(key, value) {
    console.log(`${key}\t${JSON.stringify(value)}`);
}

// Store values for each key
const valuesByKey = new Map();

function reduce(key, value) {
    if (!valuesByKey.has(key)) {
        valuesByKey.set(key, []);
    }
    valuesByKey.get(key).push(value);
}

function finalize() {
    for (const [key, values] of valuesByKey.entries()) {
        try {
            // Handle different types of reductions based on key prefix
            if (key.startsWith('resolution_time_')) {
                // Calculate average resolution time
                const sum = values.reduce((acc, val) => acc + val, 0);
                const avg = sum / values.length;
                emit(key, {
                    average: avg,
                    count: values.length,
                    averageInDays: avg / (24 * 60 * 60 * 1000)
                });
            }
            else if (key === 'urgent_pending_3days') {
                // List of urgent cases pending > 3 days
                emit(key, values.sort((a, b) => b.age - a.age)); // Sort by age descending
            }
            else if (key.startsWith('resource_needs_')) {
                // Aggregate resource needs by priority
                const needs = values.reduce((acc, val) => {
                    acc.total++;
                    acc[val.priority] = (acc[val.priority] || 0) + 1;
                    return acc;
                }, { total: 0 });
                emit(key, needs);
            }
            else if (key.startsWith('month_')) {
                // Monthly trends
                const count = values.reduce((acc, val) => acc + val, 0);
                emit(key, {
                    count,
                    average: count / values.length
                });
            }
            else {
                // For simple counts (department, status, priority, location)
                const count = values.reduce((acc, val) => acc + val, 0);
                emit(key, count);
            }
        } catch (error) {
            console.error('Error in reducer for key', key, ':', error);
        }
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
            const [key, value] = line.split('\t');
            try {
                reduce(key, JSON.parse(value));
            } catch (e) {
                console.error('Error parsing value:', value, e);
            }
        }
    });
    finalize();
});
