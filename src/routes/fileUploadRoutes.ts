import { Router } from 'express';
import { uploadFile } from '../controllers/fileUploadController';

const router = Router();

router.post('/upload', uploadFile);

export default router;