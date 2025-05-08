#!/usr/bin/env node

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

const results = new Map();

rl.on('line', (line) => {
    try {
        const [key, value] = JSON.parse(line);
        
        if (!results.has(key)) {
            results.set(key, {
                count: 0,
                total: 0,
                priorities: {},
                statuses: {}
            });
        }
        
        const result = results.get(key);
        
        if (typeof value === 'number') {
            result.count += value;
        } else if (typeof value === 'object') {
            if (value.count !== undefined) {
                result.count += value.count;
                result.total += value.average || 0;
            }
            
            if (value.total !== undefined) {
                result.total += value.total;
                
                // Aggregate priority counts
                Object.entries(value).forEach(([priority, count]) => {
                    if (priority !== 'total') {
                        result.priorities[priority] = (result.priorities[priority] || 0) + count;
                    }
                });
            }
        }
        
    } catch (error) {
        console.error('Error reducing line:', error);
    }
});

rl.on('close', () => {
    results.forEach((value, key) => {
        let result;
        
        if (key.startsWith('month_')) {
            result = {
                count: value.count,
                average: value.count > 0 ? value.total / value.count : 0
            };
        } else if (key.startsWith('resource_needs_')) {
            result = {
                total: value.total,
                ...value.priorities
            };
        } else {
            result = value.count;
        }
        
        console.log(JSON.stringify({
            key,
            value: result
        }));
    });
});
