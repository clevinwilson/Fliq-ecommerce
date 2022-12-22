const { response } = require('express');
const express = require('express');
const router = express.Router();
const adminHelpers = require('../helpers/admin-helpers');
const baseUrl=require('../controller/url');

// const categoryStorage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, './public/images/category-images')
//     },
//     filename: function (req, file, cb) {
//         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
//         cb(null, file.fieldname + '-' + uniqueSuffix+ '-' + ".jpg")
//     }
// })

// const upload = multer({ dest: '/images/category-images/',storage: categoryStorage });



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
router.get('/users-list',verifyLogin,(req,res)=>{
    adminHelpers.getUsersList().then((usersList)=>{
        res.render('admin/view-user-list', { usersList, admin: req.session.adminLogin, userUpdate:req.session.userUpdate });
        req.session.userUpdate=false;
    })
})

router.get('/delete-user/:userId',verifyLogin,(req,res)=>{
    adminHelpers.deleteUser(req.params.userId).then((response)=>{
        res.redirect('/admin/users-list');
    })
})

router.get('/edit-user/:userId',verifyLogin,(req,res)=>{
    adminHelpers.getUserDetails(req.params.userId).then((userDetails)=>{
        res.render('admin/edit-user', { userDetails, admin: req.session.adminLogin });
    })
})

router.post('/edit-user',verifyLogin,(req,res)=>{
    adminHelpers.EditUserDetails(req.body).then((response)=>{
        if (response) {
            req.session.userUpdate = "User Details Updated";
            res.redirect('/admin/users-list');
        } else {
            req.session.userUpdate = "Something went wrong";
            res.redirect('/admin/users-list');
        }
    })
})

router.get('/block-user/:userId', verifyLogin,(req,res)=>{
    adminHelpers.blockUser(req.params.userId).then((response)=>{
        console.log(response);
        if(response){
            req.session.userUpdate = "User Blocked";
            res.redirect('/admin/users-list');
        }else{
            req.session.userUpdate = "Something went wrong";
            res.redirect('/admin/users-list');
        }
    })
})

router.get('/unblock-user/:userId',verifyLogin, (req, res) => {
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

router.get('/add-category',verifyLogin,(req,res)=>{
    res.render('admin/add-category', { admin: req.session.adminLogin })
})

router.post('/add-category',verifyLogin,(req,res)=>{
    const image=req.files.image
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)+image.name;
    image.mv(`./public/images/category-images/${uniqueSuffix}`, (err, done) => {
        req.body.imageUrl =`${baseUrl}/images/category-images/${uniqueSuffix}`;

        adminHelpers.addCategory(req.body).then((response)=>{
            if(response.insertedId){
                res.redirect('/admin/view-category')
            }else{
                res.redirect('/admin/view-category')
            }
        })
    })
})

router.get('/view-category',verifyLogin,(req,res)=>{
    adminHelpers.getCategoryList().then((response)=>{
        res.render('admin/view-category', { categoryList: response, admin: req.session.adminLogin, categoryUpdate: req.session.categoryUpdate })
        req.session.categoryUpdate=false;
    })
})

router.get('/edit-category/:categoryId',verifyLogin,(req,res)=>{
    adminHelpers.getCategoryDetails(req.params.categoryId).then((categoryDetails)=>{
        res.render('admin/edit-category', { categoryDetails, admin: req.session.adminLogin });
    })
})

router.post('/edit-category', verifyLogin,(req,res)=>{
    adminHelpers.editCategory(req.body).then((response)=>{
        req.session.categoryUpdate ="Cateogry updated"
        res.redirect('/admin/view-category');
    })
})

router.get('/delete-category/:categoryId',(req,res)=>{
    adminHelpers.deleteCategory(req.params.categoryId).then((response)=>{
        res.redirect('/admin/view-category');
    })
})

router.get('/block-category/:categoryId',(req,res)=>{
    adminHelpers.changeStatus(req.params.categoryId,false).then((response)=>{
        res.redirect('/admin/view-category')
    })
})

router.get('/unblock-category/:categoryId',(req,res)=>{
    adminHelpers.changeStatus(req.params.categoryId,true).then((response)=>{
        res.redirect('/admin/view-category')
    })
})

module.exports = router;