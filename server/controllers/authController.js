// import jwt from 'jsonwebtoken';
// import bcrypt from 'bcryptjs';
// import Petitioner from '../models/Petitioner.js';
// import Official from '../models/Official.js';
// import Admin from '../models/Admin.js';
// import { getOfficialDashboard } from '../utils/redirectHelper.js';

// const generateToken = (id, role) => {
//     return jwt.sign({ id, role }, 'secretKey', { expiresIn: '1d' });
// };

// // Official Login with Department Redirect
// export const loginOfficial = async (req, res) => {
//     const { email, password } = req.body;
//     const official = await Official.findOne({ email });

//     if (official && (await bcrypt.compare(password, official.password))) {
//         const dashboardRedirect = getOfficialDashboard(official.department);
//         res.json({
//             token: generateToken(official._id, 'official'),
//             dashboardRedirect
//         });
//     } else {
//         res.status(401).json({ error: 'Invalid credentials' });
//     }
// };

// // Petitioner Login
// export const loginPetitioner = async (req, res) => {
//     const { email, password } = req.body;
//     const petitioner = await Petitioner.findOne({ email });

//     if (petitioner && (await bcrypt.compare(password, petitioner.password))) {
//         res.json({ token: generateToken(petitioner._id, 'petitioner') });
//     } else {
//         res.status(401).json({ error: 'Invalid credentials' });
//     }
// };

// // Admin Login
// export const loginAdmin = async (req, res) => {
//     const { email, password } = req.body;
//     const admin = await Admin.findOne({ email });

//     if (admin && (await bcrypt.compare(password, admin.password))) {
//         res.json({ token: generateToken(admin._id, 'admin') });
//     } else {
//         res.status(401).json({ error: 'Invalid credentials' });
//     }
// };


import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
// import Petitioner from '../models/Petitioner.js';
import Official from '../models/Official.js';
// import Admin from '../models/Admin.js';
import { getOfficialDashboard } from '../utils/redirectHelper.js';

const generateToken = (id, role, department = null) => {
    return jwt.sign({ id, role, department }, 'secretKey', { expiresIn: '1d' });
};

// Official Login with Department Redirect
export const loginOfficial = async (req, res) => {
    const { email, password } = req.body;
    const official = await Official.findOne({ email });

    if (!official) {
        return res.status(404).json({ error: 'Official not found' });
    }

    const isPasswordMatch = await bcrypt.compare(password, official.password);

    if (!isPasswordMatch) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    if (!official.department) {
        return res.status(400).json({ error: 'Department not assigned for this official' });
    }

    const dashboardRedirect = getOfficialDashboard(official.department);

    res.json({
        token: generateToken(official._id, 'official', official.department),
        dashboardRedirect
    });
};

// Petitioner Lo