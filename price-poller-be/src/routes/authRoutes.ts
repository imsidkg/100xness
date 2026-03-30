
import { Router } from 'express';
import { signup, signin, getAccountSummary, deposit } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/account-summary', authenticateToken, getAccountSummary);
router.post('/deposit', authenticateToken, deposit);

export default router;
