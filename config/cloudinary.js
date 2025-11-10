// config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

// Cloudinary configuration
if (!process.env.CLOUDINARY_CLOUD_NAME || 
    !process.env.CLOUDINARY_API_KEY || 
    !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌ Cloudinary environment variables are missing!');
  // Fallback to local storage or throw error
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ SEPARATE CONFIGURATION FOR LOTS
const lotStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'auction_lots', // Different folder for lots
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    resource_type: 'auto',
  },
});

// ✅ SEPARATE UPLOAD FOR LOTS
const uploadLotFiles = multer({
  storage: lotStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and PDFs are allowed.'), false);
    }
  }
});

// ✅ SPECIFIC UPLOAD FIELDS FOR LOTS
const uploadLotFields = uploadLotFiles.fields([
  { name: 'images', maxCount: 10 }, // Multiple images for lots
  { name: 'proofOfOwnership', maxCount: 1 } // Single document for lots
]);

// ✅ SEPARATE CONFIGURATION FOR USER REGISTRATION
const userStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'auction_users', // Different folder for users
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx'],
    resource_type: 'auto',
  },
});

const uploadUserFiles = multer({
  storage: userStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
    }
  }
});

// ✅ SPECIFIC UPLOAD FIELDS FOR USERS
const uploadUserFields = uploadUserFiles.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'aadhar', maxCount: 1 },
  { name: 'gst', maxCount: 1 },
  { name: 'deed', maxCount: 1 },
  { name: 'moa', maxCount: 1 },
  { name: 'aoa', maxCount: 1 },
  { name: 'coi', maxCount: 1 },
  { name: 'cpan', maxCount: 1 },
  { name: 'rcer', maxCount: 1 },
  { name: 'otherDoc', maxCount: 1 }
]);

export { 
  cloudinary, 
  uploadLotFields,  // For lots
  uploadUserFields  // For users
};