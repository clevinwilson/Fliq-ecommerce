var express = require('express');
var router = express.Router();
const userHelpers = require('../helpers/user-helpers');

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next()
  } else {
    res.redirect('/')
  }
}

/* GET users listing. */
router.get('/', function (req, res) {
  res.render('user/index', { user: req.session.user })
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
  console.log(req.session.otpError);
  res.render('user/otp-verification', { otpError: req.session.otpError });
  req.session.otpError = false;
})


router.post('/otp-verification', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    userHelpers.verifyOtp(req.body.otp, req.session.userPhone).then((response) => {
      if (response) {
        res.render('user/signup', { signupError: req.session.signupError });
        req.session.signupError = false;
      } else {
        req.session.otpError = "OTP Not Match";
        res.redirect('/otp-verification');
      }
    })
  }
})




// router.get('/signup', (req, res) => {
//   if (req.session.loggedIn) {
//     res.redirect('/')
//   } else {
//     res.render('user/signup', { signupError: req.session.signupError })
//     req.session.signupError = false
//   }
// })

router.post('/signup', (req, res) => {
  req.body.phone = req.session.userPhone.phone;
  userHelpers.doSignup(req.body).then((response) => {
    if (response) {
      res.redirect('/login');
    } else {
      req.session.signupError = "User already exists ";
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
    if (response.status) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      res.redirect('/')
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

module.exports = router;
