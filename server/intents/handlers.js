import { MongoClient } from 'mongodb';
import { INTENTS } from '../llm/intentClassifier.js';

export async function handleIntent(intent, parameters, collection) {
    switch (intent) {
        case INTENTS.STATUS_QUERY:
            return handleStatusQuery(parameters, collection);
        case INTENTS.RESOURCE_QUERY:
            return handleResourceQuery(parameters, collection);
        case INTENTS.PRIORITY_ANALYSIS:
            return handlePriorityAnalysis(parameters, collection);
        case INTENTS.ESCALATION_SUMMARY:
            return handleEscalationSummary(parameters, collection);
        case INTENTS.GRIEVANCE_DETAIL:
            return handleGrievanceDetail(parameters, collection);
        case INTENTS.GREETING:
        case INTENTS.THANKS:
        case INTENTS.HELP:
            // For casual conversation intents, return empty results as they don't need database queries
            return { count: 0, results: [] };
        default:
            throw new Error(`Unknown intent: ${intent}`);
    }
}

async function handleStatusQuery(parameters, collection) {
    const query = {};
    if (parameters.status) {
        query.status = parameters.status;
    }
    if (parameters.department) {
        query.department = parameters.department;
    }
    if (parameters.location) {
        query.location = parameters.location;
    }

    const results = await collection.find(query)
        .project({
            _id: 0,
            petitionId: 1,
            title: 1,
            status: 1,
            department: 1,
            location: 1,
            createdAt: 1
        })
        .sort({ createdAt: -1 })
        .toArray();

    return {
        count: results.length,
        results
    };
}

async function handleResourceQuery(parameters, collection) {
    const query = {
        resourceManagement: { $exists: true }
    };

    if (parameters.department) {
        query.department = parameters.department;
    }
    if (parameters.location) {
        query.location = parameters.location;
    }

    const results = await collection.find(query)
        .project({
            _id: 0,
            petitionId: 1,
            title: 1,
            department: 1,
            resourceManagement: 1,
            status: 1
        })
        .sort({ 'resourceManagement.startDate': 1 })
        .toArray();

    return {
        count: results.length,
        results
    };
}

async function handlePriorityAnalysis(parameters, collection) {
    const query = {};
    if (parameters.priority) {
        query.priority = parameters.priority;
    }
    if (parameters.department) {
        query.department = parameters.department;
    }
    if (parameters.location) {
        query.location = parameters.location;
    }

    const results = await collection.find(query)
        .project({
            _id: 0,
            petitionId: 1,
            title: 1,
            priority: 1,
            status: 1,
            department: 1,
            location: 1,
            createdAt: 1
        })
        .sort({ priority: 1, createdAt: -1 })
        .toArray();

    return {
        count: results.length,
        results
    };
}

async function handleEscalationSummary(parameters, collection) {
    const query = {
        escalatedAt: { $exists: true }
    };

    if (parameters.department) {
        query.department = parameters.department;
    }
    if (parameters.location) {
        query.location = parameters.location;
    }

    const results = await collection.find(query)
        .project({
            _id: 0,
            petitionId: 1,
            title: 1,
            department: 1,
            location: 1,
            escalatedAt: 1,
            status: 1
        })
        .sort({ escalatedAt: -1 })
        .toArray();

    return {
        count: results.length,
        results
    };
}

async function handleGrievanceDetail(parameters, collection) {
    const query = {};
    if (parameters.department) {
        query.department = parameters.department;
    }
    if (parameters.location) {
        query.location = parameters.location;
    }

    const results = await collection.find(query)
        .project({
            _id: 0,
            petitionId: 1,
            title: 1,
            description: 1,
            department: 1,
            location: 1,
            status: 1,
            priority: 1,
            createdAt: 1,
            updatedAt: 1
        })
        .sort({ createdAt: -1 })
        .toArray();

    return {
        count: results.length,
        results
    };
} 