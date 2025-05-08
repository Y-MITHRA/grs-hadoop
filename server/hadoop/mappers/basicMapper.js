#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

// Function to check if a grievance matches all specified filters with exact case-sensitive matching
function matchesFilters(grievance, filters) {
    if (!filters) return true;
    
    for (const [field, value] of Object.entries(filters)) {
        const fieldName = field.toLowerCase();
        const grievanceValue = grievance[fieldName] ? grievance[fieldName].toUpperCase() : null;
        const filterValue = value ? value.toUpperCase() : null;
        
        if (filterValue && grievanceValue !== filterValue) {
            return false;
        }
    }
    return true;
}

rl.on('line', (line) => {
    try {
        const grievance = JSON.parse(line);
        
        // Only process grievances that match all specified filters
        if (!matchesFilters(grievance, process.env.FILTERS ? JSON.parse(process.env.FILTERS) : null)) {
            return;
        }
        
        // Emit department counts with uppercase values
        emit(`department_${grievance.department.toUpperCase()}`, 1);
        
        // Emit status counts per department with uppercase values
        emit(`status_${grievance.status.toUpperCase()}_${grievance.department.toUpperCase()}`, 1);
        
        // Emit priority counts per department with uppercase values
        emit(`priority_${grievance.priority.toUpperCase()}_${grievance.department.toUpperCase()}`, 1);
        
        // Emit location counts per department
        if (grievance.location) {
            emit(`location_${grievance.location}_${grievance.department}`, 1);
        }
        
        // Emit time-based metrics
        const createdAt = new Date(grievance.createdAt);
        const monthKey = `${createdAt.getFullYear()}-${createdAt.getMonth() + 1}`;
        emit(`month_${monthKey}_${grievance.department}`, {
            count: 1,
            average: grievance.resolutionTime || 0
        });
        
        // Emit resource needs metrics
        if (grievance.priority === 'HIGH' || grievance.status === 'ESCALATED') {
            emit(`resource_needs_${grievance.department}`, {
                total: 1,
                [grievance.priority]: 1
            });
        }
        
    } catch (error) {
        console.error('Error processing line:', error);
    }
});

function emit(key, value) {
    console.log(JSON.stringify([key, value]));
}
