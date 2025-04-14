import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import Grievance from '../models/Grievance.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Official from '../models/Official.js';
import Assignment from '../models/Assignment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/documents/');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for document uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and images are allowed.'));
        }
    }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Clean and validate department value
const cleanDepartment = (department) => {
    // Remove any special characters and extra spaces
    const cleaned = department.replace(/[*#@!]/g, '').trim();

    // Map common variations to valid department names
    const departmentMap = {
        'water': 'Water',
        'rto': 'RTO',
        'electricity': 'Electricity',
        'water department': 'Water',
        'rto department': 'RTO',
        'electricity department': 'Electricity'
    };

    return departmentMap[cleaned.toLowerCase()] || cleaned;
};

// Function to analyze text and determine priority
const analyzePriority = (text) => {
    const highPriorityKeywords = [
        'urgent', 'emergency', 'critical', 'immediate', 'life-threatening',
        'dangerous', 'hazard', 'risk', 'safety', 'accident', 'injury',
        'health', 'medical', 'hospital', 'fire', 'flood', 'leak', 'breakdown',
        'outage', 'power cut', 'water supply', 'sewage', 'blockage'
    ];

    const mediumPriorityKeywords = [
        'inconvenience', 'delay', 'waiting', 'pending', 'issue',
        'problem', 'complaint', 'request', 'maintenance', 'repair',
        'service', 'quality', 'standard', 'improvement'
    ];

    const textLower = text.toLowerCase();
    const highPriorityCount = highPriorityKeywords.filter(keyword =>
        textLower.includes(keyword)
    ).length;

    const mediumPriorityCount = mediumPriorityKeywords.filter(keyword =>
        textLower.includes(keyword)
    ).length;

    if (highPriorityCount > 0) return 'High';
    if (mediumPriorityCount > 0) return 'Medium';
    return 'Low';
};

// Process document and create grievance
export const processDocument = async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('Gemini API key is not configured');
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No document uploaded' });
        }

        const petitioner = req.user.id;
        const filePath = req.file.path;

        // Initialize Gemini 2.0 Flash model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Read the file content
        const fileContent = await fs.promises.readFile(filePath);
        const imageData = fileContent.toString('base64');

        // First, try to detect if the document is in Tamil
        const languageDetectionPrompt = "Is this document written in Tamil? Answer with 'yes' or 'no' only.";
        const languageResult = await model.generateContent({
            contents: [{
                parts: [
                    { text: languageDetectionPrompt },
                    {
                        inlineData: {
                            mimeType: req.file.mimetype,
                            data: imageData
                        }
                    }
                ]
            }]
        });

        const isTamil = languageResult.response.text().toLowerCase().includes('yes');

        // If Tamil, translate to English
        let englishText;
        if (isTamil) {
            const translationPrompt = "Translate this Tamil document to English. Provide only the English translation.";
            const translationResult = await model.generateContent({
                contents: [{
                    parts: [
                        { text: translationPrompt },
                        {
                            inlineData: {
                                mimeType: req.file.mimetype,
                                data: imageData
                            }
                        }
                    ]
                }]
            });
            englishText = translationResult.response.text();
        } else {
            // If English, extract text directly
            const textExtractionPrompt = "Extract the text from this document.";
            const textResult = await model.generateContent({
                contents: [{
                    parts: [
                        { text: textExtractionPrompt },
                        {
                            inlineData: {
                                mimeType: req.file.mimetype,
                                data: imageData
                            }
                        }
                    ]
                }]
            });
            englishText = textResult.response.text();
        }

        // Extract key information using Gemini
        const extractionPrompt = `Analyze this text and provide the following information in a structured format. For priority, carefully analyze the content and assign based on these criteria:
        - High: Life-threatening situations, safety hazards, critical infrastructure issues, immediate health risks
        - Medium: Service disruptions, maintenance issues, quality concerns, non-critical problems
        - Low: General complaints, improvement suggestions, minor inconveniences

        Title: [Main topic or subject]
        Department: [Water, RTO, or Electricity only]
        Location: [Address or area mentioned]
        Description: [Main content or issue]
        Priority: [High, Medium, or Low]
        Priority Explanation: [Brief explanation of why this priority was assigned]
        District: [District mentioned]
        Division: [Division mentioned]
        Taluk: [Taluk mentioned]

        Text to analyze: ${englishText}`;

        const extractionResult = await model.generateContent({
            contents: [{
                parts: [{ text: extractionPrompt }]
            }]
        });

        // Parse the response text to extract information
        const responseText = extractionResult.response.text();
        const extractedData = {
            title: '',
            department: '',
            location: '',
            description: '',
            priority: 'Medium', // Default priority
            priorityExplanation: '',
            district: '',
            division: '',
            taluk: ''
        };

        // Extract information using regex
        const titleMatch = responseText.match(/Title:\s*([^\n]+)/i);
        const departmentMatch = responseText.match(/Department:\s*([^\n]+)/i);
        const locationMatch = responseText.match(/Location:\s*([^\n]+)/i);
        const descriptionMatch = responseText.match(/Description:\s*([^\n]+)/i);
        const priorityMatch = responseText.match(/Priority:\s*([^\n]+)/i);
        const priorityExplanationMatch = responseText.match(/Priority Explanation:\s*([^\n]+)/i);
        const districtMatch = responseText.match(/District:\s*([^\n]+)/i);
        const divisionMatch = responseText.match(/Division:\s*([^\n]+)/i);
        const talukMatch = responseText.match(/Taluk:\s*([^\n]+)/i);

        if (titleMatch) extractedData.title = titleMatch[1].trim();
        if (departmentMatch) extractedData.department = cleanDepartment(departmentMatch[1]);
        if (locationMatch) extractedData.location = locationMatch[1].trim();
        if (descriptionMatch) extractedData.description = descriptionMatch[1].trim();
        if (priorityMatch) extractedData.priority = priorityMatch[1].trim();
        if (priorityExplanationMatch) extractedData.priorityExplanation = priorityExplanationMatch[1].trim();
        if (districtMatch) extractedData.district = districtMatch[1].trim();
        if (divisionMatch) extractedData.division = divisionMatch[1].trim();
        if (talukMatch) extractedData.taluk = talukMatch[1].trim();

        // Validate required fields
        if (!extractedData.title || !extractedData.department || !extractedData.location || !extractedData.description) {
            throw new Error('Failed to extract required information from the document');
        }

        // Validate department is one of the allowed values
        const validDepartments = ['Water', 'RTO', 'Electricity'];
        if (!validDepartments.includes(extractedData.department)) {
            throw new Error(`Invalid department: ${extractedData.department}. Must be one of: ${validDepartments.join(', ')}`);
        }

        // Validate priority is one of the allowed values
        const validPriorities = ['High', 'Medium', 'Low'];
        if (!validPriorities.includes(extractedData.priority)) {
            extractedData.priority = 'Medium'; // Default to Medium if invalid
        }

        // Create new grievance
        const grievance = new Grievance({
            petitionId: `GRV${Date.now().toString().slice(-6)}`,
            title: extractedData.title,
            description: extractedData.description,
            department: extractedData.department,
            location: extractedData.location,
            district: extractedData.district,
            division: extractedData.division,
            taluk: extractedData.taluk,
            petitioner,
            status: 'pending',
            priority: extractedData.priority,
            priorityExplanation: extractedData.priorityExplanation,
            portal_type: 'GRS',
            coordinates: req.body.coordinates && !isNaN(parseFloat(req.body.coordinates.latitude)) && !isNaN(parseFloat(req.body.coordinates.longitude)) ? {
                latitude: parseFloat(req.body.coordinates.latitude),
                longitude: parseFloat(req.body.coordinates.longitude)
            } : undefined,
            statusHistory: [{
                status: 'pending',
                updatedBy: petitioner,
                updatedByType: 'petitioner',
                comment: `Document-based grievance submitted. Priority: ${extractedData.priority} - ${extractedData.priorityExplanation}`
            }],
            originalDocument: {
                filename: req.file.originalname,
                path: filePath,
                uploadedAt: new Date()
            },
            recommendedResponseTime: extractedData.priority === 'High' ? '24' :
                extractedData.priority === 'Medium' ? '48' : '72',
            impactAssessment: extractedData.priority === 'High' ? 'High' :
                extractedData.priority === 'Medium' ? 'Medium' : 'Low'
        });

        await grievance.save();

        // Find and assign officials
        const officials = await Official.find({
            department: extractedData.department,
            district: extractedData.district,
            division: extractedData.division,
            taluk: extractedData.taluk
        });

        // Create assignments
        const assignments = await Promise.all(officials.map(official => {
            return new Assignment({
                grievanceId: grievance._id,
                officialId: official._id,
                status: 'Pending'
            }).save();
        }));

        res.status(201).json({
            message: 'Document processed successfully',
            grievance,
            assignments
        });
    } catch (error) {
        console.error('Error processing document:', error);
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
                console.log('Cleaned up uploaded file:', req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up file:', cleanupError);
            }
        }
        res.status(500).json({
            error: 'Failed to process document',
            details: error.message
        });
    }
}; 