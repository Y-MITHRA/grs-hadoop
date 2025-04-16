import express from 'express';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import { JWT_SECRET, JWT_OPTIONS } from '../config/jwt.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
const VALID_DEPARTMENTS = ['Water', 'Electricity', 'RTO', 'Health', 'Education'];
const VALID_DIVISIONS = ['North', 'South', 'East', 'West', 'Central'];
const VALID_DISTRICTS = ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Trichy', 'Tirunelveli'];
const VALID_TALUKS = {
    'Chennai': ['Egmore', 'Mylapore', 'T.Nagar', 'Aminjikarai'],
    'Coimbatore': ['Coimbatore North', 'Coimbatore South', 'Mettupalayam', 'Pollachi'],
    'Madurai': ['Madurai East', 'Madurai West', 'Melur', 'Peraiyur']
};
const VALID_PRIORITIES = ['High', 'Medium', 'Low'];
const VALID_STATUSES = ['Pending', 'In Progress', 'Resolved', 'Escalated'];
const VALID_DESIGNATIONS = ['Manager', 'Officer', 'Supervisor', 'Assistant'];

// Analytics functions
const calculateAnalytics = (results, params) => {
    const analytics = {
        total: results.length,
        byStatus: {},
        byPriority: {},
        byDepartment: {},
        byDivision: {},
        byDistrict: {},
        byTaluk: {},
        percentages: {},
        trends: {
            daily: {},
            weekly: {},
            monthly: {}
        },
        averageResolutionTime: 0,
        escalationRate: 0
    };

    // Calculate counts and percentages
    results.forEach(grievance => {
        // Status analytics
        analytics.byStatus[grievance.status] = (analytics.byStatus[grievance.status] || 0) + 1;

        // Priority analytics
        analytics.byPriority[grievance.priority] = (analytics.byPriority[grievance.priority] || 0) + 1;

        // Location analytics
        if (grievance.department) analytics.byDepartment[grievance.department] = (analytics.byDepartment[grievance.department] || 0) + 1;
        if (grievance.division) analytics.byDivision[grievance.division] = (analytics.byDivision[grievance.division] || 0) + 1;
        if (grievance.district) analytics.byDistrict[grievance.district] = (analytics.byDistrict[grievance.district] || 0) + 1;
        if (grievance.taluk) analytics.byTaluk[grievance.taluk] = (analytics.byTaluk[grievance.taluk] || 0) + 1;

        // Calculate resolution time if resolved
        if (grievance.status === 'Resolved' && grievance.resolvedAt) {
            const resolutionTime = new Date(grievance.resolvedAt) - new Date(grievance.createdAt);
            analytics.averageResolutionTime += resolutionTime;
        }

        // Track escalations
        if (grievance.escalatedAt) {
            analytics.escalationRate++;
        }

        // Track trends
        const createdDate = new Date(grievance.createdAt);
        const dateKey = createdDate.toISOString().split('T')[0];
        const weekKey = `${createdDate.getFullYear()}-W${Math.ceil((createdDate.getDate() + createdDate.getDay()) / 7)}`;
        const monthKey = `${createdDate.getFullYear()}-${createdDate.getMonth() + 1}`;

        analytics.trends.daily[dateKey] = (analytics.trends.daily[dateKey] || 0) + 1;
        analytics.trends.weekly[weekKey] = (analytics.trends.weekly[weekKey] || 0) + 1;
        analytics.trends.monthly[monthKey] = (analytics.trends.monthly[monthKey] || 0) + 1;
    });

    // Calculate percentages
    if (results.length > 0) {
        analytics.percentages.byStatus = {};
        analytics.percentages.byPriority = {};
        analytics.percentages.byDepartment = {};
        analytics.percentages.byDivision = {};
        analytics.percentages.byDistrict = {};

        Object.entries(analytics.byStatus).forEach(([status, count]) => {
            analytics.percentages.byStatus[status] = (count / results.length * 100).toFixed(2) + '%';
        });

        Object.entries(analytics.byPriority).forEach(([priority, count]) => {
            analytics.percentages.byPriority[priority] = (count / results.length * 100).toFixed(2) + '%';
        });

        Object.entries(analytics.byDepartment).forEach(([dept, count]) => {
            analytics.percentages.byDepartment[dept] = (count / results.length * 100).toFixed(2) + '%';
        });

        Object.entries(analytics.byDivision).forEach(([div, count]) => {
            analytics.percentages.byDivision[div] = (count / results.length * 100).toFixed(2) + '%';
        });

        Object.entries(analytics.byDistrict).forEach(([dist, count]) => {
            analytics.percentages.byDistrict[dist] = (count / results.length * 100).toFixed(2) + '%';
        });

        // Calculate averages
        analytics.averageResolutionTime = analytics.averageResolutionTime / results.filter(g => g.status === 'Resolved').length;
        analytics.escalationRate = (analytics.escalationRate / results.length * 100).toFixed(2) + '%';
    }

    return analytics;
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

For resource and manpower queries, extract:
1. Location details (department, division, district, taluk)
2. Resource type (manpower, funds, or both)
3. Priority level if specified
4. Status if specified
5. Any specific conditions or filters

Respond with a JSON object:
{
  "intent": "manpower_query|resource_query",
  "params": {
    "department": "string or null",
    "division": "string or null",
    "district": "string or null",
    "taluk": "string or null",
    "priority": "high|medium|low|null",
    "status": "pending|in progress|resolved|escalated|null",
    "searchValue": "string describing resource type",
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
        const results = await db.collection(mongoQuery.collection)
            .find(mongoQuery.query)
            .toArray();

        console.log(`Found ${results.length} results`);

        // Generate response
        const finalResponse = await generateResponse(results, query, analysis);

        // Save interaction
        await saveInteraction(req.user.id, query, finalResponse);

        // Send response
        res.json({
            response: finalResponse,
            analysis: analysis,
            resultCount: results.length,
            hasFilters: !!(analysis.params.priority || analysis.params.status ||
                analysis.params.department || analysis.params.division ||
                analysis.params.district || analysis.params.taluk)
        });

    } catch (error) {
        console.error('Error processing query:', error);
        res.status(500).json({
            error: 'Failed to process query',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No valid JSON found in Gemini response');
        }

        const analysis = JSON.parse(jsonMatch[0]);

        if (!analysis.intent || !analysis.params) {
            throw new Error('Invalid analysis structure: missing intent or params');
        }

        // Normalize location parameters
        if (analysis.params.department) {
            analysis.params.department = analysis.params.department.trim();
        }
        if (analysis.params.division) {
            analysis.params.division = analysis.params.division.trim();
        }
        if (analysis.params.district) {
            analysis.params.district = analysis.params.district.trim();
        }
        if (analysis.params.taluk) {
            analysis.params.taluk = analysis.params.taluk.trim();
        }

        return analysis;
    } catch (error) {
        throw new Error(`Failed to parse query analysis: ${error.message}`);
    }
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

    // Handle different types of queries
    switch (intent) {
        case 'resource_query':
        case 'manpower_query':
            // Base query for resources
            query = {
                'resourceManagement': { $exists: true }
            };

            // Add specific resource type conditions
            if (intent === 'manpower_query' || params.searchValue?.toLowerCase().includes('manpower')) {
                query['resourceManagement.manpowerNeeded'] = { $exists: true, $gt: 0 };
            }
            if (params.searchValue?.toLowerCase().includes('fund')) {
                query['resourceManagement.fundsRequired'] = { $exists: true, $gt: 0 };
            }

            // Add location-based filters (case-insensitive)
            if (department) {
                query.department = { $regex: `^${department}$`, $options: 'i' };
            }
            if (division) {
                query.division = { $regex: `^${division}$`, $options: 'i' };
            }
            if (district) {
                query.district = { $regex: `^${district}$`, $options: 'i' };
            }
            if (taluk) {
                query.taluk = { $regex: `^${taluk}$`, $options: 'i' };
            }

            // Add priority filter
            if (priority) {
                query.priority = { $regex: `^${priority}$`, $options: 'i' };
            }

            // Add status filter
            if (status) {
                query.status = { $regex: `^${status}$`, $options: 'i' };
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
                return formatGrievanceResponse(results);

            case 'official_query':
                return formatOfficialResponse(results);

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

// Helper function to format stats response
function formatStatsResponse(results, analysis) {
    const stats = {
        total: results.length,
        byDepartment: {},
        byLocation: {},
        byDesignation: {}
    };

    results.forEach(item => {
        // Count by department
        stats.byDepartment[item.department] = (stats.byDepartment[item.department] || 0) + 1;

        // Count by location
        const location = `${item.district} - ${item.division}`;
        stats.byLocation[location] = (stats.byLocation[location] || 0) + 1;

        // Count by designation (for officials)
        if (item.designation) {
            stats.byDesignation[item.designation] = (stats.byDesignation[item.designation] || 0) + 1;
        }
    });

    let response = `Found ${results.length} records\n\n`;

    if (Object.keys(stats.byDepartment).length > 0) {
        response += "Distribution by Department:\n";
        Object.entries(stats.byDepartment).forEach(([dept, count]) => {
            response += `- ${dept}: ${count}\n`;
        });
        response += '\n';
    }

    if (Object.keys(stats.byLocation).length > 0) {
        response += "Distribution by Location:\n";
        Object.entries(stats.byLocation).forEach(([loc, count]) => {
            response += `- ${loc}: ${count}\n`;
        });
        response += '\n';
    }

    if (Object.keys(stats.byDesignation).length > 0) {
        response += "Distribution by Designation:\n";
        Object.entries(stats.byDesignation).forEach(([desig, count]) => {
            response += `- ${desig}: ${count}\n`;
        });
    }

    return response;
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