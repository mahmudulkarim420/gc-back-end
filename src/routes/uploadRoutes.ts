import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';

const router = express.Router();

// Using memory storage for flexibility
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Convert buffer to base64 for Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString('base64');
    let dataURI = 'data:' + req.file.mimetype + ';base64,' + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      resource_type: 'auto',
      folder: 'chat_attachments'
    });

    res.status(200).json({
      url: result.secure_url,
      resource_type: result.resource_type
    });
  } catch (error: any) {
    console.error('--- Cloudinary Upload Error ---');
    console.error('Message:', error.message || error);
    if (error.http_code) console.error('HTTP Code:', error.http_code);
    console.error('-------------------------------');
    
    res.status(500).json({ 
      message: 'Upload failed', 
      error: error.message || 'Unknown error' 
    });
  }
});

export default router;
