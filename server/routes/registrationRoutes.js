import express from 'express';
import { registerOfficial} from '../controllers/registrationController.js';

const router = express.Router();

// router.post('/register/petitioner', registerPetitioner);
router.post('/register/official', registerOfficial);
// router.post('/register/admin', registerAdmin);

export default router;
