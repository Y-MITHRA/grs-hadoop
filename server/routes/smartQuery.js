import express from 'express';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import { JWT_SECRET, JWT_OPTIONS } from '../config/jwt.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import Grievance from '../models/Grievance.js';
import Official from '../models/Official.js';
import ResourceManagement from '../models/ResourceManagement.js';
import auth from '../middleware/auth.js';

dotenv.config();

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Constants for validation 
const VALID_DEPARTMENTS = ['Water', 'RTO', 'Electricity'];
const VALID_DIVISIONS = ['North', 'South', 'East', 'West', 'Central'];
const VALID_DISTRICTS = ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Belagavi', 'Kalaburagi', 'Mangaluru', 'Hubballi', 'Dharwad'];
const VALID_TALUKS = ['Bengaluru East', 'Bengaluru West', 'Bengaluru South', 'Bengaluru North', 'Nelamangala', 'Doddaballapura', 'Devanahalli', 'Hosakote', 'Anekal', 'Central Mysuru', 'North Mysuru', 'South Mysuru'];
const VALID_STATUSES = ['Pending', 'In Progress', 'Resolved', 'Declined'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

// Authentication middleware
const authenticateToken = (req, res, next) => {
    try {
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

            // Log decoded token for debugging
            console.log('Decoded token:', decoded);

            // Check token expiration
            const tokenExp = new Date(decoded.exp * 1000);
            const now = new Date();
            if (now >= tokenExp) {
                return res.status(401).json({
                    error: 'Token expired',
                    details: 'Please login again to obtain a new token'
                });
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
            console.error('Token verification error:', error);
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
            throw error;
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            error: 'Authentication error',
            details: error.message || 'An unexpected error occurred during authentication'
        });
    }
};

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Define valid options for filtering and analytics
const VALID_DESIGNATIONS = ['Manager', 'Officer', 'Supervisor', 'Assistant'];

// Analytics functions
const calculateAnalytics = (results, params) => {
    const stats = {
        total: results.length,
        byDepartment: {},
        byLocation: {},
        byStatus: {},
        byPriority: {},
        totalFunds: 0,
        totalManpower: 0
    };

    results.forEach(item => {
        // Count by department
        if (item.department) {
            stats.byDepartment[item.department] = (stats.byDepartment[item.department] || 0) + 1;
        }

        // Count by location
        if (item.district && item.division) {
            const location = `${item.district} - ${item.division}`;
            stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;
        } else if (item.district) {
            stats.byLocation[item.district] = (stats.byLocation[item.district] || 0) + 1;
        } else if (item.taluk) {
            stats.byLocation[item.taluk] = (stats.byLocation[item.taluk] || 0) + 1;
        }

        // Count by status
        if (item.status) {
            stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
        }

        // Count by priority
        if (item.priority) {
            stats.byPriority[item.priority] = (stats.byPriority[item.priority] || 0) + 1;
        }

        // Add up resource metrics
        if (item.resourceManagement) {
            if (item.resourceManagement.fundsRequired) {
                stats.totalFunds += item.resourceManagement.fundsRequired;
            }
            if (item.resourceManagement.manpowerNeeded) {
                stats.totalManpower += item.resourceManagement.manpowerNeeded;
            }
        }

        // Count by designation (for officials)
        if (item.designation) {
            stats.byDesignation = stats.byDesignation || {};
            stats.byDesignation[item.designation] = (stats.byDesignation[item.designation] || 0) + 1;
        }
    });

    // Filter out empty categories
    for (const category of Object.keys(stats)) {
        if (typeof stats[category] === 'object' && Object.keys(stats[category]).length === 0) {
            delete stats[category];
        }
    }

    return stats;
};

// Define response patterns with more specific acknowledgments
const RESPONSE_PATTERNS = {
    greeting: /^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))$/i,
    acknowledgment: /^(ok(ay)?|got\s*it|sure|alright|yes|yeah|fine|understood|k)$/i,
    thanks: /^(thanks|thank\s*you|ty|thankyou|thx)$/i,
    listRequest: /^(list|show|display|get)\s*(all|them|cases|grievances)?$/i
};

// Update the Gemini prompt to better handle filters
const getQueryPrompt = (query, context) => `You are a backend assistant for a grievance management system. Extract the intent and parameters from the admin's question.

Question: "${query}"
Previous context: ${JSON.stringify(context)}

Valid options:
- Departments: ${JSON.stringify(VALID_DEPARTMENTS)}
- Divisions: ${JSON.stringify(VALID_DIVISIONS)}
- Districts: ${JSON.stringify(VALID_DISTRICTS)}
- Taluks: ${JSON.stringify(VALID_TALUKS)}
- Priorities: ${JSON.stringify(VALID_PRIORITIES)}
- Statuses: ${JSON.stringify(VALID_STATUSES)}

Location hierarchy:
- Department (e.g., Water, RTO)
- Division (e.g., North, South)
- District (e.g., Chennai, Coimbatore)
- Taluk (specific to each district)

Priority levels:
- High: Urgent cases requiring immediate attention
- Medium: Standard priority cases
- Low: Non-urgent cases

Status types:
- Pending: New cases
- In Progress: Cases being worked on
- Resolved: Completed cases
- Escalated: Cases requiring higher attention

Intent Classification:
- case_query: When asking about grievances/cases itself (not resources)
- resource_query: When asking about resources/requirements for cases
- manpower_query: When asking specifically about manpower needs
- count_query: When asking for counts or totals of cases, resources, or officials
- stats_query: When asking for statistics, summaries, or aggregated information
- official_info: When asking about officials/employees/staff
- case_lookup: When looking up a specific case by ID

For count_query, extract:
1. What is being counted (cases, funds, manpower, officials)
2. Location filters (department, division, district, taluk)
3. Status filters if specified
4. Priority filters if specified

For stats_query, extract:
1. Type of statistics (funds, manpower, resource allocation)
2. Location filters (department, division, district, taluk)
3. Time period if specified
4. Any grouping parameters (by department, by status, etc)

For official_info, extract:
1. Department if specified
2. Division, district, or taluk if specified
3. Role or designation if specified
4. Whether looking for a specific official or aggregate count

For case_lookup, extract:
1. The case ID or petition ID
2. What specific information is needed about the case

For case queries, extract:
1. Location details (department, division, district, taluk)
2. Priority level if specified
3. Status if specified
4. Any specific conditions or filters

For resource and manpower queries, extract:
1. Location details (department, division, district, taluk)
2. Resource type (manpower, funds, or both)
3. Priority level if specified
4. Status if specified
5. Any specific conditions or filters

IMPORTANT GUIDELINES:
- When a query mentions "count", "how many", "total", or similar terms, use "count_query"
- When a query mentions "cases", "grievances", or specific case statuses without mentioning resources or requirements, use "case_query"
- When a query explicitly mentions a case ID or petition ID, use "case_lookup"
- When a query mentions "officials", "staff", "employees", or similar terms, use "official_info"
- When a query asks for sums, averages, or other aggregate metrics, use "stats_query"
- If a query mentions both resources and cases, but emphasizes resources, use "resource_query"

Respond with a JSON object:
{
  "intent": "case_query|manpower_query|resource_query|count_query|stats_query|official_info|case_lookup",
  "params": {
    "department": "string or null",
    "division": "string or null",
    "district": "string or null",
    "taluk": "string or null",
    "priority": "high|medium|low|null",
    "status": "pending|in progress|resolved|escalated|null",
    "searchValue": "string describing what to search for",
    "caseId": "string when looking up a specific case",
    "countTarget": "cases|resources|officials|funds|manpower",
    "includeDetails": true
  }
}`;

// Route handler for processing queries
router.post('/query', async (req, res) => {
    try {
        const { query } = req.body;

        // Log request details
        console.log('Processing query:', {
            query,
            userId: req.user?.id,
            timestamp: new Date().toISOString()
        });

        if (!query) {
            return res.status(400).json({
                error: 'Query is required',
                details: 'Please provide a query string'
            });
        }

        const queryLower = query.toLowerCase().trim();

        // Get previous messages for context
        const previousMessages = await Message.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .limit(5)
            .lean();

        // Handle acknowledgments and simple responses
        if (RESPONSE_PATTERNS.acknowledgment.test(queryLower)) {
            // Check previous message for context
            const prevMessage = previousMessages[0];
            if (prevMessage && prevMessage.role === 'assistant') {
                const response = "Would you like to:\n" +
                    "1. Filter these results by priority (high/medium/low)\n" +
                    "2. Filter by status (pending/in progress/resolved)\n" +
                    "3. Look for cases in a different location\n" +
                    "4. Start a new search\n" +
                    "\nPlease specify what you'd like to do.";

                await saveInteraction(req.user.id, query, response);
                return res.json({
                    response,
                    isAcknowledgment: true,
                    requiresFollowUp: true
                });
            }

            const response = "What would you like to know about the grievances? You can ask about:\n" +
                "1. Resource requirements in specific locations\n" +
                "2. Manpower needs for departments\n" +
                "3. High priority cases\n" +
                "4. Pending or in-progress cases";

            await saveInteraction(req.user.id, query, response);
            return res.json({
                response,
                isAcknowledgment: true
            });
        }

        // Handle greetings
        if (RESPONSE_PATTERNS.greeting.test(queryLower)) {
            const greeting = "Hello! I'm your smart query assistant. I can help you with:\n" +
                "1. Finding resource requirements for grievances\n" +
                "2. Checking manpower needs in specific locations\n" +
                "3. Filtering cases by priority or status\n" +
                "4. Getting detailed breakdowns by department\n\n" +
                "What would you like to know?";

            await saveInteraction(req.user.id, query, greeting);
            return res.json({
                response: greeting,
                isGreeting: true
            });
        }

        // Handle list requests without context
        if (RESPONSE_PATTERNS.listRequest.test(queryLower)) {
            const response = "Please specify what you'd like to list. For example:\n" +
                "- High priority cases in water department\n" +
                "- Resource requirements in tambaram\n" +
                "- Pending cases with manpower needs\n" +
                "- Cases in south division";

            await saveInteraction(req.user.id, query, response);
            return res.json({
                response,
                requiresSpecification: true
            });
        }

        // Get context from previous messages
        const context = await getQueryContext(req.user.id);

        // Initialize Gemini model
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const prompt = getQueryPrompt(query, context);

        // Get Gemini's analysis
        const result = await geminiModel.generateContent(prompt);
        const analysisText = result.response.text();
        console.log('Gemini Analysis:', analysisText);

        // Parse and validate the analysis
        const analysis = parseAndValidateAnalysis(analysisText);

        // Check if this is the same query as before
        const lastQuery = context.lastQuery?.toLowerCase();
        const currentQuery = query.toLowerCase();
        if (lastQuery && currentQuery &&
            (lastQuery === currentQuery ||
                (lastQuery.includes(currentQuery) || currentQuery.includes(lastQuery)))) {
            const response = "I notice you're repeating a similar query. Would you like to:\n" +
                "1. Filter the current results differently\n" +
                "2. Look for cases in a different location\n" +
                "3. Start a completely new search\n" +
                "\nPlease specify what you'd like to do.";

            await saveInteraction(req.user.id, query, response);
            return res.json({
                response,
                requiresSpecification: true
            });
        }

        // Build and execute MongoDB query
        const mongoQuery = await buildMongoQuery(analysis);
        console.log('MongoDB Query:', JSON.stringify(mongoQuery, null, 2));

        const db = mongoose.connection.db;
        let results;

        if (mongoQuery.isCount) {
            // Execute a count query
            const count = await db.collection(mongoQuery.collection)
                .countDocuments(mongoQuery.query);

            results = {
                isCount: true,
                count,
                countTarget: mongoQuery.countTarget
            };

            console.log(`Count query returned: ${count}`);
        } else if (mongoQuery.isStats) {
            // For stats queries, fetch the data and let the formatter handle aggregation
            const data = await db.collection(mongoQuery.collection)
                .find(mongoQuery.query)
                .toArray();

            results = data;

            // Also calculate and attach some basic aggregations
            if (mongoQuery.collection === 'grievances' && data.length > 0) {
                // Calculate total resource metrics if relevant
                const totalFunds = data.reduce((sum, grievance) => {
                    if (grievance.resourceManagement && grievance.resourceManagement.fundsRequired) {
                        return sum + grievance.resourceManagement.fundsRequired;
                    }
                    return sum;
                }, 0);

                const totalManpower = data.reduce((sum, grievance) => {
                    if (grievance.resourceManagement && grievance.resourceManagement.manpowerNeeded) {
                        return sum + grievance.resourceManagement.manpowerNeeded;
                    }
                    return sum;
                }, 0);

                results.totalFunds = totalFunds;
                results.totalManpower = totalManpower;
            }

            console.log(`Stats query found ${results.length} records`);
        } else {
            // Regular query
            results = await db.collection(mongoQuery.collection)
                .find(mongoQuery.query)
                .toArray();

            console.log(`Found ${results.length} results`);
        }

        // Generate response
        const finalResponse = await generateResponse(results, query, analysis);

        // Save interaction
        await saveInteraction(req.user.id, query, finalResponse);

        // Send response
        res.json({
            response: finalResponse
        });
    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({
            error: 'Failed to process your query',
            details: error.message
        });
    }
});

// Helper function to get query context
async function getQueryContext(userId) {
    const previousMessages = await Message.find({ userId })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean();

    const context = {
        department: null,
        division: null,
        district: null,
        taluk: null,
        lastQuery: null
    };

    for (const msg of previousMessages.reverse()) {
        if (msg.role === 'user') {
            const msgLower = msg.content.toLowerCase();

            // Update context based on message content
            for (const dept of VALID_DEPARTMENTS) {
                if (msgLower.includes(dept.toLowerCase())) {
                    context.department = dept;
                }
            }

            for (const div of VALID_DIVISIONS) {
                if (msgLower.includes(div.toLowerCase())) {
                    context.division = div;
                }
            }

            for (const dist of VALID_DISTRICTS) {
                if (msgLower.includes(dist.toLowerCase())) {
                    context.district = dist;
                }
            }

            for (const [district, taluks] of Object.entries(VALID_TALUKS)) {
                for (const taluk of taluks) {
                    if (msgLower.includes(taluk.toLowerCase())) {
                        context.taluk = taluk;
                        if (!context.district) context.district = district;
                    }
                }
            }

            context.lastQuery = msg.content;
        }
    }

    return context;
}

// Helper function to parse and validate analysis
function parseAndValidateAnalysis(analysisText) {
    try {
        // Extract JSON object from text, accounting for potential text wrapping around JSON
        const jsonMatch = analysisText.match(/({[\s\S]*})/);
        if (!jsonMatch) {
            throw new Error('Could not find JSON object in Gemini response');
        }

        const jsonText = jsonMatch[1];
        const analysis = JSON.parse(jsonText);

        if (!analysis.intent) {
            throw new Error('Invalid analysis: missing intent');
        }

        if (!analysis.params) {
            analysis.params = {};
        }

        // Normalize intent and parameter values
        analysis.intent = analysis.intent.toLowerCase();

        // Validate intent type
        const validIntents = [
            'case_query',
            'resource_query',
            'manpower_query',
            'count_query',
            'stats_query',
            'official_info',
            'case_lookup',
            'grievance_query',
            'official_query',
            'official_stats',
            'location_stats',
            'department_stats'
        ];

        if (!validIntents.includes(analysis.intent)) {
            console.warn(`Unexpected intent type: ${analysis.intent}. Defaulting to case_query.`);
            analysis.intent = 'case_query';
        }

        // Normalize and validate parameters
        if (analysis.params.department) {
            const departmentInput = analysis.params.department.charAt(0).toUpperCase() +
                analysis.params.department.slice(1).toLowerCase();

            if (VALID_DEPARTMENTS.includes(departmentInput)) {
                analysis.params.department = departmentInput;
            } else {
                console.warn(`Invalid department: ${analysis.params.department}`);
                delete analysis.params.department;
            }
        }

        if (analysis.params.division) {
            const divisionInput = analysis.params.division.charAt(0).toUpperCase() +
                analysis.params.division.slice(1).toLowerCase();

            if (VALID_DIVISIONS.includes(divisionInput)) {
                analysis.params.division = divisionInput;
            } else {
                console.warn(`Invalid division: ${analysis.params.division}`);
                delete analysis.params.division;
            }
        }

        if (analysis.params.district) {
            // Try to find a case-insensitive match with the valid districts
            const districtInput = analysis.params.district;
            const matchedDistrict = VALID_DISTRICTS.find(d =>
                d.toLowerCase() === districtInput.toLowerCase());

            if (matchedDistrict) {
                analysis.params.district = matchedDistrict;
            } else {
                console.warn(`Invalid district: ${analysis.params.district}`);
                delete analysis.params.district;
            }
        }

        if (analysis.params.taluk) {
            // Try to find a case-insensitive match with the valid taluks
            const talukInput = analysis.params.taluk;
            const matchedTaluk = VALID_TALUKS.find(t =>
                t.toLowerCase() === talukInput.toLowerCase());

            if (matchedTaluk) {
                analysis.params.taluk = matchedTaluk;
            } else {
                console.warn(`Invalid taluk: ${analysis.params.taluk}`);
                delete analysis.params.taluk;
            }
        }

        // Normalize status and priority fields
        if (analysis.params.status) {
            const statusInput = analysis.params.status.charAt(0).toUpperCase() +
                analysis.params.status.slice(1).toLowerCase();

            if (VALID_STATUSES.includes(statusInput)) {
                analysis.params.status = statusInput;
            } else {
                console.warn(`Invalid status: ${analysis.params.status}`);
                delete analysis.params.status;
            }
        }

        if (analysis.params.priority) {
            const priorityInput = analysis.params.priority.charAt(0).toUpperCase() +
                analysis.params.priority.slice(1).toLowerCase();

            if (VALID_PRIORITIES.includes(priorityInput)) {
                analysis.params.priority = priorityInput;
            } else {
                console.warn(`Invalid priority: ${analysis.params.priority}`);
                delete analysis.params.priority;
            }
        }

        // Handle count_query and stats_query parameter validation
        if (analysis.intent === 'count_query' && !analysis.params.countTarget) {
            // Default to counting cases if not specified
            analysis.params.countTarget = 'cases';
        }

        // Handle case_lookup validation
        if (analysis.intent === 'case_lookup' && !analysis.params.caseId && analysis.params.searchValue) {
            // Try to extract an ID from the search value
            const idMatch = analysis.params.searchValue.match(/(\w+\d+)/);
            if (idMatch) {
                analysis.params.caseId = idMatch[1];
            }
        }

        return analysis;
    } catch (error) {
        console.error('Error parsing Gemini analysis:', error, '\nOriginal text:', analysisText);

        // Return a default analysis
        return {
            intent: 'case_query',
            params: {}
        };
    }
}

// Helper function to extract values from text
function extractFromText(text, regex) {
    const match = text.match(regex);
    return match ? match[1] : null;
}

// Helper function to save user interactions
async function saveInteraction(userId, query, response) {
    await Promise.all([
        Message.create({
            userId,
            role: 'user',
            content: query,
            timestamp: new Date()
        }),
        Message.create({
            userId,
            role: 'assistant',
            content: response,
            timestamp: new Date()
        })
    ]);
}

// Function to build MongoDB query based on intent and parameters
async function buildMongoQuery(analysis) {
    const { intent, params } = analysis;
    let query = {};

    // Normalize parameters (case-insensitive)
    const department = params.department?.toLowerCase();
    const division = params.division?.toLowerCase();
    const district = params.district?.toLowerCase();
    const taluk = params.taluk?.toLowerCase();
    const priority = params.priority?.toLowerCase();
    const status = params.status?.toLowerCase();
    const caseId = params.caseId?.trim();
    const countTarget = params.countTarget?.toLowerCase();

    // Build location filters (reused across multiple query types)
    const locationFilters = {};
    if (department) {
        locationFilters.department = { $regex: `^${department}$`, $options: 'i' };
    }
    if (division) {
        locationFilters.division = { $regex: `^${division}$`, $options: 'i' };
    }
    if (district) {
        locationFilters.district = { $regex: `^${district}$`, $options: 'i' };
    }
    if (taluk) {
        locationFilters.taluk = { $regex: `^${taluk}$`, $options: 'i' };
    }

    // Build status and priority filters (reused across multiple query types)
    const conditionFilters = {};
    if (priority) {
        conditionFilters.priority = { $regex: `^${priority}$`, $options: 'i' };
    }
    if (status) {
        conditionFilters.status = { $regex: `^${status}$`, $options: 'i' };
    }

    // Handle different types of queries
    switch (intent) {
        case 'count_query':
            // For count queries, we just need the right filters based on what's being counted
            query = { ...locationFilters, ...conditionFilters };

            // Apply specific filters based on what's being counted
            if (countTarget === 'resources' || countTarget === 'funds') {
                query['resourceManagement.fundsRequired'] = { $exists: true };
            } else if (countTarget === 'manpower') {
                query['resourceManagement.manpowerNeeded'] = { $exists: true };
            }

            console.log('Count Query:', JSON.stringify(query, null, 2));

            // Count queries use the right collection based on what's being counted
            if (countTarget === 'officials' || countTarget === 'staff' || countTarget === 'employees') {
                return { collection: 'officials', query, isCount: true, countTarget };
            }

            return { collection: 'grievances', query, isCount: true, countTarget };

        case 'stats_query':
            // Similar to count query but with aggregation flags
            query = { ...locationFilters, ...conditionFilters };

            console.log('Stats Query:', JSON.stringify(query, null, 2));
            return { collection: 'grievances', query, isStats: true, statsTarget: params.searchValue };

        case 'official_info':
            query = {};

            // Convert department filters for officials collection
            if (department) {
                query.department = { $regex: `^${department}$`, $options: 'i' };
            }

            // Handle other location filters that might apply to officials
            if (division) {
                query.jurisdiction = { $regex: division, $options: 'i' };
            }
            if (district) {
                query.jurisdiction = query.jurisdiction || {};
                query.jurisdiction.$regex = district;
                query.jurisdiction.$options = 'i';
            }
            if (taluk) {
                query.jurisdiction = query.jurisdiction || {};
                query.jurisdiction.$regex = taluk;
                query.jurisdiction.$options = 'i';
            }

            // Handle role/designation filters
            if (params.searchValue) {
                query.designation = { $regex: params.searchValue, $options: 'i' };
            }

            console.log('Official Info Query:', JSON.stringify(query, null, 2));
            return { collection: 'officials', query };

        case 'case_lookup':
            // For case lookup by ID
            if (caseId) {
                // Try to match either the _id (if it's a valid ObjectId) or the petitionId
                try {
                    const objectId = new mongoose.Types.ObjectId(caseId);
                    query = { $or: [{ _id: objectId }, { petitionId: caseId }] };
                } catch (e) {
                    // If not a valid ObjectId, just search by petitionId
                    query = { petitionId: caseId };
                }
            } else if (params.searchValue) {
                // If no direct ID but some search value, try to match against petitionId
                query = { petitionId: { $regex: params.searchValue, $options: 'i' } };
            }

            console.log('Case Lookup Query:', JSON.stringify(query, null, 2));
            return { collection: 'grievances', query };

        case 'case_query':
            // For case queries, we just apply the filters without requiring resource management
            query = { ...locationFilters, ...conditionFilters };

            console.log('Case Query:', JSON.stringify(query, null, 2));
            break;

        case 'resource_query':
        case 'manpower_query':
            // Base query for resources
            query = {
                'resourceManagement': { $exists: true },
                ...locationFilters,
                ...conditionFilters
            };

            // Add specific resource type conditions
            if (intent === 'manpower_query' || params.searchValue?.toLowerCase().includes('manpower')) {
                query['resourceManagement.manpowerNeeded'] = { $exists: true, $gt: 0 };
            }
            if (params.searchValue?.toLowerCase().includes('fund')) {
                query['resourceManagement.fundsRequired'] = { $exists: true, $gt: 0 };
            }

            console.log('Resource Query:', JSON.stringify(query, null, 2));
            break;

        case 'grievance_query':
            if (params.searchType === 'id') {
                query.petitionId = params.searchValue;
            } else if (params.searchType === 'title') {
                query.title = { $regex: params.searchValue, $options: 'i' };
            }
            break;

        case 'official_query':
            if (params.searchType === 'id') {
                return { collection: 'officials', query: { employeeId: params.searchValue } };
            } else if (params.designation) {
                return { collection: 'officials', query: { designation: params.designation } };
            }
            break;

        case 'official_stats':
        case 'location_stats':
        case 'department_stats':
            return { collection: 'grievances', query: {} };
    }

    // Handle date range
    if (params.dateRange && (params.dateRange.start || params.dateRange.end)) {
        query.createdAt = {};
        if (params.dateRange.start) query.createdAt.$gte = new Date(params.dateRange.start);
        if (params.dateRange.end) query.createdAt.$lte = new Date(params.dateRange.end);
    }

    return { collection: 'grievances', query };
}

// Function to generate response based on results and intent
async function generateResponse(results, query, analysis) {
    try {
        const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        switch (analysis.intent) {
            case 'grievance_query':
            case 'case_query':
                return formatGrievanceResponse(results);

            case 'official_query':
            case 'official_info':
                return formatOfficialResponse(results);

            case 'count_query':
                return formatCountResponse(results, analysis);

            case 'stats_query':
                return formatStatsResponse(results, analysis);

            case 'case_lookup':
                return formatCaseLookupResponse(results);

            case 'resource_query':
            case 'manpower_query':
                return formatResourceResponse(results, analysis.intent, analysis);

            case 'official_stats':
            case 'location_stats':
            case 'department_stats':
                return formatStatsResponse(results, analysis);

            default:
                // Use Gemini for natural language response
                const responsePrompt = `Generate a response for:
                Query: "${query}"
                Intent: ${analysis.intent}
                Results: ${JSON.stringify(results)}
                
                Format the response in a clear, natural way.`;

                const result = await geminiModel.generateContent(responsePrompt);
                return result.response.text();
        }
    } catch (error) {
        console.error('Error generating response:', error);
        return generateBasicResponse(results, query, analysis);
    }
}

// Helper function to format count response
function formatCountResponse(results, analysis) {
    try {
        const { params } = analysis;
        const countTarget = params.countTarget?.toLowerCase() || 'cases';
        const department = params.department || 'all departments';
        const location = params.district ?
            `${params.district}${params.division ? ` - ${params.division} Division` : ''}` :
            (params.taluk ? params.taluk : 'all locations');

        // If this is an isCount query from MongoDB
        if (results && results.isCount) {
            return `Total ${countTarget} in ${department} (${location}): ${results.count || 0}`;
        }

        // If results is null or undefined
        if (!results || !Array.isArray(results)) {
            return `No ${countTarget} found matching your criteria.`;
        }

        // For regular result sets that need to be counted
        const count = results.length;

        if (count === 0) {
            return `No ${countTarget} found matching your criteria.`;
        }

        let response = `Found ${count} ${countTarget} in ${department} (${location})`;

        // Add status info if relevant
        if (params.status) {
            response += ` with status "${params.status}"`;
        }

        // Add priority info if relevant
        if (params.priority) {
            response += ` and priority "${params.priority}"`;
        }

        return response;
    } catch (error) {
        console.error('Error formatting count response:', error);
        return `Total count: ${results && results.isCount ? results.count : (Array.isArray(results) ? results.length : 0)}`;
    }
}

// Helper function for case lookup
function formatCaseLookupResponse(results) {
    if (results.length === 0) {
        return "No case found with that ID. Please verify the case ID and try again.";
    }

    if (results.length > 1) {
        return "Multiple cases matched your query. Please provide a more specific case ID.";
    }

    const grievance = results[0];
    let response = `Case Details for Petition ID: ${grievance.petitionId}\n\n`;
    response += `Title: ${grievance.title}\n`;
    response += `Department: ${grievance.department}\n`;
    response += `Location: ${grievance.district || ''} ${grievance.division ? '- ' + grievance.division + ' Division' : ''}\n`;
    response += `Status: ${grievance.status}, Priority: ${grievance.priority}\n\n`;

    if (grievance.description) {
        response += `Description: ${grievance.description}\n\n`;
    }

    if (grievance.assignedTo) {
        response += `Assigned To: ${typeof grievance.assignedTo === 'object' ?
            `${grievance.assignedTo.firstName || ''} ${grievance.assignedTo.lastName || ''}`.trim() :
            'Official ID: ' + grievance.assignedTo}\n`;
    }

    if (grievance.resourceManagement) {
        response += `\nResource Requirements:\n`;
        response += `- Funds Required: ₹${grievance.resourceManagement.fundsRequired.toLocaleString()}\n`;
        response += `- Manpower Needed: ${grievance.resourceManagement.manpowerNeeded} personnel\n`;
        response += `- Requirements: ${grievance.resourceManagement.requirementsNeeded}\n`;
    }

    if (grievance.createdAt) {
        response += `\nCreated: ${new Date(grievance.createdAt).toLocaleDateString()}\n`;
    }

    if (grievance.updatedAt) {
        response += `Last Updated: ${new Date(grievance.updatedAt).toLocaleDateString()}\n`;
    }

    return response;
}

// Helper function to format grievance response
function formatGrievanceResponse(results) {
    if (results.length === 0) return "No grievances found matching your criteria.";

    let response = "";
    results.forEach((g, index) => {
        response += `${index + 1}. Petition ID: ${g.petitionId}\n`;
        response += `   Title: ${g.title}\n`;
        response += `   Department: ${g.department}\n`;
        response += `   Location: ${g.district} - ${g.division} Division\n`;
        response += `   Status: ${g.status}, Priority: ${g.priority}\n`;
        if (g.resourceManagement) {
            response += `   Resource Requirements:\n`;
            response += `   - Funds Required: ₹${g.resourceManagement.fundsRequired.toLocaleString()}\n`;
            response += `   - Manpower Needed: ${g.resourceManagement.manpowerNeeded} personnel\n`;
            response += `   - Requirements: ${g.resourceManagement.requirementsNeeded}\n`;
        }
        response += '\n';
    });

    return response;
}

// Helper function to format official response
function formatOfficialResponse(results) {
    if (results.length === 0) return "No officials found matching your criteria.";

    let response = "";

    // If this is just a count query about officials
    if (typeof results.count !== 'undefined') {
        return `Total officials found: ${results.count}`;
    }

    response = `Found ${results.length} officials:\n\n`;
    results.forEach((o, index) => {
        response += `${index + 1}. ${o.designation} ${o.firstName} ${o.lastName}\n`;
        response += `   Employee ID: ${o.employeeId}\n`;
        response += `   Department: ${o.department}\n`;
        response += `   Contact: ${o.phone}, ${o.email}\n`;
        response += `   Office: ${o.officeAddress}, ${o.city}\n`;
        response += '\n';
    });

    return response;
}

// Enhanced stats response function
function formatStatsResponse(results, analysis) {
    try {
        if (!results || (Array.isArray(results) && results.length === 0)) {
            return "No data found matching your criteria.";
        }

        // Process for count-style queries with isCount flag
        if (results.isCount) {
            return `Total count: ${results.count || 0}`;
        }

        // Process for stats-style queries
        const { params } = analysis;
        const statsTarget = params.statsTarget || params.countTarget || 'cases';
        const department = params.department || 'all departments';

        // Calculate various statistics
        const stats = calculateAnalytics(results, params);

        let response = `Statistics for ${statsTarget} in ${department}:\n\n`;
        response += `Total records: ${Array.isArray(results) ? results.length : 0}\n\n`;

        // Department breakdown
        if (stats.byDepartment && Object.keys(stats.byDepartment).length > 0) {
            response += "By Department:\n";
            for (const [dept, count] of Object.entries(stats.byDepartment)) {
                response += `- ${dept}: ${count}\n`;
            }
            response += "\n";
        }

        // Status breakdown
        if (stats.byStatus && Object.keys(stats.byStatus).length > 0) {
            response += "By Status:\n";
            for (const [status, count] of Object.entries(stats.byStatus)) {
                response += `- ${status}: ${count}\n`;
            }
            response += "\n";
        }

        // Priority breakdown
        if (stats.byPriority && Object.keys(stats.byPriority).length > 0) {
            response += "By Priority:\n";
            for (const [priority, count] of Object.entries(stats.byPriority)) {
                response += `- ${priority}: ${count}\n`;
            }
            response += "\n";
        }

        // Location breakdown
        if (stats.byLocation && Object.keys(stats.byLocation).length > 0) {
            response += "By Location:\n";
            for (const [location, count] of Object.entries(stats.byLocation)) {
                response += `- ${location}: ${count}\n`;
            }
            response += "\n";
        }

        // Resource metrics when applicable
        if ((stats.totalFunds !== undefined && stats.totalFunds > 0) ||
            (stats.totalManpower !== undefined && stats.totalManpower > 0)) {
            response += "Resource Metrics:\n";
            if (stats.totalFunds !== undefined && stats.totalFunds > 0) {
                response += `- Total Funds Required: ₹${stats.totalFunds.toLocaleString()}\n`;
            }
            if (stats.totalManpower !== undefined && stats.totalManpower > 0) {
                response += `- Total Manpower Needed: ${stats.totalManpower} personnel\n`;
            }
            response += "\n";
        }

        return response;
    } catch (error) {
        console.error('Error formatting stats response:', error);
        return `Statistics summary: Found ${Array.isArray(results) ? results.length : 0} records matching your criteria.`;
    }
}

// Helper function to format resource response
function formatResourceResponse(results, intent, analysis) {
    if (results.length === 0) {
        let message = "No resource requirements found matching your criteria.";
        if (analysis.params.priority) {
            message += ` (Priority: ${analysis.params.priority})`;
        }
        if (analysis.params.status) {
            message += ` (Status: ${analysis.params.status})`;
        }
        return message;
    }

    // Group results by location
    const groupedResults = {};
    let totalManpower = 0;
    let totalFunds = 0;

    results.forEach(grievance => {
        const location = [
            grievance.district,
            grievance.division,
            grievance.taluk
        ].filter(Boolean).join(' - ');

        if (!groupedResults[location]) {
            groupedResults[location] = {
                cases: [],
                totalManpower: 0,
                totalFunds: 0,
                requirements: new Set()
            };
        }

        const group = groupedResults[location];
        const resources = grievance.resourceManagement || {};

        group.cases.push({
            id: grievance.petitionId,
            title: grievance.title,
            status: grievance.status,
            priority: grievance.priority,
            manpower: resources.manpowerNeeded || 0,
            funds: resources.fundsRequired || 0,
            requirements: resources.requirementsNeeded
        });

        group.totalManpower += resources.manpowerNeeded || 0;
        group.totalFunds += resources.fundsRequired || 0;
        if (resources.requirementsNeeded) {
            resources.requirementsNeeded.split(',').forEach(req =>
                group.requirements.add(req.trim())
            );
        }

        totalManpower += resources.manpowerNeeded || 0;
        totalFunds += resources.fundsRequired || 0;
    });

    // Generate detailed response
    let response = `Found ${results.length} grievance(s)`;
    if (analysis.params.priority) {
        response += ` with ${analysis.params.priority} priority`;
    }
    if (analysis.params.status) {
        response += ` in ${analysis.params.status} status`;
    }
    response += ':\n\n';

    // Location-wise breakdown
    Object.entries(groupedResults).forEach(([location, data]) => {
        response += `${location}:\n`;
        response += `Total Requirements:\n`;
        response += `- Manpower Needed: ${data.totalManpower} personnel\n`;
        response += `- Funds Required: ₹${data.totalFunds.toLocaleString()}\n`;
        if (data.requirements.size > 0) {
            response += `- Equipment/Materials: ${Array.from(data.requirements).join(', ')}\n`;
        }

        response += '\nGrievance Details:\n';
        data.cases.forEach((case_, index) => {
            response += `${index + 1}. Case #${case_.id}: ${case_.title}\n`;
            response += `   Status: ${case_.status}, Priority: ${case_.priority}\n`;
            if (case_.manpower > 0) {
                response += `   - Manpower: ${case_.manpower} personnel\n`;
            }
            if (case_.funds > 0) {
                response += `   - Funds: ₹${case_.funds.toLocaleString()}\n`;
            }
            if (case_.requirements) {
                response += `   - Requirements: ${case_.requirements}\n`;
            }
        });
        response += '\n';
    });

    // Overall summary
    response += '\nOverall Summary:\n';
    response += `- Total Manpower Required: ${totalManpower} personnel\n`;
    response += `- Total Funds Required: ₹${totalFunds.toLocaleString()}\n`;
    response += `- Number of Locations: ${Object.keys(groupedResults).length}\n`;

    // Add relevant suggestions based on current query
    response += '\nYou can also:\n';
    if (!analysis.params.priority) {
        response += '1. Filter by priority (high/medium/low)\n';
    }
    if (!analysis.params.status) {
        response += '2. Filter by status (pending/in progress/resolved/escalated)\n';
    }
    if (!analysis.params.division) {
        response += '3. Filter by specific division\n';
    }
    if (!analysis.params.district) {
        response += '4. Filter by specific district\n';
    }

    return response;
}

// Fallback function for basic response generation
function generateBasicResponse(results, query, analysis) {
    if (results.length === 0) {
        return "I couldn't find any records matching your criteria. Would you like to try a different search?";
    }

    const { intent, params } = analysis;
    let response = `Found ${results.length} record(s)`;

    if (params.department) {
        response += ` in the ${params.department} department`;
    }
    if (params.district) {
        response += ` from ${params.district}`;
        if (params.division) {
            response += ` - ${params.division} division`;
        }
    }
    response += ".\n\n";

    // Add a basic summary based on the first few results
    const previewCount = Math.min(3, results.length);
    response += `Here are the first ${previewCount}:\n`;

    for (let i = 0; i < previewCount; i++) {
        const item = results[i];
        if (item.petitionId) {
            // It's a grievance
            response += `${i + 1}. Petition ${item.petitionId}: ${item.title}\n`;
            response += `   Status: ${item.status}, Priority: ${item.priority}\n`;
        } else if (item.employeeId) {
            // It's an official
            response += `${i + 1}. ${item.designation} ${item.firstName} ${item.lastName}\n`;
            response += `   Department: ${item.department}\n`;
        }
    }

    if (results.length > previewCount) {
        response += `\n... and ${results.length - previewCount} more.`;
    }

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

// Route to clear message history
router.delete('/messages', async (req, res) => {
    try {
        console.log('Clearing messages for user:', req.user.id);
        const userId = req.user.id;
        const result = await Message.deleteMany({ userId });
        console.log('Delete result:', result);
        res.json({
            success: true,
            message: 'Chat history cleared',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error clearing messages:', error);
        res.status(500).json({
            error: 'Failed to clear message history',
            details: error.message
        });
    }
});

export default router; 