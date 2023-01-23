const multer = require('multer');

//image filter 
const fileFilter = (req, file, cb) => {
    if (
        file.mimetype == 'image/jpeg' ||
        file.mimetype == 'image/jpg' ||
        file.mimetype == 'image/png' ||
        file.mimetype == 'image/gif' ||
        file.mimetype == 'image/webp'||
        file.mimetype == 'image/avif'

    ) 
    {
        cb(null, true)
    }
    else {
        cb(null, false);
        cb(new Error('Only jpeg,  jpg , png, avif and gif Image allow'))
    }
};

//uploads product img
const ProductStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images/product-images')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + '-' + ".png")
    }
})

const uploadProduct = multer({ storage: ProductStorage }).fields([{ name: 'image1', maxCount: 1 }, { name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }, { name: 'image4', maxCount: 1 }]);


//uploads category img
const multerStorageCategory = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/images/category-images");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})
const uploadCategoryImage = multer({ storage: multerStorageCategory }).fields([{ name: 'image', maxCount: 1 }])


//uploads banner img
const multerStorageBanner = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/images/banner");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
})
const uploadBannerImage = multer({ storage: multerStorageBanner }).fields([{ name: 'image', maxCount: 1 }])
module.exports = { uploadProduct, uploadCategoryImage, uploadBannerImage };