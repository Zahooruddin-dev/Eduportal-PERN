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
		resource_type: 'auto', // Cloudinary auto-detects file type
		// limiting formats for now atleast to common types, can expand later if needed:
		// allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'avif', 'gif', 'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'ppt', 'pptx', 'mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'zip'],
	},
});

const fileFilter = (req, file, cb) => {
	const allowedMimes = [
		'image/jpeg',
		'image/png',
		'image/webp',
		'image/avif',
		'image/gif',
		'application/pdf',
	];
	if (allowedMimes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(
			new Error('Only image files (JPEG, PNG, WEBP, AVIF, GIF, PDF) are allowed.'),
			false,
		);
	}
};
const uploadResource = multer({ storage, fileFilter });

module.exports = uploadResource;
