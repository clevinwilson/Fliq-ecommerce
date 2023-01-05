const express = require('express');
const router = express.Router();
const adminHelpers = require('../helpers/admin-helpers');
const baseUrl = require('../controller/url');
const { uploadProduct, uploadCategoryImage, uploadBannerImage } = require('../controller/image-upload');
const productHelpers = require('../helpers/product-helpers');
const deleteImages = require('../controller/delete-file');
const { response } = require('express');



const verifyLogin = (req, res, next) => {
    if (req.session.adminLogin) {
        next();
    } else {
        res.redirect('/admin');
    }
}


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
    adminHelpers.doLogin(req.body).then((response) => {
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
    // const userCount = await productHelpers.getUserCount();
    // const productCount = await productHelpers.getProductCount();
    res.render('admin/dashboard', { admin: req.session.adminLogin })
})




//logout
router.get('/logout', verifyLogin, (req, res) => {
    req.session.destroy()
    res.redirect('/admin')
})

//user management 
router.get('/users-list', verifyLogin, (req, res) => {
    adminHelpers.getUsersList().then((usersList) => {
        res.render('admin/view-user-list', { usersList, admin: req.session.adminLogin, userUpdate: req.session.userUpdate });
        req.session.userUpdate = false;
    })
})

router.get('/delete-user/:userId', verifyLogin, (req, res) => {
    adminHelpers.deleteUser(req.params.userId).then((response) => {
        res.redirect('/admin/users-list');
    })
})

router.get('/edit-user/:userId', verifyLogin, (req, res) => {
    adminHelpers.getUserDetails(req.params.userId).then((userDetails) => {
        res.render('admin/edit-user', { userDetails, admin: req.session.adminLogin });
    })
})

router.post('/edit-user', verifyLogin, (req, res) => {
    adminHelpers.EditUserDetails(req.body).then((response) => {
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
    adminHelpers.blockUser(req.params.userId).then((response) => {
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
    adminHelpers.unBlockUser(req.params.userId).then((response) => {
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
    res.render('admin/add-category', { admin: req.session.adminLogin })
})

router.post('/add-category', verifyLogin, uploadCategoryImage, (req, res) => {
    req.body.image = req.files.image[0];
    adminHelpers.addCategory(req.body).then((response) => {
        if (response.insertedId) {
            res.redirect('/admin/view-category')
        } else {
            res.redirect('/admin/view-category')
        }
    })
})

router.get('/view-category', verifyLogin, (req, res) => {
    adminHelpers.getCategoryList().then((response) => {
        res.render('admin/view-category', { categoryList: response, admin: req.session.adminLogin, categoryUpdate: req.session.categoryUpdate })
        req.session.categoryUpdate = false;
    })
})

router.get('/edit-category/:categoryId', verifyLogin, (req, res) => {
    adminHelpers.getCategoryDetails(req.params.categoryId).then((categoryDetails) => {
        res.render('admin/edit-category', { categoryDetails, admin: req.session.adminLogin });
    })
})

router.post('/edit-category', verifyLogin, uploadCategoryImage, async (req, res) => {
    if (req.files != null) {
        let category = await adminHelpers.getCategoryDetails(req.body.categoryId);
        if(req.files.image){
            req.body.image = req.files.image[0];
            deleteImages(category.image.path);
        }else{
            req.body.image=category.image
        }
        adminHelpers.editCategoryWithImage(req.body).then((response) => {
            req.session.categoryUpdate = "Cateogry updated"
            res.redirect('/admin/view-category');
        })
    } else {
        adminHelpers.editCategory(req.body).then((response) => {
            req.session.categoryUpdate = "Cateogry updated"
            res.redirect('/admin/view-category');
        })
    }

})

router.get('/delete-category/:categoryId', verifyLogin, async (req, res) => {
    let category = await adminHelpers.getCategoryDetails(req.params.categoryId);

    adminHelpers.deleteCategory(req.params.categoryId).then((response) => {
        res.redirect('/admin/view-category');
        deleteImages(category.image.path);

    })
})

router.get('/block-category/:categoryId', verifyLogin, (req, res) => {
    adminHelpers.changeStatus(req.params.categoryId, false).then((response) => {
        res.redirect('/admin/view-category')
    })
})

router.get('/unblock-category/:categoryId', verifyLogin, (req, res) => {
    adminHelpers.changeStatus(req.params.categoryId, true).then((response) => {
        res.redirect('/admin/view-category')
    })
})

//banner
router.get('/add-banner', verifyLogin, (req, res) => {
    res.render('admin/add-banner', { admin: req.session.adminLogin })
})

router.post('/add-banner', verifyLogin, uploadBannerImage, (req, res) => {
    req.body.image = req.files.image[0];
    adminHelpers.addBanner(req.body)
    res.redirect('/admin/view-banner')
})

router.get('/view-banner', verifyLogin, async (req, res) => {
    let bannerList = await adminHelpers.getBanner();
    res.render('admin/view-banner', { bannerList, admin: req.session.adminLogin })
})

router.get('/delete-banner/:bannerId', verifyLogin, async (req, res) => {
    let banner = await adminHelpers.getBannerDetails(req.params.bannerId)

    deleteImages(banner.image.path)

    adminHelpers.deleteBanner(req.params.bannerId).then((response) => {
        res.redirect('/admin/view-banner');
    })
})

router.get('/edit-banner/:bannerId', verifyLogin, (req, res) => {
    adminHelpers.getBannerDetails(req.params.bannerId).then((bannerDetails) => {
        res.render('admin/edit-banner', { bannerDetails, admin: req.session.adminLogin });

    })
})

router.post('/edit-banner', verifyLogin, uploadBannerImage, async (req, res) => {
    let category = await adminHelpers.getBannerDetails(req.body.bannerId)
    console.log(req.files.image);

    if (req.files.image) {
        console.log("haa");
        req.body.image = req.files.image[0];
        deleteImages(category.image.path)
    } else {
        {
            req.body = category.image
        }
    }
    adminHelpers.editBanner(req.body).then((response) => {
        res.redirect('/admin/view-banner');
    })
})


// product section

router.get('/add-product', verifyLogin, async (req, res) => {
    let categoryList = await adminHelpers.getCategoryList();

    res.render('admin/add-product', { admin: req.session.adminLogin, categoryList })
})

router.post('/add-product', verifyLogin, uploadProduct, async (req, res) => {
    req.body.images = [req.files.image1[0], req.files.image2[0], req.files.image3[0], req.files.image4[0]];
    productHelpers.addProduct(req.body).then((response) => {
        res.redirect('/admin/view-products')
    })
})

router.get('/view-products', verifyLogin, async (req, res) => {
    productHelpers.getProducts().then((response) => {
        res.render('admin/view-products', { admin: req.session.adminLogin, products: response });
    })
})

router.get('/delete-product/:productId', verifyLogin, async (req, res) => {
    let productDetails = await productHelpers.getProductDetails(req.params.productId)
    productHelpers.deleteProduct(req.params.productId).then((response) => {
        res.redirect('/admin/view-products');
        productDetails.images.forEach(obj => {
            deleteImages(obj.path);
        });
    })
})

router.get('/edit-product/:productId', async (req, res) => {
    let productDetails = await productHelpers.getProductDetails(req.params.productId);
    let categoryList = await adminHelpers.getCategoryList();

    res.render('admin/edit-product', { categoryList, productDetails, admin: req.session.adminLogin });
})

router.post('/edit-product', uploadProduct, async (req, res) => {
    if (req.files.image1 == null) {
        image1 = await productHelpers.fetchProductImage(req.body.productId, 0)
    } else {
        existImage1 = await productHelpers.fetchProductImage(req.body.productId, 0)
        image1 = req.files.image1[0];
        deleteImages(existImage1.path);
    }

    if (req.files.image2 == null) {
        image2 = await productHelpers.fetchProductImage(req.body.productId, 1)
    } else {
        existImage2 = await productHelpers.fetchProductImage(req.body.productId, 1)
        image2 = req.files.image2[0];
        deleteImages(existImage2.path);
    }

    if (req.files.image3 == null) {
        image3 = await productHelpers.fetchProductImage(req.body.productId, 2)
    } else {
        existImage3 = await productHelpers.fetchProductImage(req.body.productId, 2)
        image3 = req.files.image3[0];
        deleteImages(existImage3.path);
    }

    if (req.files.image4 == null) {
        image4 = await productHelpers.fetchProductImage(req.body.productId, 3)
    } else {
        existImage4 = await productHelpers.fetchProductImage(req.body.productId, 3)
        image4 = req.files.image4[0];
        deleteImages(existImage4.path);
    }

    req.body.images = [image1, image2, image3, image4];

    productHelpers.editProduct(req.body).then((response) => {

        res.redirect('/admin/view-products');
    })
})

router.get('/view-orders', (req, res) => {
    adminHelpers.getAllOrder().then((response) => {
        res.render('admin/view-orders', { orders: response, admin: req.session.adminLogin });
    })
})

router.get('/order-details/:orderId',(req,res)=>{
    productHelpers.getOrderDetails(req.params.orderId).then((response)=>{
        console.log(response);
        res.render('admin/order-details', {order:response,admin:true})
    })
})

// change order status

router.get('/change-order-status/:orderId/:status',(req,res)=>{
    adminHelpers.changeOrderstatus(req.params.orderId,req.params.status).then((response)=>{
        res.json({status:true})
    })
})

// cancel order

router.get("/cancel-order/:orderId",(req,res)=>{
    adminHelpers.cancelOrder(req.params.orderId).then((response)=>{
        res.json({status:true})
    })
})

module.exports = router;