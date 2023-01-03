const multer = require('multer');

const ProductStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/product-images')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + ".png")
    }
})

const fileFilter=()=>{

}

const uploadProduct = multer({ storage: ProductStorage }).fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }, { name: 'image4', maxCount: 1 }]);

module.exports = uploadProduct;