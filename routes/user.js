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
const getInvoice = require('../helpers/invoice');
const csrf = require('csurf')
const csrfProtection = csrf({ cookie: true });
const getCartCount = require('../middleware/cartCount');



router.get('/', getCartCount, async function (req, res) {
  let categoryList = await categoryControllers.getCategory();
  let banner = await bannerControllers.getBanner();
  const products = await productControllers.getProducts();
  res.render('user/index', { user: req.session.user, cartCount: res.cartCount, categoryList, banner, products })
});


//user signup using phone no //phone and otp
router.get('/signup-phone', userControllers.signupUsingPhone);
router.post('/signup-phone', userControllers.generateOtp);
router.get('/otp-verification', userControllers.otpVerification);
router.post('/otp-verification', userControllers.verifyOtp);


//signup//login
router.get('/signup', userControllers.signup);
router.post('/signup', userControllers.doSignup);
router.get('/login', userControllers.login);
router.post('/login', userControllers.doLogin);
router.get('/logout', userControllers.logout);

//account-suspended
router.get('/account-suspended', userControllers.assoutSuspended)
//account page
router.get('/account', verifyLogin, getCartCount, userControllers.account)


//product
//product details page
router.get('/product-details/:productId', getCartCount, async (req, res) => {
  let cartCount = res.cartCount;
  let wishListStatus = false;
  let productinCart = false;
  if (req.session.user) {
    wishListStatus = await userControllers.productExistWishlist(req.session.user._id, req.params.productId).catch(() => {
      res.render('/error')
    })
    productinCart = await userControllers.productExistCart(req.session.user._id, req.params.productId);
  }
  productControllers.getProductDetails(req.params.productId).then((product) => {
    userControllers.getProductReviews(req.params.productId).then((review) => {
      res.render('user/product-details', { product, user: req.session.user, cartCount, wishListStatus, productinCart, review })
    }).catch(() => {
      res.render('/error')
    })
  }).catch(() => {
    res.render('/error')
  })
})


//buynow
router.get('/buy-now/:productId', verifyLogin, userControllers.buyNow)

//cart
router.get('/add-to-cat/:productId', verifyLogin, (req, res) => {
  userControllers.addToCart(req.params.productId, req.session.user._id).then(async (response) => {
    if (response) {
      let cartCount = await userControllers.getCartCount(req.session.user._id);
      console.log(cartCount);
      res.json({ status: true, cartCount })
    } else {
      res.json({ status: false })
    }
  })
})

router.get('/cart', verifyLogin, getCartCount, async (req, res) => {
  let cartTotal = await userControllers.getCartTotal(req.session.user._id);
  userControllers.getCartProducts(req.session.user._id).then((response) => {
    res.render('user/cart', { cartItems: response, user: req.session.user, cartCount: res.cartCount, cartTotal })
  })
})

router.post('/change-product-quantity', verifyLogin, (req, res) => {
  userControllers.updateCartProductCount(req.body, req.session.user._id).then(async (response) => {
    let cartTotal = await userControllers.getCartTotal(req.session.user._id);

    if (response.quantityError) {
      res.json({ quantityError: true, cartTotal })
    } else if (response) {
      res.json({ status: true, cartTotal })
    } else {
      res.json({ status: false, cartTotal })
    }
  }).catch((erro) => {
    res.json({ status: false })
  })
})


router.get('/remove-product/:productId', verifyLogin, userControllers.deleteCartProduct)


//checkout page
router.get('/checkout', verifyLogin, getCartCount, async (req, res) => {
  let userDetails = await userControllers.getUserAdress(req.session.user._id);
  let cartTotal = await userControllers.getCartTotal(req.session.user._id);
  let discountedPriceDetails = false;
  if (userDetails.cart.discountedPrice) {
    discountedPriceDetails = await userControllers.applyCoupon(userDetails.cart.coupon, cartTotal, req.session.user._id)
  }
  res.render('user/checkout', { userDetails, cartTotal, user: req.session.user, cartCount: res.cartCount, discountedPriceDetails: discountedPriceDetails });
})


//checkout page
router.post('/add-new-address', verifyLogin, userControllers.addNewAddress)

//billing
router.post('/confirm-address', async (req, res) => {
  let user = await userControllers.getAddress(req.body.addressId, req.session.user._id);
  if (user.address) {
    res.json({ status: true, addressId: req.body.addressId })
  } else {
    res.json({ address: false })
  }
})

router.get('/billing/:addressId', verifyLogin, getCartCount, async (req, res) => {
  let cartTotal = await userControllers.getCartTotal(req.session.user._id);
  res.render('user/billing', { cartTotal, addressId: req.params.addressId, user: req.session.user, cartCount: res.cartCount })
})


//order
router.post('/place-order', verifyLogin, async (req, res) => {
  try {
    let user = await userControllers.getAddress(req.body.addressId, req.session.user._id);
    if (user) {
      const activeOrder = await orderControllers.getActiveOrder(user.activeOrder);
      let totalPrice = await userControllers.getCartTotal(req.session.user._id);
      user.originalPrice = totalPrice;
      if (user.cart.discountedPrice) {
        totalPrice = user.cart.discountedPrice;
      }
      if (!activeOrder) {
        if (req.body.paymentMethod == "COD") {
          orderControllers.placeOrder(user.phone, req.body.paymentMethod, user, totalPrice).then((details) => {
            orderControllers.changeOrderStatus(details.response.insertedId, req.session.user._id).then((response) => {
              res.json({ codSuccess: true })
            })
          })
        } else {
          let details = await orderControllers.placeOrder(user.phone, req.body.paymentMethod, user, totalPrice);
          userControllers.generateRazorpay(details.response.insertedId, totalPrice).then((response) => {

            response.user = req.session.user;
            res.json(response)
          }).catch(() => {
            res.json({ status: false })
          })
        }
      }


      else {
        if (req.body.paymentMethod == "COD") {
          orderControllers.changeOrderStatus(user.activeOrder, req.session.user._id).then((response) => {
            res.json({ codSuccess: true })
          })
        } else {
          userControllers.generateRazorpay(user.activeOrder, totalPrice).then((response) => {
            response.user = req.session.user;
            res.json(response)
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

router.get('/orders', verifyLogin, getCartCount, orderControllers.getMyOrders)
router.get('/order-details/:orderId', verifyLogin, getCartCount, orderControllers.getOrderDetails)
// cancel order
router.get("/cancel-order/:orderId", verifyLogin, orderControllers.cancelOrder)
//order success
router.get('/order-success', verifyLogin, orderControllers.orderSuccess)



//payment
router.post('/verify-payment', async (req, res) => {
  razorpayVerify(req.body).then((response) => {
    orderControllers.changeOrderStatus(req.body['order[receipt]'], req.session.user._id).then((response) => {
      res.json({ status: true })
    }).catch(() => {
      res.json({ status: false })
    })
  }).catch(() => {
    res.json({ status: false })
  })
})



//category listing 
router.get('/product-listing/:categoryId', paginatedResults(), getCartCount, userControllers.categorListing)

//search
router.get('/search/:key', async (req, res) => {
  let searchResult = await userControllers.getSearchResult(req.params.key);
  res.json({ searchResult })
})

//wishlist 
router.get('/wishlist', verifyLogin, getCartCount, userControllers.getWishList)
router.get('/add-to-wishList/:productId', verifyLogin, userControllers.addToWishlist)
router.get('/deleteWishList/:productId', verifyLogin, userControllers.deleteFromWishList)
router.get('/move-to-wishlist/:productId', verifyLogin, userControllers.moveToWishlist)

//profile
router.get('/profile', verifyLogin, csrfProtection, getCartCount, userControllers.getUserDetails)
router.post('/update-profile', verifyLogin, csrfProtection, userControllers.updateUserProfile)


// coupon
router.post('/apply-coupon/', verifyLogin, async (req, res) => {
  let cartTotal = await userControllers.getCartTotal(req.session.user._id);
  userControllers.applyCoupon(req.body.coupon, cartTotal, req.session.user._id).then((response) => {
    if (response) {
      res.json({ status: true, response })
    } else {
      res.json({ status: false })
    }
  })

})
router.get('/remove-coupon', verifyLogin, userControllers.removeCoupon)
router.get('/coupon', userControllers.getAllCoupon)

// invoice
router.get('/download-invoice/:orderId/:userId', verifyLogin, (req, res) => {
  userControllers.getOrderForInvoice(req.params.orderId, req.params.userId).then(async (order) => {
    let cartTotal = await userControllers.getCartTotal(req.session.user._id);
    let invoice = await getInvoice(order, cartTotal);
    res.json({ status: true, invoice })
  })
  // res.json({status:true,data:invoice})
})


//address
router.get('/address-management', verifyLogin, userControllers.getUserAllAddress);
router.get('/edit-address/:addressId', verifyLogin, userControllers.getUserAddress);
router.post('/update-address', verifyLogin, userControllers.updateUserAddress);
router.get('/delete-address/:addressId', verifyLogin, userControllers.deleteAddress);

//change password
router.post('/check-password', verifyLogin, csrfProtection, userControllers.checkPassord);
router.post('/verify-otp', verifyLogin, csrfProtection, userControllers.verifyOtpInChangePassword);
router.post('/update-password', verifyLogin, csrfProtection, userControllers.updatePassword);

//review
router.post('/add-review', verifyLogin, userControllers.AddReview);

//wallet
router.get('/wallet',verifyLogin,userControllers.userWallet);

//return
router.get('/return/:orderId', verifyLogin, orderControllers.initiateReturn)

module.exports = router;
