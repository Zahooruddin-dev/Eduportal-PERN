// middleware/uploadResourceMiddleware.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
	cloudinary: cloudinary,
	params: {
		folder: 'mizuka_resources',
		access_mode: 'public', // separate folder for resources
		resource_type: 'raw', // Cloudinary auto-detects file type
		// limiting formats for now atleast to common types, can expand later if needed:
		// allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif', 'gif', 'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'ppt', 'pptx', 'mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'zip'],
	},
});

const fileFilter = (req, file, cb) => {
	const allowedMimes = [
		// images
		'image/jpeg',
		'image/png',
		'image/webp',
		'image/avif',
		'image/gif',
		// PDF
		'application/pdf',
		// Word docs
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		// Plain text
		'text/plain',
		// Presentations
		'application/vnd.ms-powerpoint',
		'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		// Videos
		'video/mp4',
		'video/mpeg',
		'video/quicktime',
		'video/x-msvideo',
		'video/x-matroska',
		// Audio
		'audio/mpeg',
		'audio/wav',
		// Archives
		'application/zip',
		'application/x-zip-compressed',
	];
	if (allowedMimes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(
			new Error(
				'File type not allowed. Please upload an image, PDF, document, video, audio, or zip file.',
			),
			false,
		);
	}
};

const uploadResource = multer({ storage, fileFilter });

module.exports = uploadResource;
