import multer from 'multer';

const upload = multer({
    dest: "temp/",
    limits: {
        fileSize: 25 * 1024 * 1024
    }
});

export default upload;
