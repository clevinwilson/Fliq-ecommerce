var express = require('express');
var router = express.Router();
const userHelpers = require('../helpers/user-helpers');
const adminHelpers = require('../helpers/admin-helpers');

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/')
  }
}

/* GET users listing. */
router.get('/',async function (req, res) {
  let categoryList=await userHelpers.getCategory();
  let banner=await adminHelpers.getBanner();
  res.render('user/index', { user: req.session.user, categoryList, banner })
});


//user signup using phone
router.get('/signup-phone', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/phone', { phoneError: req.session.phoneError })
    req.session.phoneError = false
  }
})

router.post('/signup-phone', (req, res) => {
  userHelpers.generateOtp(req.body).then((response) => {
    if (response.status) {
      req.session.userPhone = req.body;
      res.redirect('/otp-verification')
    } else {
      req.session.phoneError = response.message;
      res.redirect('/signup-phone');
    }
  })
})


//phone and otp
router.get('/otp-verification', (req, res) => {
  if (req.session.otp){
    res.redirect('/signup');
  }else{
    res.render('user/otp-verification', { otpError: req.session.otpError });
    req.session.otpError = false;
  }
  
})


router.post('/otp-verification', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    userHelpers.verifyOtp(req.body.otp, req.session.userPhone).then((response) => {
      if (response) {
        req.session.otp=true;
        res.redirect('/signup');
        req.session.signupError = false;
      } else {
        req.session.otpError = "OTP Not Match";
        res.redirect('/otp-verification');
      }
    })
  }
})


//signup

router.get('/signup', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/signup', { signupError: req.session.signupError })
    req.session.signupError = false
  }
})

router.post('/signup', (req, res) => {
  req.body.phone = req.session.userPhone.phone;
  userHelpers.doSignup(req.body).then((response) => {
    if (response) {
      res.redirect('/login');
      req.session.otp=false;
    } else {
      req.session.signupError = "Email already exists ";
      res.redirect('/signup')
    }
  })
})


//login
router.get('/login', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/');
  } else {
    res.render('user/login', { LoginError: req.session.LoginError });
    req.session.LoginError = false
  }
})

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    console.log(response);
    if (response.status===true) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      res.redirect('/')
    } else if (response.status ==="blocked"){
      res.render('user/account-suspended')
    } else {
      req.session.LoginError = response.message;
      res.redirect('/login')
    }
  })
})

//logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
})

//account-suspended
router.get('/account-suspended',(req,res)=>{
  res.render('user/account-suspended')
})

//account page
router.get('/account',(req,res)=>{
  res.render('user/account',{user:req.session.user});
})


//product details page
router.get('/product-details',(req,res)=>{
  res.render('user/product-details',{user:true})
})
module.exports = router;
