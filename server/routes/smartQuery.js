import express from 'express';
import { MongoClient } from 'mongodb';
import { pipeline } from '@xenova/transformers';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import { JWT_SECRET, JWT_OPTIONS } from '../config/jwt.js';

const router = express.Router();

// Initialize model and tokenizer variables first
let model = null;
let modelInitializing = false;

// Initialize model when router is created
(async () => {
    try {
        await initializeModel();
        console.log('NLP model initialized successfully on server start');
    } catch (error) {
        console.error('Failed to initialize NLP model:', error);
    }
})();

// Authentication middleware
const authenticateToken = (req, res, next) => {
    // Check for authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({
            error: 'Authentication header is missing',
            details: 'Please provide a valid Bearer token'
        });
    }

    // Extract token from header
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({
            error: 'Token is missing',
            details: 'Bearer token not found in authorization header'
        });
    }

    try {
        // Verify and decode the token
        const decoded = jwt.verify(token, JWT_SECRET, JWT_OPTIONS);

        // Log decoded token for debugging (remove in production)
        console.log('Decoded token:', decoded);

        // Check if token is about to expire (within 1 hour)
        const tokenExp = new Date(decoded.exp * 1000);
        const now = new Date();
        const timeUntilExpiry = tokenExp - now;
        if (timeUntilExpiry < 3600000) { // less than 1 hour
            console.warn(`Token will expire in ${Math.floor(timeUntilExpiry / 60000)} minutes`);
        }

        // Validate user role
        if (!decoded.role || (decoded.role !== 'admin' && decoded.role !== 'analyst')) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                details: 'This endpoint requires admin or analyst privileges'
            });
        }

        // Attach user info to request
        req.user = {
            id: decoded.id,
            role: decoded.role
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired',
                details: 'Please login again to obtain a new token'
            });
        } else if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                error: 'Invalid token',
                details: 'The provided token is malformed or invalid'
            });
        }

        console.error('Token verification error:', error);
        return res.status(500).json({
            error: 'Authentication error',
            details: 'An unexpected error occurred during authentication'
        });
    }
};

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Define query intents with more specific categories
const QUERY_INTENTS = {
    LIST: 'list',
    COUNT: 'count',
    STATUS: 'status',
    PRIORITY: 'priority',
    DEPARTMENT: 'department',
    LOCATION: 'location',
    ESCALATED: 'escalated',
    RESOURCES: 'resources',
    DETAILS: 'details',
    TIMELINE: 'timeline',
    REQUIREMENTS: 'requirements',
    COMMUNICATIONS: 'communications'
};

async function initializeModel() {
    if (modelInitializing) return;
    try {
        modelInitializing = true;
        console.log('Initializing NLP model...');
        // Use DistilBERT for sequence classification
        const pipe = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        model = pipe;
        console.log('Model initialized successfully');
    } catch (error) {
        console.error('Error initializing model:', error);
        model = null;
        throw error;
    } finally {
        modelInitializing = false;
    }
}

async function classifyQueryIntent(query) {
    try {
        if (!model) {
            throw new Error('Model not initialized');
        }

        const queryLower = query.toLowerCase();
        const result = await model(queryLower);
        console.log('DistilBERT classification result:', result);

        // Map sentiment scores to intents
        const intents = [];

        // Basic intent patterns
        if (/how many|count|total|number of/i.test(queryLower)) intents.push(QUERY_INTENTS.COUNT);
        if (/show|list|get|display|find|what are/i.test(queryLower)) intents.push(QUERY_INTENTS.LIST);

        // Department detection
        if (/water|electricity|rto|health|education/i.test(queryLower)) {
            intents.push(QUERY_INTENTS.DEPARTMENT);
        }

        // Resource and requirement detection
        if (/resource|requirement|need|material|equipment|supply/i.test(queryLower)) {
            intents.push(QUERY_INTENTS.RESOURCES);
            intents.push(QUERY_INTENTS.REQUIREMENTS);
        }

        // Priority detection
        if (/priority|urgent|critical|high|medium|low/i.test(queryLower)) {
            intents.push(QUERY_INTENTS.PRIORITY);
        }

        // Use DistilBERT sentiment for additional context
        if (result && result[0]) {
            const { label, score } = result[0];
            console.log('Sentiment analysis:', { label, score });

            // If sentiment is very negative, might indicate urgent/priority cases
            if (label === 'NEGATIVE' && score > 0.8) {
                if (!intents.includes(QUERY_INTENTS.PRIORITY)) {
                    intents.push(QUERY_INTENTS.PRIORITY);
                }
            }
        }

        return [...new Set(intents)]; // Remove duplicates
    } catch (error) {
        console.error('Error in intent classification:', error);
        // Fallback to basic pattern matching if model fails
        return extractBasicIntents(query);
    }
}

// Fallback function for basic intent extraction
function extractBasicIntents(query) {
    const queryLower = query.toLowerCase();
    const intents = [];

    const patterns = {
        [QUERY_INTENTS.COUNT]: /how many|count|total|number of/i,
        [QUERY_INTENTS.LIST]: /show|list|get|display|find|what are/i,
        [QUERY_INTENTS.STATUS]: /status|resolved|pending|progress|current state/i,
        [QUERY_INTENTS.PRIORITY]: /priority|urgent|critical|high|medium|low/i,
        [QUERY_INTENTS.DEPARTMENT]: /department|water|electricity|rto|health|education/i,
        [QUERY_INTENTS.RESOURCES]: /resource|requirement|need|material|equipment|supply/i,
    };

    for (const [intent, pattern] of Object.entries(patterns)) {
        if (pattern.test(queryLower)) {
            intents.push(intent);
        }
    }

    return intents;
}

// Helper function to convert natural language to MongoDB query
async function convertToMongoQuery(naturalQuery, context) {
    try {
        if (!model) {
            throw new Error('Model not initialized');
        }

        const queryLower = naturalQuery.toLowerCase();

        // Check for priority cases query
        if (queryLower.includes('priority') || queryLower.includes('urgent')) {
            const filter = {
                department: /^water$/i,
                priority: { $in: ['High', 'high'] }
            };

            return {
                isAggregate: false,
                collection: 'grievances',
                filter: filter,
                projection: {
                    _id: 1,
                    petitionId: 1,
                    title: 1,
                    description: 1,
                    department: 1,
                    location: 1,
                    status: 1,
                    priority: 1,
                    createdAt: 1,
                    updatedAt: 1
                },
                sort: { createdAt: -1 }
            };
        }

        // Check for resource management related queries
        const isResourceQuery = queryLower.includes('resource') ||
            queryLower.includes('requirements') ||
            queryLower.includes('funds') ||
            queryLower.includes('manpower');

        if (isResourceQuery) {
            const filter = { 'resourceManagement': { $exists: true } };

            // Add department filter if specified - using exact match
            const department = extractDepartment(queryLower);
            if (department) {
                filter.department = department; // Exact match instead of regex
            }

            // Add location filters if specified
            const location = extractLocation(queryLower);
            if (location) {
                if (queryLower.includes('taluk')) {
                    filter['resourceManagement.taluk'] = location;
                } else if (queryLower.includes('division')) {
                    filter['resourceManagement.division'] = location;
                } else if (queryLower.includes('district')) {
                    filter['resourceManagement.district'] = location;
                }
            }

            // Add specific resource requirement filters
            if (queryLower.includes('funds')) {
                if (queryLower.includes('above') || queryLower.includes('more than')) {
                    const amount = extractAmount(queryLower);
                    if (amount) {
                        filter['resourceManagement.fundsRequired'] = { $gt: amount };
                    }
                } else if (queryLower.includes('below') || queryLower.includes('less than')) {
                    const amount = extractAmount(queryLower);
                    if (amount) {
                        filter['resourceManagement.fundsRequired'] = { $lt: amount };
                    }
                }
            }

            // Add date range filters for resource timeline
            if (queryLower.includes('start') || queryLower.includes('begin')) {
                const date = extractDate(queryLower);
                if (date) {
                    filter['resourceManagement.startDate'] = { $gte: date };
                }
            }
            if (queryLower.includes('end') || queryLower.includes('finish')) {
                const date = extractDate(queryLower);
                if (date) {
                    filter['resourceManagement.endDate'] = { $lte: date };
                }
            }

            console.log('Resource query filter:', filter); // Debug log

            return {
                isAggregate: false,
                collection: 'grievances',
                filter: filter,
                projection: {
                    _id: 0,
                    petitionId: 1,
                    title: 1,
                    department: 1,
                    status: 1,
                    resourceManagement: 1
                },
                sort: { 'resourceManagement.startDate': 1 }
            };
        }

        // Classify query intent
        const intents = await classifyQueryIntent(naturalQuery);
        console.log('Detected intents:', intents);

        // If no intents detected, fall back to basic query
        if (intents.length === 0) {
            return {
                isAggregate: false,
                collection: 'grievances',
                filter: buildBasicFilter(naturalQuery),
                projection: { _id: 0, __v: 0 },
                sort: { createdAt: -1 }
            };
        }

        // Handle count queries
        if (intents.includes(QUERY_INTENTS.COUNT)) {
            return buildCountQuery(naturalQuery, intents);
        }

        // Handle list queries with specific intents
        return buildListQuery(naturalQuery, intents);
    } catch (error) {
        console.error('Error converting query:', error);
        throw error;
    }
}

function buildCountQuery(query, intents) {
    const aggregateQuery = {
        isAggregate: true,
        collection: 'grievances',
        pipeline: []
    };

    const matchStage = { $match: {} };

    // Apply filters based on intents
    if (intents.includes(QUERY_INTENTS.ESCALATED)) {
        matchStage.$match.escalatedAt = { $exists: true, $ne: null };
    }
    if (intents.includes(QUERY_INTENTS.STATUS)) {
        const status = extractStatus(query);
        if (status) {
            matchStage.$match.status = status === 'in progress' ? 'in-progress' : status;
        }
    }
    // ... Add other intent-based filters

    if (Object.keys(matchStage.$match).length > 0) {
        aggregateQuery.pipeline.push(matchStage);
    }
    aggregateQuery.pipeline.push({ $count: 'total' });

    return aggregateQuery;
}

function buildListQuery(query, intents) {
    // For resource requirement queries, we need to look at both collections
    if (intents.includes(QUERY_INTENTS.RESOURCES) || intents.includes(QUERY_INTENTS.REQUIREMENTS)) {
        const department = extractDepartment(query);
        return {
            isAggregate: true,
            collection: 'resourcemanagements',
            pipeline: [
                // Match department if specified
                ...(department ? [{
                    $match: {
                        department: new RegExp(department, 'i')
                    }
                }] : []),
                // Group by department
                {
                    $group: {
                        _id: '$department',
                        resources: {
                            $push: {
                                id: '$petitionId',
                                description: '$description',
                                estimatedCost: '$estimatedCost',
                                requirements: '$requirements',
                                status: '$status'
                            }
                        },
                        totalCost: { $sum: '$estimatedCost' },
                        count: { $sum: 1 }
                    }
                },
                // Sort by department
                {
                    $sort: { _id: 1 }
                }
            ]
        };
    }

    // For other queries, use the existing filter-based approach
    const filter = {};
    intents.forEach(intent => {
        switch (intent) {
            case QUERY_INTENTS.ESCALATED:
                filter.escalatedAt = { $exists: true, $ne: null };
                break;
            case QUERY_INTENTS.STATUS:
                const status = extractStatus(query);
                if (status) {
                    filter.status = status === 'in progress' ? 'in-progress' : status;
                }
                break;
            case QUERY_INTENTS.DEPARTMENT:
                const department = extractDepartment(query);
                if (department) {
                    filter.department = new RegExp(department, 'i');
                }
                break;
        }
    });

    // Handle department separately if not already handled
    if (!filter.department && query.toLowerCase().includes('water')) {
        filter.department = new RegExp('water', 'i');
    }

    console.log('Generated filter:', JSON.stringify(filter, null, 2));

    return {
        isAggregate: false,
        collection: 'grievances',
        filter: filter,
        projection: {
            _id: 1,
            title: 1,
            description: 1,
            department: 1,
            location: 1,
            status: 1,
            priority: 1,
            createdAt: 1,
            updatedAt: 1,
            resourceRequirements: 1,
            submitterName: 1,
            submitterContact: 1
        },
        sort: { createdAt: -1 }
    };
}

// Helper functions for query parsing
function extractDepartment(query) {
    const queryLower = query.toLowerCase();
    const departments = {
        'water': ['water', 'water department', 'water supply', 'waterworks'],
        'electricity': ['electricity', 'power', 'electrical', 'electric', 'eb'],
        'rto': ['rto', 'transport', 'road transport', 'vehicle', 'motor'],
        'health': ['health', 'medical', 'hospital', 'healthcare'],
        'education': ['education', 'school', 'educational', 'academic']
    };

    for (const [dept, keywords] of Object.entries(departments)) {
        if (keywords.some(keyword => queryLower.includes(keyword))) {
            return dept;
        }
    }
    return null;
}

function extractLocation(query) {
    const locations = {
        'kanchipuram': ['kanchipuram', 'kancheepuram'],
        'madurai': ['madurai'],
        'salem': ['salem'],
        'coimbatore': ['coimbatore', 'kovai'],
        'tirunelveli': ['tirunelveli', 'nellai']
    };

    for (const [loc, keywords] of Object.entries(locations)) {
        if (keywords.some(keyword => query.includes(keyword))) {
            return loc;
        }
    }
    return null;
}

function extractStatus(query) {
    const statusMap = {
        'resolved': ['resolved', 'completed', 'done', 'fixed'],
        'pending': ['pending', 'open', 'new'],
        'escalated': ['escalated', 'escalate', 'elevated'],
        'in-progress': ['in progress', 'processing', 'ongoing']
    };

    for (const [status, keywords] of Object.entries(statusMap)) {
        if (keywords.some(keyword => query.includes(keyword))) {
            if (status === 'in-progress') return 'in progress';
            return status;
        }
    }
    return null;
}

function extractPriority(query) {
    const priorities = {
        'high': ['high', 'urgent', 'critical'],
        'medium': ['medium', 'moderate'],
        'low': ['low', 'minor']
    };

    for (const [priority, keywords] of Object.entries(priorities)) {
        if (keywords.some(keyword => query.includes(keyword))) {
            return priority;
        }
    }
    return null;
}

function buildFilter(components) {
    const filter = {};

    if (components.department) {
        // Case-insensitive department search
        filter.department = new RegExp(`^${components.department}$`, 'i');
    }
    if (components.location) {
        // Case-insensitive location search
        filter.location = new RegExp(`^${components.location}$`, 'i');
    }
    if (components.status) {
        // Handle status variations
        if (components.status === 'escalated') {
            // Check for escalatedAt field
            filter.escalatedAt = { $exists: true, $ne: null };
        } else if (components.status === 'in progress') {
            filter.status = 'in-progress';
        } else {
            // Case-insensitive status search
            filter.status = new RegExp(`^${components.status}$`, 'i');
        }
    }
    if (components.priority) {
        // Case-insensitive priority search
        filter.priority = new RegExp(`^${components.priority}$`, 'i');
    }

    return filter;
}

function buildBasicFilter(query) {
    const queryLower = query.toLowerCase();
    const filter = {};

    // Check for escalated cases
    if (queryLower.includes('escalated')) {
        filter.escalatedAt = { $exists: true, $ne: null };
    }

    // Check for priority
    if (queryLower.includes('high priority')) {
        filter.priority = 'high';
    } else if (queryLower.includes('medium priority')) {
        filter.priority = 'medium';
    } else if (queryLower.includes('low priority')) {
        filter.priority = 'low';
    }

    // Check for status
    if (queryLower.includes('resolved')) {
        filter.status = 'resolved';
    } else if (queryLower.includes('pending')) {
        filter.status = 'pending';
    } else if (queryLower.includes('in progress')) {
        filter.status = 'in-progress';
    }

    // Check for departments
    const departments = ['water', 'electricity', 'rto', 'health', 'education'];
    for (const dept of departments) {
        if (queryLower.includes(dept)) {
            filter.department = dept;
            break;
        }
    }

    // Check for locations
    const locations = ['kanchipuram', 'madurai', 'salem', 'coimbatore', 'tirunelveli'];
    for (const loc of locations) {
        if (queryLower.includes(loc)) {
            filter.location = loc;
            break;
        }
    }

    return filter;
}

// Helper function to extract amounts from query
function extractAmount(query) {
    const matches = query.match(/\d+/);
    return matches ? parseInt(matches[0]) : null;
}

// Helper function to extract dates from query
function extractDate(query) {
    // Simple date extraction - can be enhanced based on requirements
    const dateRegex = /\d{4}-\d{2}-\d{2}/;
    const match = query.match(dateRegex);
    return match ? new Date(match[0]) : null;
}

// Route handler for processing queries
router.post('/query', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Check if model is initialized
        if (!model) {
            // Try to initialize model if not already initializing
            if (!modelInitializing) {
                try {
                    await initializeModel();
                } catch (error) {
                    console.error('Failed to initialize model on demand:', error);
                    return res.status(503).json({
                        error: 'Service temporarily unavailable',
                        details: 'NLP model is not initialized. Please try again in a few moments.'
                    });
                }
            } else {
                return res.status(503).json({
                    error: 'Service temporarily unavailable',
                    details: 'NLP model is initializing. Please try again in a few moments.'
                });
            }
        }

        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGODB_URI);
        const database = client.db('grievance_portal');
        const collection = database.collection('grievances');

        // Get previous messages for context
        const userId = req.user.id;
        const previousMessages = await Message.find({ userId })
            .sort({ timestamp: -1 })
            .limit(5)  // Get last 5 messages for context
            .lean();

        // Build context from previous messages
        const context = previousMessages.reverse().map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Log the query and context for debugging
        console.log('Processing query:', query);
        console.log('Context:', context);

        // First check if the collection exists and has documents
        const collectionExists = await collection.countDocuments() > 0;
        if (!collectionExists) {
            console.log('No documents found in grievances collection');
            return res.status(404).json({
                error: 'No data available',
                message: 'The grievances collection is empty'
            });
        }

        // Detect query intents first
        const intents = await classifyQueryIntent(query);
        console.log('Detected intents:', intents);

        // Convert natural language to MongoDB query with context
        const mongoQuery = await convertToMongoQuery(query, context);
        console.log('Generated MongoDB query:', JSON.stringify(mongoQuery, null, 2));

        let results;
        if (mongoQuery.isAggregate) {
            // Execute aggregate query
            console.log('Executing aggregate query:', JSON.stringify(mongoQuery.pipeline, null, 2));
            results = await collection.aggregate(mongoQuery.pipeline).toArray();
        } else {
            // Execute regular query
            console.log('Executing find query:', JSON.stringify(mongoQuery.filter, null, 2));
            results = await collection
                .find(mongoQuery.filter)
                .project(mongoQuery.projection)
                .sort(mongoQuery.sort)
                .toArray();
        }

        console.log('Query results:', JSON.stringify(results, null, 2));

        // Generate response first
        const response = generateResponse(results, query, mongoQuery);

        // Only save messages if we have valid content
        if (response) {
            // Save the query
            await Message.create({
                userId: req.user.id,
                content: query,
                role: 'user'
            });

            // Save the response
            await Message.create({
                userId: req.user.id,
                content: response,
                role: 'assistant'
            });
        }

        res.json({
            success: true,
            results,
            response,
            query: mongoQuery,
            debug: {
                originalQuery: query,
                context: context,
                intents: intents,
                mongoQuery: mongoQuery,
                resultCount: results.length
            }
        });
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({
            error: 'Error processing query',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

async function buildDetailedResponse(results, query, intents) {
    const response = {
        summary: {},
        details: [],
        metadata: {}
    };

    // Build summary statistics
    const summary = {
        total: results.length,
        departments: new Set(),
        locations: new Set(),
        status: {},
        priority: {},
        timeline: {
            oldest: null,
            newest: null,
            averageAge: 0
        }
    };

    // Process each grievance for detailed information
    const now = new Date();
    let totalAge = 0;

    results.forEach(grievance => {
        // Update summary counts
        summary.departments.add(grievance.department);
        summary.locations.add(grievance.location);
        summary.status[grievance.status] = (summary.status[grievance.status] || 0) + 1;
        summary.priority[grievance.priority] = (summary.priority[grievance.priority] || 0) + 1;

        // Track timeline information
        const createdAt = new Date(grievance.createdAt);
        if (!summary.timeline.oldest || createdAt < summary.timeline.oldest) {
            summary.timeline.oldest = createdAt;
        }
        if (!summary.timeline.newest || createdAt > summary.timeline.newest) {
            summary.timeline.newest = createdAt;
        }
        totalAge += (now - createdAt);

        // Build detailed grievance information
        const detail = {
            id: grievance._id,
            title: grievance.title,
            description: grievance.description,
            department: grievance.department,
            location: grievance.location,
            status: grievance.status,
            priority: grievance.priority,
            createdAt: grievance.createdAt,
            lastUpdated: grievance.updatedAt,
            age: Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)), // age in days
            submitter: {
                name: grievance.submitterName,
                contact: grievance.submitterContact
            },
            escalation: grievance.escalation,
            resourceRequirements: grievance.resourceRequirements || [],
            attachments: grievance.attachments || [],
            comments: grievance.comments || []
        };

        response.details.push(detail);
    });

    // Finalize summary
    summary.timeline.averageAge = totalAge / (results.length * (1000 * 60 * 60 * 24)); // average age in days
    response.summary = {
        ...summary,
        departments: Array.from(summary.departments),
        locations: Array.from(summary.locations)
    };

    // Add metadata about the query
    response.metadata = {
        queryIntents: intents,
        timestamp: new Date(),
        filters: query.filters || {}
    };

    return response;
}

// Update response generation to fix the sum error
function generateResponse(results, query, mongoQuery) {
    if (!results || results.length === 0) {
        return 'No matching cases found.';
    }

    const queryLower = query.toLowerCase();

    // Handle priority cases query
    if (queryLower.includes('priority') || queryLower.includes('urgent')) {
        const count = results.length;
        const highPriorityCases = results.filter(g => g.priority?.toLowerCase() === 'high');
        let response = `Found ${highPriorityCases.length} high priority grievance${highPriorityCases.length !== 1 ? 's' : ''} in the water department:\n\n`;

        highPriorityCases.forEach((grievance, index) => {
            response += `${index + 1}. Title: ${grievance.title}\n`;
            response += `   Status: ${grievance.status}\n`;
            response += `   Location: ${grievance.location || 'Not specified'}\n`;
            response += `   Created: ${new Date(grievance.createdAt).toLocaleDateString()}\n`;
            if (grievance.description) {
                response += `   Description: ${grievance.description.substring(0, 100)}${grievance.description.length > 100 ? '...' : ''}\n`;
            }
            response += '\n';
        });

        return response || 'No high priority cases found in the water department.';
    }

    // Handle resource management queries
    const isResourceQuery = queryLower.includes('resource') ||
        queryLower.includes('requirements') ||
        queryLower.includes('funds') ||
        queryLower.includes('manpower');

    if (isResourceQuery) {
        const count = results.length;
        let response = `Found ${count} grievance${count !== 1 ? 's' : ''} with resource management details`;

        // Add department summary if available
        const departments = [...new Set(results.map(r => r.department))];
        if (departments.length === 1) {
            response += ` in the ${departments[0]} department`;
        } else if (departments.length > 1) {
            response += ` across ${departments.length} departments (${departments.join(', ')})`;
        }

        // Fix the reduce functions
        const totalFunds = results.reduce((acc, r) => acc + (r.resourceManagement?.fundsRequired || 0), 0);
        const avgManpower = Math.round(results.reduce((acc, r) => acc + (r.resourceManagement?.manpowerNeeded || 0), 0) / count);

        response += `\nTotal funds required: ₹${totalFunds.toLocaleString()}`;
        response += `\nAverage manpower needed: ${avgManpower} personnel`;

        // Add timeline summary with validation
        const validDates = results.filter(r => {
            if (!r.resourceManagement?.startDate || !r.resourceManagement?.endDate) return false;
            const startDate = new Date(r.resourceManagement.startDate);
            const endDate = new Date(r.resourceManagement.endDate);
            return !isNaN(startDate) && !isNaN(endDate);
        });

        if (validDates.length > 0) {
            const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
            const startDates = validDates.map(r => new Date(r.resourceManagement.startDate));
            const endDates = validDates.map(r => new Date(r.resourceManagement.endDate));
            const earliestStart = new Date(Math.min(...startDates));
            const latestEnd = new Date(Math.max(...endDates));
            response += `\nTimeline: ${earliestStart.toLocaleDateString('en-US', dateOptions)} to ${latestEnd.toLocaleDateString('en-US', dateOptions)}`;
        } else {
            response += '\nTimeline: No valid dates available';
        }

        return response;
    }

    // Default response for other queries
    const count = results.length;
    let response = `Found ${count} grievance${count !== 1 ? 's' : ''} in the water department`;

    // Add status distribution
    const statusCounts = {};
    results.forEach(g => {
        statusCounts[g.status] = (statusCounts[g.status] || 0) + 1;
    });

    response += '\nStatus distribution:';
    Object.entries(statusCounts).forEach(([status, count]) => {
        response += `\n- ${status}: ${count}`;
    });

    return response;
}

// Route to save a message
router.post('/messages', async (req, res) => {
    try {
        const { content, role } = req.body;
        const userId = req.user.id;

        const message = new Message({
            userId,
            content,
            role
        });

        await message.save();
        res.json({ success: true, message });
    } catch (error) {
        console.error('Error saving message:', error);
        res.status(500).json({ error: 'Failed to save message' });
    }
});

// Route to get message history
router.get('/messages', async (req, res) => {
    try {
        const userId = req.user.id;
        const messages = await Message.find({ userId })
            .sort({ timestamp: 1 })
            .limit(100); // Limit to last 100 messages

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch message history' });
    }
});

export default router; 