const multer = require('multer');

const categoryStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/product-images')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + ".jpg")
    }
})

const fileFilter=()=>{

}

const upload = multer({ storage: categoryStorage});

module.exports=upload;