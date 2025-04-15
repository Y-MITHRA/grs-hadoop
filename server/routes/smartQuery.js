import express from 'express';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import { JWT_SECRET, JWT_OPTIONS } from '../config/jwt.js';
import { classifyIntent, extractParameters, INTENTS, generateResponse as generateLLMResponse } from '../llm/intentClassifier.js';
import { generateMongoQuery } from '../llm/queryGenerator.js';
import { handleIntent } from '../intents/handlers.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Add authentication middleware to all routes
router.use(auth);

// Route handler for processing queries
router.post('/query', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Connect to MongoDB
        const client = await MongoClient.connect(process.env.MONGODB_URI);
        const database = client.db('grievance_portal');
        const collection = database.collection('grievances');

        // Get previous messages for context
        const userId = req.user.id;
        const previousMessages = await Message.find({ userId })
            .sort({ timestamp: -1 })
            .limit(5)
            .lean();

        // Build context from previous messages
        const context = previousMessages.reverse().map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        // Classify intent
        const intent = await classifyIntent(query);
        console.log('Detected intent:', intent);

        // Extract parameters
        const parameters = extractParameters(query, intent);
        console.log('Extracted parameters:', parameters);

        let results;
        let mongoQuery;

        if (intent === INTENTS.CUSTOM_QUERY) {
            // Generate dynamic MongoDB query
            mongoQuery = await generateMongoQuery(query, intent, parameters);
            console.log('Generated MongoDB query:', JSON.stringify(mongoQuery, null, 2));

            // Execute the query
            results = await collection.find(mongoQuery)
                .project({ _id: 0, __v: 0 })
                .sort({ createdAt: -1 })
                .toArray();
        } else {
            // Use predefined handler for known intents
            const handlerResult = await handleIntent(intent, parameters, collection);
            results = handlerResult.results;
            mongoQuery = parameters; // Use parameters as the query for known intents
        }

        console.log('Query results:', JSON.stringify(results, null, 2));

        // Generate response using LLM
        const response = await generateLLMResponse(query, intent, results, parameters, context);

        // Save messages
        if (response) {
            await Message.create({
                userId: req.user.id,
                content: query,
                role: 'user'
            });

            await Message.create({
                userId: req.user.id,
                content: response,
                role: 'assistant'
            });
        }

        res.json({
            success: true,
            response
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

// Get message history
router.get('/messages', async (req, res) => {
    try {
        const userId = req.user.id;
        const messages = await Message.find({ userId })
            .sort({ timestamp: -1 })
            .limit(50)
            .lean();

        res.json({
            success: true,
            messages: messages.reverse()
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch message history'
        });
    }
});

// Delete all messages for a user
router.delete('/messages', async (req, res) => {
    try {
        const userId = req.user.id;
        await Message.deleteMany({ userId });

        res.json({
            success: true,
            message: 'Chat history cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing messages:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clear chat history'
        });
    }
});

// Helper function to generate natural language response
function generateResponse(results, query, intent, parameters) {
    if (!results || results.length === 0) {
        return 'No matching cases found.';
    }

    const queryLower = query.toLowerCase();
    let response = '';

    switch (intent) {
        case INTENTS.GREETING:
            response = 'Hello! I\'m your Grievance Redressal System assistant. How can I help you today?';
            break;

        case INTENTS.THANKS:
            response = 'You\'re welcome! Is there anything else I can help you with?';
            break;

        case INTENTS.HELP:
            response = 'I can help you with:\n' +
                '1. Checking the status of your grievances\n' +
                '2. Finding information about resource requirements\n' +
                '3. Analyzing priority levels of cases\n' +
                '4. Providing escalation summaries\n' +
                '5. Getting detailed information about specific grievances\n\n' +
                'Just ask me what you need to know!';
            break;

        case INTENTS.STATUS_QUERY:
            response = `Found ${results.length} ${parameters.status || ''} case${results.length !== 1 ? 's' : ''}`;
            if (parameters.department) {
                response += ` in the ${parameters.department} department`;
            }
            if (parameters.location) {
                response += ` at ${parameters.location}`;
            }
            response += ':\n\n';
            break;

        case INTENTS.RESOURCE_QUERY:
            response = `Found ${results.length} case${results.length !== 1 ? 's' : ''} with resource requirements`;
            if (parameters.department) {
                response += ` in the ${parameters.department} department`;
            }
            response += ':\n\n';
            break;

        case INTENTS.PRIORITY_ANALYSIS:
            response = `Found ${results.length} ${parameters.priority || ''} priority case${results.length !== 1 ? 's' : ''}`;
            if (parameters.department) {
                response += ` in the ${parameters.department} department`;
            }
            response += ':\n\n';
            break;

        case INTENTS.ESCALATION_SUMMARY:
            response = `Found ${results.length} escalated case${results.length !== 1 ? 's' : ''}`;
            if (parameters.department) {
                response += ` in the ${parameters.department} department`;
            }
            response += ':\n\n';
            break;

        case INTENTS.GRIEVANCE_DETAIL:
            response = `Found ${results.length} case${results.length !== 1 ? 's' : ''}`;
            if (parameters.department) {
                response += ` in the ${parameters.department} department`;
            }
            response += ':\n\n';
            break;

        default:
            response = `Found ${results.length} matching case${results.length !== 1 ? 's' : ''}:\n\n`;
    }

    // Add details for each result if it's a query intent
    if (intent !== INTENTS.GREETING && intent !== INTENTS.THANKS && intent !== INTENTS.HELP) {
        results.forEach((result, index) => {
            response += `${index + 1}. ${result.title}\n`;
            if (result.department) {
                response += `   Department: ${result.department}\n`;
            }
            if (result.location) {
                response += `   Location: ${result.location}\n`;
            }
            if (result.status) {
                response += `   Status: ${result.status}\n`;
            }
            if (result.priority) {
                response += `   Priority: ${result.priority}\n`;
            }
            if (result.createdAt) {
                response += `   Created: ${new Date(result.createdAt).toLocaleDateString()}\n`;
            }
            response += '\n';
        });
    }

    return response;
}

export default router; 