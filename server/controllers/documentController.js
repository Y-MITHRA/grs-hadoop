import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import Grievance from '../models/Grievance.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Official from '../models/Official.js';
import Assignment from '../models/Assignment.js';
import { createNotification } from './notificationController.js';

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
    if (!department) return '';

    // Remove any special characters and extra spaces
    const cleaned = department.replace(/[*#@!]/g, '').trim();
    console.log('Department before cleaning:', department);
    console.log('Department after basic cleaning:', cleaned);

    // Check for RTO-related keywords
    const rtoKeywords = ['rto', 'regional transport office', 'transport', 'vehicle', 'driving', 'license', 'registration', 'motor vehicle'];
    const isRtoRelated = rtoKeywords.some(keyword =>
        cleaned.toLowerCase().includes(keyword)
    );

    if (isRtoRelated) {
        console.log('RTO-related keywords detected, mapping to RTO department');
        return 'RTO';
    }

    // Map common variations to valid department names
    const departmentMap = {
        'water': 'Water',
        'rto': 'RTO',
        'r.t.o': 'RTO',
        'r.t.o.': 'RTO',
        'r t o': 'RTO',
        'regional transport': 'RTO',
        'transport office': 'RTO',
        'regional transport office': 'RTO',
        'regional transport officer': 'RTO',
        'electricity': 'Electricity',
        'water department': 'Water',
        'water board': 'Water',
        'rto department': 'RTO',
        'electricity department': 'Electricity',
        'electric': 'Electricity',
        'power': 'Electricity'
    };

    const result = departmentMap[cleaned.toLowerCase()] || cleaned;
    console.log('Final department mapping:', result);
    return result;
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
        const extractionPrompt = `Analyze this text carefully and provide the following information in a structured format.

        First, determine which department this grievance is meant for:
        - If it mentions vehicles, licenses, driving, registration, transport, or motor vehicles, classify it as "RTO" department
        - If it mentions water supply, pipes, sewage, drainage, or water quality, classify it as "Water" department
        - If it mentions electricity, power supply, electrical issues, or billing for electricity, classify it as "Electricity" department

        For priority, carefully analyze the content and assign based on these criteria:
        - High: Life-threatening situations, safety hazards, critical infrastructure issues, immediate health risks
        - Medium: Service disruptions, maintenance issues, quality concerns, non-critical problems
        - Low: General complaints, improvement suggestions, minor inconveniences

        IMPORTANT: Pay special attention to identifying the correct department, district, division, and taluk information.

        Title: [Main topic or subject]
        Department: [Water, RTO, or Electricity only]
        Location: [Address or area mentioned]
        Description: [Main content or issue]
        Priority: [High, Medium, or Low]
        Priority Explanation: [Brief explanation of why this priority was assigned]
        District: [District mentioned, if Chennai is mentioned use "Chennai"]
        Division: [Division mentioned, for RTO documents look for mentions of regions like "Chennai Central"]
        Taluk: [Taluk mentioned, for RTO documents look for mentions of areas like "Egmore"]

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

        // Add debug logging
        console.log('Document extraction results:', {
            title: extractedData.title || 'NOT FOUND',
            department: extractedData.department || 'NOT FOUND',
            description: extractedData.description ? (extractedData.description.substring(0, 50) + '...') : 'NOT FOUND',
            location: extractedData.location || 'NOT FOUND',
            district: extractedData.district || 'NOT FOUND',
            division: extractedData.division || 'NOT FOUND',
            taluk: extractedData.taluk || 'NOT FOUND',
            priority: extractedData.priority || 'NOT FOUND'
        });

        // Validate required fields
        if (!extractedData.title || !extractedData.department || !extractedData.description) {
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
            ...(extractedData.location && { location: extractedData.location }),
            district: extractedData.district || 'Chennai', // Default to Chennai if not extracted
            division: extractedData.division || 'Central', // Default to Central if not extracted
            taluk: extractedData.taluk || 'Egmore', // Default to Egmore if not extracted
            petitioner,
            status: 'pending',
            priority: extractedData.priority,
            priorityExplanation: extractedData.priorityExplanation || 'Priority assigned based on content analysis',
            portal_type: 'GRS',
            statusHistory: [{
                status: 'pending',
                updatedBy: petitioner,
                updatedByType: 'petitioner',
                comment: `Document-based grievance submitted. Priority: ${extractedData.priority} - ${extractedData.priorityExplanation || 'Based on content analysis'}`
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
        const district = extractedData.district || 'Chennai';
        const division = extractedData.division || 'Central';
        const taluk = extractedData.taluk || 'Egmore';

        console.log('Searching for officials with criteria:', {
            department: extractedData.department,
            district: district,
            division: division,
            taluk: taluk
        });

        const officials = await Official.find({
            department: extractedData.department,
            district: district,
            division: division,
            taluk: taluk
        });

        console.log(`Found ${officials.length} matching officials for jurisdiction`);

        // If no officials found with specific jurisdiction, find officials from any jurisdiction in the same department
        let assignmentOfficials = officials;

        if (officials.length === 0) {
            console.log('No matching officials found in specific jurisdiction. Searching for any officials in this department...');
            const allDeptOfficials = await Official.find({
                department: extractedData.department
            });
            console.log(`Found ${allDeptOfficials.length} officials in ${extractedData.department} department`);

            if (allDeptOfficials.length > 0) {
                console.log('Official jurisdictions in this department:');
                allDeptOfficials.forEach(official => {
                    console.log(`- ${official.firstName} ${official.lastName}: ${official.taluk}, ${official.division}, ${official.district}`);
                });

                // Use all department officials if specific jurisdiction officials not found
                assignmentOfficials = allDeptOfficials;
            }
        }

        // Create assignments with the officials we found (either specific jurisdiction or department-wide)
        const assignments = await Promise.all(assignmentOfficials.map(official => {
            return new Assignment({
                grievanceId: grievance._id,
                officialId: official._id,
                status: 'Pending'
            }).save();
        }));

        // After finding officials and creating assignments, update the grievance with assignedOfficials
        grievance.assignedOfficials = assignmentOfficials.map(official => official._id);
        await grievance.save();

        // Create notifications for assigned officials
        for (const official of assignmentOfficials) {
            await createNotification(
                official._id,
                'Official',
                'NEW_GRIEVANCE',
                `A new document-based grievance has been submitted${officials.length === 0 ? ' that may require your attention' : ' in your jurisdiction'}. Please review the uploaded document and accept if you can handle it.`,
                grievance._id
            );
        }

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