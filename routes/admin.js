const express = require('express');
const router = express.Router();
const adminControllers = require('../controllers/adminControllers');
const bannerControllers = require('../controllers/bannerController');
const categoryControllers = require('../controllers/categoryController');
const orderControllers = require('../controllers/orderController');
const baseUrl = require('../helpers/url');
const { uploadProduct, uploadCategoryImage, uploadBannerImage } = require('../middleware/image-upload');
const productControllers = require('../controllers/productControllers');
const deleteImages = require('../helpers/delete-file');
const verifyLogin = require('../middleware/adminAuth');


//login page
router.get('/', function (req, res, next) {
    if (req.session.adminLogin) {
        res.redirect('/admin/dashboard');
    } else {
        res.render('admin/login', { adminLoginError: req.session.adminLoginError });
        req.session.adminLoginError = false;
    }
});

//login
router.post('/login', (req, res) => {
    adminControllers.doLogin(req.body).then((response) => {
        if (response.status) {
            req.session.adminLogin = true;
            res.redirect('/admin/dashboard')
        } else {
            req.session.adminLoginError = "incorrect username or password";
            res.redirect('/admin')
        }
    })
})


//dashboard
router.get('/dashboard', verifyLogin, async (req, res) => {
     const userCount = await adminControllers.getUserCount();
    const getOrderDetails=await adminControllers.getOrderDetailsCount();
    const getOrderByMonth=await adminControllers.getOrdersByMonth();
    const getProductCount=await adminControllers.getProductCount();
    const getOrdreCount = await adminControllers.getOrdreCount();

    // const productCount = await productControllers.getProductCount();
    res.render('admin/dashboard', { admin: req.session.adminLogin, userCount, getOrderDetails, getOrderByMonth, getProductCount, getOrdreCount })
})




//logout
router.get('/logout', verifyLogin, (req, res) => {
    req.session.destroy()
    res.redirect('/admin')
})

//user management 
router.get('/users-list', verifyLogin, (req, res) => {
    adminControllers.getUsersList().then((usersList) => {
        res.render('admin/view-user-list', { usersList, admin: req.session.adminLogin, userUpdate: req.session.userUpdate });
        req.session.userUpdate = false;
    })
})

router.get('/delete-user/:userId', verifyLogin, (req, res) => {
    adminControllers.deleteUser(req.params.userId).then((response) => {
        res.redirect('/admin/users-list');
    })
})

router.get('/edit-user/:userId', verifyLogin, (req, res) => {
    adminControllers.getUserDetails(req.params.userId).then((userDetails) => {
        res.render('admin/edit-user', { userDetails, admin: req.session.adminLogin });
    })
})

router.post('/edit-user', verifyLogin, (req, res) => {
    adminControllers.EditUserDetails(req.body).then((response) => {
        if (response) {
            req.session.userUpdate = "User Details Updated";
            res.redirect('/admin/users-list');
        } else {
            req.session.userUpdate = "Something went wrong";
            res.redirect('/admin/users-list');
        }
    })
})

router.get('/block-user/:userId', verifyLogin, (req, res) => {
    adminControllers.blockUser(req.params.userId).then((response) => {
        console.log(response);
        if (response) {
            req.session.userUpdate = "User Blocked";
            res.redirect('/admin/users-list');
        } else {
            req.session.userUpdate = "Something went wrong";
            res.redirect('/admin/users-list');
        }
    })
})

router.get('/unblock-user/:userId', verifyLogin, (req, res) => {
    adminControllers.unBlockUser(req.params.userId).then((response) => {
        if (response) {
            req.session.userUpdate = "User Unblocked";
            res.redirect('/admin/users-list');
        } else {
            req.session.userUpdate = "Something went wrong";
            res.redirect('/admin/users-list');
        }
    })
})

//category management

router.get('/add-category', verifyLogin, (req, res) => {
    res.render('admin/add-category', { admin: req.session.adminLogin, categoryError: req.session.categoryErrorMessage })
    req.session.categoryErrorMessage=false;
})

router.post('/add-category', verifyLogin, uploadCategoryImage, categoryControllers.addCategory)

router.get('/view-category', verifyLogin, (req, res) => {
    categoryControllers.getCategoryList().then((response) => {
        res.render('admin/view-category', { categoryList: response, admin: req.session.adminLogin, categoryUpdate: req.session.categoryUpdate })
        req.session.categoryUpdate = false;
    })
})

router.get('/edit-category/:categoryId', verifyLogin, (req, res) => {
    categoryControllers.getCategoryDetails(req.params.categoryId).then((categoryDetails) => {
        res.render('admin/edit-category', { categoryDetails, admin: req.session.adminLogin });
    })
})

router.post('/edit-category', verifyLogin, uploadCategoryImage, async (req, res) => {
    if (req.files != null) {
        let category = await categoryControllers.getCategoryDetails(req.body.categoryId);
        if (req.files.image) {
            req.body.image = req.files.image[0];
            deleteImages(category.image.path);
        } else {
            req.body.image = category.image
        }
        categoryControllers.editCategoryWithImage(req.body).then((response) => {
            req.session.categoryUpdate = "Cateogry updated"
            res.redirect('/admin/view-category');
        })
    } else {
        categoryControllers.editCategory(req.body).then((response) => {
            req.session.categoryUpdate = "Cateogry updated"
            res.redirect('/admin/view-category');
        })
    }

})

router.get('/delete-category/:categoryId', verifyLogin, async (req, res) => {
    let category = await categoryControllers.getCategoryDetails(req.params.categoryId);

    categoryControllers.deleteCategory(req.params.categoryId).then((response) => {
        if (response) {

            res.json({ status: true })
            deleteImages(category.image.path);
        } else {
            res.json({ status: false })
        }
    })
})

router.get('/block-category/:categoryId', verifyLogin, (req, res) => {
    categoryControllers.changeStatus(req.params.categoryId, false).then((response) => {
        res.redirect('/admin/view-category')
    })
})

router.get('/unblock-category/:categoryId', verifyLogin, (req, res) => {
    categoryControllers.changeStatus(req.params.categoryId, true).then((response) => {
        res.redirect('/admin/view-category')
    })
})




//banner
router.get('/add-banner', verifyLogin, (req, res) => {
    res.render('admin/add-banner', { admin: req.session.adminLogin })
})

router.post('/add-banner', verifyLogin, uploadBannerImage, (req, res) => {
    req.body.image = req.files.image[0];
    bannerControllers.addBanner(req.body)
    res.redirect('/admin/view-banner')
})

router.get('/view-banner', verifyLogin, async (req, res) => {
    let bannerList = await bannerControllers.getBanner();
    res.render('admin/view-banner', { bannerList, admin: req.session.adminLogin })
})

router.get('/delete-banner/:bannerId', verifyLogin, async (req, res) => {
    try {
        let banner = await bannerControllers.getBannerDetails(req.params.bannerId)
        deleteImages(banner.image.path)
        bannerControllers.deleteBanner(req.params.bannerId).then((response) => {
            res.json({ status: true })
        }).catch(() => {
            res.json({ status: false })
        })
    } catch (err) {
        console.log(err);
        res.json({ status: false })
    }
})

router.get('/edit-banner/:bannerId', verifyLogin, (req, res) => {
    bannerControllers.getBannerDetails(req.params.bannerId).then((bannerDetails) => {
        res.render('admin/edit-banner', { bannerDetails, admin: req.session.adminLogin });

    })
})


router.post('/edit-banner', verifyLogin, uploadBannerImage, async (req, res) => {
    let category = await bannerControllers.getBannerDetails(req.body.bannerId)
    if (req.files.image) {
        req.body.image = req.files.image[0];
        deleteImages(category.image.path)
    } else {
        {
            req.body.image = category.image
        }
    }

    bannerControllers.editBanner(req.body).then((response) => {
        res.redirect('/admin/view-banner');
    })
})




// product section

router.get('/add-product', verifyLogin, async (req, res) => {
    let categoryList = await categoryControllers.getCategoryList();

    res.render('admin/add-product', { admin: req.session.adminLogin, categoryList })
})

router.post('/add-product', verifyLogin, uploadProduct, async (req, res) => {
    req.body.images = [req.files.image1[0], req.files.image2[0], req.files.image3[0], req.files.image4[0]];
    productControllers.addProduct(req.body).then((response) => {
        res.redirect('/admin/view-products')
    })
})

router.get('/view-products', verifyLogin, async (req, res) => {
    productControllers.getProducts().then((response) => {
        res.render('admin/view-products', { admin: req.session.adminLogin, products: response });
    })
})

router.get('/delete-product/:productId', verifyLogin, async (req, res) => {
    productControllers.deleteProduct(req.params.productId).then((response) => {
        res.json(true)
    })
})

router.get('/edit-product/:productId',verifyLogin, async (req, res) => {
    let productDetails = await productControllers.getProductDetails(req.params.productId);
    let categoryList = await categoryControllers.getCategoryList();

    res.render('admin/edit-product', { categoryList, productDetails, admin: req.session.adminLogin });
})

router.post('/edit-product', uploadProduct,verifyLogin, async (req, res) => {
    if (req.files.image1 == null) {
        image1 = await productControllers.fetchProductImage(req.body.productId, 0)
    } else {
        existImage1 = await productControllers.fetchProductImage(req.body.productId, 0)
        image1 = req.files.image1[0];
        deleteImages(existImage1.path);
    }

    if (req.files.image2 == null) {
        image2 = await productControllers.fetchProductImage(req.body.productId, 1)
    } else {
        existImage2 = await productControllers.fetchProductImage(req.body.productId, 1)
        image2 = req.files.image2[0];
        deleteImages(existImage2.path);
    }

    if (req.files.image3 == null) {
        image3 = await productControllers.fetchProductImage(req.body.productId, 2)
    } else {
        existImage3 = await productControllers.fetchProductImage(req.body.productId, 2)
        image3 = req.files.image3[0];
        deleteImages(existImage3.path);
    }

    if (req.files.image4 == null) {
        image4 = await productControllers.fetchProductImage(req.body.productId, 3)
    } else {
        existImage4 = await productControllers.fetchProductImage(req.body.productId, 3)
        image4 = req.files.image4[0];
        deleteImages(existImage4.path);
    }

    req.body.images = [image1, image2, image3, image4];

    productControllers.editProduct(req.body).then((response) => {

        res.redirect('/admin/view-products');
    })
})


//order
router.get('/view-orders',verifyLogin, (req, res) => {
    orderControllers.getAllOrder().then((response) => {
        res.render('admin/view-orders', { orders: response, admin: req.session.adminLogin });
    })
})

router.get('/order-details/:orderId',verifyLogin, (req, res) => {
    orderControllers.getOrderDetails(req.params.orderId).then((response) => {
        res.render('admin/order-details', { order: response, admin: req.session.adminLogin })
    })
})

// change order status

router.get('/change-order-status/:orderId/:status',verifyLogin, (req, res) => {
    orderControllers.changeOrderstatus(req.params.orderId, req.params.status).then((response) => {
        res.json({ status: true })
    })
})

// cancel order

router.get("/cancel-order/:orderId",verifyLogin, (req, res) => {
    orderControllers.cancelOrder(req.params.orderId).then((response) => {
        res.json({ status: true })
    })
})

// coupon
router.get('/coupon',verifyLogin, async (req, res) => {
    try{
        let coupons = await adminControllers.getCoupons();
        res.render('admin/coupon', { admin: req.session.adminLogin,coupons });
    }catch(err){
        console.log(err);
    }
})

router.post('/add-coupon',verifyLogin, async(req, res) => {
    try {
        let couponExists=await adminControllers.checkCoupon(req.body)
        if(!couponExists){
            adminControllers.addCoupon(req.body).then(async (response) => {
                res.redirect('/admin/coupon');
            })
        }else{
            res.redirect('/admin/coupon');

        }
        
    } catch (err) {
        res.redirect('/admin/coupon');
    }
})


router.get('/delete-coupon/:couponId',verifyLogin,(req,res)=>{
    adminControllers.deleteCoupon(req.params.couponId).then((response)=>{
        res.redirect('/admin/coupon')
    })
})


router.get('/edit-coupon/:couponId',(req,res)=>{
    adminControllers.editCoupon(req.params.couponId).then((response)=>{
        res.render('admin/edit-coupon', { details: response, admin: req.session.adminLogin })
    })
})

router.post('/edit-coupon',(req,res)=>{
    adminControllers.updateCoupon(req.body).then((response,)=>{
        res.redirect('/admin/coupon')
    })
})


// salse report

router.get('/salesreport',verifyLogin,(req,res)=>{
    adminControllers.getSalesReportData().then((response)=>{
        res.render('admin/sales-report', { salesData: response, admin: req.session.adminLogin })
    })
})


router.post('/generate-salesreport',verifyLogin,adminControllers.gerSalesReportInfo)




module.exports = router;