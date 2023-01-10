var express = require('express');
var router = express.Router();
const userControllers = require('../controllers/userControllers');
const adminControllers = require('../controllers/adminControllers');
const bannerControllers = require('../controllers/bannerController');
const productControllers = require('../controllers/productControllers');
const categoryControllers = require('../controllers/categoryController');
const orderControllers = require('../controllers/orderController');
const { razorpayVerify } = require('../helpers/razorpay');
const verifyLogin = require('../middleware/userAuth');
const paginatedResults = require('../middleware/paginatedResults');

router.get('/', async function (req, res) {
  let cartCount = false;
  let categoryList = await categoryControllers.getCategory();
  let banner = await bannerControllers.getBanner();
  if (req.session.user) {
    cartCount = await userControllers.getCartCount(req.session.user._id)
  }
  const products = await productControllers.getProducts();
  res.render('user/index', { user: req.session.user, cartCount, categoryList, banner, products })
});


//user signup using phone no
router.get('/signup-phone', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    res.render('user/phone', { phoneError: req.session.phoneError })
    req.session.phoneError = false
  }
})

router.post('/signup-phone', (req, res) => {
  userControllers.generateOtp(req.body).then((response) => {
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
  if (req.session.otp) {
    res.redirect('/signup');
  } else {
    res.render('user/otp-verification', { otpError: req.session.otpError });
    req.session.otpError = false;
  }

})


router.post('/otp-verification', (req, res) => {
  if (req.session.loggedIn) {
    res.redirect('/')
  } else {
    userControllers.verifyOtp(req.body.otp, req.session.userPhone).then((response) => {
      if (response) {
        req.session.otp = true;
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
  userControllers.doSignup(req.body).then((response) => {
    if (response) {
      res.redirect('/login');
      req.session.otp = false;
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
  userControllers.doLogin(req.body).then((response) => {
    console.log(response);
    if (response.status === true) {
      req.session.loggedIn = true;
      req.session.user = response.user;
      res.redirect('/')
    } else if (response.status === "blocked") {
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
router.get('/account-suspended', (req, res) => {
  res.render('user/account-suspended')
})

//account page
router.get('/account', verifyLogin, async (req, res) => {
  const cartCount = await userControllers.getCartCount(req.session.user._id);
  res.render('user/account', { user: req.session.user, cartCount });
})


//product

//product details page
router.get('/product-details/:productId', async (req, res) => {
  let cartCount = false;
  if (req.session.user) {
    cartCount = await userControllers.getCartCount(req.session.user._id);
  }
  productControllers.getProductDetails(req.params.productId).then((product) => {
    res.render('user/product-details', { product, user: req.session.user, cartCount })
  })
})


//cart
router.get('/add-to-cat/:productId', verifyLogin, (req, res) => {
  userControllers.addToCart(req.params.productId, req.session.user._id).then(async (response) => {
    let cartCount = await userControllers.getCartCount(req.session.user._id)
    res.json({ status: true, cartCount })
  })
})

router.get('/cart', verifyLogin, async (req, res) => {
  let cartCount = await userControllers.getCartCount(req.session.user._id);
  let cartTotal = await userControllers.getCartTotal(req.session.user._id);
  userControllers.getCartProducts(req.session.user._id).then((response) => {
    res.render('user/cart', { cartItems: response, user: req.session.user, cartCount, cartTotal })
  })
})

router.post('/change-product-quantity', verifyLogin, (req, res) => {
  userControllers.updateCartProductCount(req.body, req.session.user._id).then(async (response) => {
    let cartTotal = await userControllers.getCartTotal(req.session.user._id);

    if (response) {
      res.json({ status: true, cartTotal })
    } else {
      res.json({ status: false, cartTotal })
    }
  }).catch((erro) => {
    res.json({ status: false })
  })
})


router.get('/remove-product/:productId', verifyLogin, (req, res) => {
  userControllers.deleteCartProduct(req.params.productId, req.session.user._id).then((response) => {
    res.redirect('/cart')
  })
})


//checkout page
router.get('/checkout', verifyLogin, async (req, res) => {
  let userDetails = await userControllers.getUserAdress(req.session.user._id);
  let cartTotal = await userControllers.getCartTotal(req.session.user._id);
  const cartCount = await userControllers.getCartCount(req.session.user._id);

  res.render('user/checkout', { userDetails, cartTotal, user: req.session.user, cartCount });
})


//checkout page
router.post('/add-new-address', verifyLogin, (req, res) => {
  userControllers.addNewAddress(req.body, req.session.user._id).then((response) => {
    res.redirect('/checkout');
  })
})

//billing
router.post('/confirm-address', async (req, res) => {
  let user = await userControllers.getAddress(req.body.addressId, req.session.user._id);
  if (user.address) {
    res.json({ status: true, addressId: req.body.addressId })
  } else {
    res.json({ address: false })
  }
})

router.get('/billing/:addressId', async (req, res) => {
  let cartTotal = await userControllers.getCartTotal(req.session.user._id);
  const cartCount = await userControllers.getCartCount(req.session.user._id);

  res.render('user/billing', { cartTotal, addressId: req.params.addressId, user: req.session.user, cartCount })
})


//order
router.post('/place-order', verifyLogin, async (req, res) => {
  try {
    let user = await userControllers.getAddress(req.body.addressId, req.session.user._id);
    if (user) {
      if (user.activeOrder) {
        const activeOrder = await orderControllers.getActiveOrder(user.activeOrder);
        let cartTotal = await userControllers.getCartTotal(req.session.user._id);
        if (!activeOrder) {
          let details = await orderControllers.placeOrder(req.body.phone, req.body.paymentMethod, user, cartTotal);
          userControllers.generateRazorpay(details.response.insertedId, cartTotal).then((response) => {
            if (req.body.paymentMethod == "COD") {
              res.json({ codSuccess: true })
            } else {
              response.user = req.session.user;
              res.json(response)
            }
          }).catch(() => {
            res.json({ status: false })
          })
        } else {
          userControllers.generateRazorpay(user.activeOrder, cartTotal).then((response) => {
            if (req.body.paymentMethod == "COD") {
              res.json({ codSuccess: true })
            } else {
              response.user = req.session.user;
              res.json(response)
            }
          }).catch(() => {
            res.json({ status: false })
          })
        }
      }
    } else {
      res.json({ status: false })
    }
  } catch (err) {
    res.json({ status: false })

  }
})

router.get('/orders', verifyLogin, (req, res) => {
  orderControllers.getMyOrders(req.session.user._id).then(async (response) => {
    const cartCount = await userControllers.getCartCount(req.session.user._id);
    res.render('user/orders', { orders: response, user: req.session.user, cartCount });
  })
})

router.get('/order-details/:orderId', (req, res) => {
  orderControllers.getOrderDetails(req.params.orderId).then(async (response) => {
    const cartCount = await userControllers.getCartCount(req.session.user._id);

    res.render('user/order-details', { order: response, user: req.session.user, cartCount });
  }).catch(() => { res.redirect('/orders') })
})

// cancel order
router.get("/cancel-order/:orderId", (req, res) => {
  orderControllers.cancelOrder(req.params.orderId).then((response) => {
    res.json({ status: true })
  })
})

//order success
router.get('/order-success', (req, res) => {
  res.render('user/order-success');
})



//payment
router.post('/verify-payment', async (req, res) => {
  razorpayVerify(req.body).then((response) => {
    orderControllers.changeOrderStatus(req.body['order[receipt]'],req.session.user._id).then((response) => {
      res.json({ status: true })
    }).catch(() => {
      res.json({ status: false })
    })
  }).catch(() => {
    res.json({ status: false })
  })
})



//category listing 
router.get('/product-listing/:categoryId', paginatedResults(), async (req, res) => {
  let cartCount = 0

  if (req.session.user) {
    cartCount = await userControllers.getCartCount(req.session.user._id);
  }
  res.render('user/product-listing', { results: res.paginatedResults, user: req.session.user, cartCount });
})

//search

router.get('/search/:key', async (req, res) => {
  let searchResult = await userControllers.getSearchResult(req.params.key);
  res.json({ searchResult })
})


router.get('/update-val', (req, res) => {
  userControllers.upval();
})



module.exports = router;
