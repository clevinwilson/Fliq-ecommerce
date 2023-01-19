const collection = require('../config/collection');
const db = require('../config/connection');
const bcrypt = require('bcrypt');
const verify = require('../helpers/otp_verification');
const { ObjectId } = require('mongodb');
const { razorpay } = require('../helpers/razorpay');




module.exports = {

    doSignup:async function (req,res) {
          try{
              req.body.phone = req.session.userPhone.phone;
              req.body.joined_date = new Date();
              req.body.address = [];
              req.body.status = true;
              req.body.wishlist = [];
              req.body.orders = [];
              req.body.cart = { products: [] };

              const user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: req.body.email })
              if (user) {
                  req.session.signupError = "Email already exists ";
                  res.redirect('/signup')
              } else {
                  bcrypt.hash(req.body.password, 10, function (err, hash) {
                      req.body.password = hash;
                      db.get().collection(collection.USER_COLLECTION).insertOne(req.body).then((response) => {
                          res.redirect('/login');
                          req.session.otp = false;
                      })
                  });
              }
          }catch(err){
            res.render('/error');
          }
    },
    signupUsingPhone: (req,res) => {
        try {
            if (req.session.loggedIn) {
                res.redirect('/')
            } else {
                res.render('user/phone', { phoneError: req.session.phoneError })
                req.session.phoneError = false
            }
        } catch (err) {
            res.render('/error')
        }
    },
    generateOtp: async (req, res) => {
        try {
            const user = await db.get().collection(collection.USER_COLLECTION).findOne({ phone: req.body.phone });
            if (!user) {
                verify.sendVerificationToken(req.body.phone).then((response) => {
                    if (response) {
                        req.session.userPhone = req.body;
                        res.redirect('/otp-verification')
                    } else {
                        req.session.phoneError = "Something went wrong";
                        res.redirect('/signup-phone');
                    }
                })
            } else {
                req.session.phoneError = "User already exists";
                res.redirect('/signup-phone');
            }
        } catch (err) {
            res.render('/error');
        }
    },
    otpVerification: (req, res) => {
        if (req.session.otp) {
            res.redirect('/signup');
        } else {
            res.render('user/otp-verification', { otpError: req.session.otpError });
            req.session.otpError = false;
        }
    },
    verifyOtp: (req, res) => {
        try {
            if (req.session.loggedIn) {
                res.redirect('/')
            } else {
                verify.checkVerificationToken(req.body.otp, req.session.userPhone.phone).then((response) => {
                    console.log(response);

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
        } catch (err) {
            res.render('/error');
        }
    },
    signup: (req, res) => {
        if (req.session.loggedIn) {
            res.redirect('/')
        } else {
            res.render('user/signup', { signupError: req.session.signupError })
            req.session.signupError = false
        }
    },
    login:(req,res)=>{
        try{
            if (req.session.loggedIn) {
                res.redirect('/');
            } else {
                res.render('user/login', { LoginError: req.session.LoginError });
                req.session.LoginError = false
            }
        }catch(err){
            res.render('/error');
        }
    },
    doLogin: async(req,res) => {
        try{
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: req.body.email });
            if (user) {

                bcrypt.compare(req.body.password, user.password).then(function (result) {
                    if (result) {
                        if (user.status == true) {
                            req.session.loggedIn = true;
                            req.session.user = user
                            res.redirect('/')
                        } else {
                            res.render('user/account-suspended')
                        }
                    } else {
                        req.session.LoginError = "Incorrect username or password";
                        res.redirect('/login')
                    }
                });

            } else {
                req.session.LoginError = "User not exists";
                res.redirect('/login')
            }
        }catch(err){
            res.render('/error');
        }
    },
    logout:(req,res)=>{
        try{
            req.session.destroy();
            res.redirect('/');
        }catch(err){
            res.render('/error');
        }
    },
    assoutSuspended:(req,res)=>{
        res.render('user/account-suspended')
    },
    account:(req,res)=>{
        try{
            res.render('user/account', { user: req.session.user, cartCount: res.cartCount });
        }catch(err){
            res.render('/error');

        }
    },
    addToCart: async (productId, userId) => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: ObjectId(productId) })
            const productObject = {
                product: ObjectId(productId),
                name: product.name,
                description: product.name,
                quantity: 1,
                "tax-rate": 0,
                price: product.price,
            }
            if (!product) {
                resolve(false);
            }
            if (product.quantity > 0) {

                const user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId) });
                console.log(user);
                const productExists = user.cart.products.findIndex(products => products.product == productId);
                if (productExists != -1) {
                    db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId), 'cart.products.product': ObjectId(productId) },
                        {
                            $unset: { activeOrder: "" },
                            $inc: { 'cart.products.$.quantity': 1 }
                        }).then((response) => {
                            resolve(true);
                        })
                }
                else {
                    db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, {
                        $unset: { activeOrder: "" },
                        $push: { 'cart.products': productObject }
                    }).then((response) => {
                        resolve(true);
                    })
                }
            } else {
                resolve(false)
            }

        })
    },
    getCartCount: (userId) => {
       
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectId(userId) }
                },
                {
                    $unwind: '$cart.products'
                },
                {
                    $project: {
                        item: '$cart.products.product',
                        quantity: '$cart.products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()

            resolve(cart)
        })
    },
    updateCartProductCount: (data, userId) => {
        return new Promise(async (resolve, reject) => {
            let productQuantity = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: ObjectId(data.productId) });
            if (data.quantity < productQuantity.quantity || data.count == -1) {
                if (data.count == -1 && data.quantity == 1) {
                    db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, {
                        $unset: { activeOrder: "" },
                        $pull: { 'cart.products': { product: ObjectId(data.productId) } }
                    }).then((response) => {
                        resolve(false)
                    })
                } else {
                    db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId), 'cart.products.product': ObjectId(data.productId) },
                        {
                            $unset: { activeOrder: "" },
                            $inc: { 'cart.products.$.quantity': parseInt(data.count) }
                        }).then((response) => {
                            resolve(true);
                        }).catch((err) => {
                            reject();
                        })
                }
            }
            else {
                resolve({ quantityError: true })
            }
        })
    },
    deleteCartProduct: (productId, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, {
                $pull: { 'cart.products': { product: ObjectId(productId) } }
            }).then((response) => {
                resolve()
            })
        })
    },
    getCartTotal: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartTotal = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectId(userId) }
                },
                {
                    $unwind: '$cart.products'
                },
                {
                    $project: {
                        product: '$cart.products.product',
                        quantity: '$cart.products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'product',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: { _id: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] } }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ["$quantity", "$product.price"] } }
                    }
                }
            ]).toArray();
            if (cartTotal.length) {
                resolve(cartTotal[0].total);
            } else {
                resolve(false)
            }
        })
    },
    addNewAddress: (data, userId) => {
        return new Promise((resolve, reject) => {
            data.default = false;
            data.id = Date.now() + '-' + Math.round(Math.random() * 1E9)

            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, {
                $push: { address: data }
            }).then((response) => {
                resolve(response)
            })
        })
    },
    getUserAdress: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId) }).then((userDetails) => {
                resolve(userDetails)
            })
        })
    },
    getAddress: (addressId, userId) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectId(userId) }
                },
                {
                    $unwind: "$address"
                },
                {
                    $match: { 'address.id': addressId }
                }
            ]).toArray();
            if (user[0]) {
                resolve(user[0])
            } else {
                resolve(false)
            }
        })
    },
    // placeOrder: (phone, details, cartTotal) => {
    //     return new Promise((resolve, reject) => {
    //         details.address.phone = phone;
    //         orderObj = {
    //             id: Date.now() + '-' + Math.round(Math.random() * 1E9),
    //             deliveryDetails: details.address,
    //             paymentMethod: 'COD',
    //             paymentstatus: "placed",
    //             products: details.cart,
    //             totalAmount: cartTotal,
    //             shipmentStatus: 'Order Placed'
    //         }
    //         db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(details._id) }, { $push: { orders: orderObj } }).then((response) => {
    //             db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(details._id) }, {
    //                 $set: {
    //                     cart: []
    //                 }
    //             })
    //             resolve({ status: true })
    //         })
    //     })
    // }


    // getOrderDetails:(userId)=>{
    //     return new Promise(async (resolve, reject) => {
    //         let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
    //             {
    //                 $match: { userId: ObjectId(userId) }
    //             },
    //             {
    //                 $unwind: '$products'
    //             },
    //             {
    //                 $project: {
    //                     paymentMethod: 1,
    //                     totalAmount: 1,
    //                     item: '$products.product',
    //                     quantity: '$products.quantity',
    //                     orderStatus: 1,
    //                     date: 1,
    //                     shipmentStatus: 1
    //                 }
    //             },
    //             {
    //                 $lookup: {
    //                     from: collection.PRODUCT_COLLECTION,
    //                     localField: 'item',
    //                     foreignField: '_id',
    //                     as: 'product'
    //                 }
    //             },
    //             {
    //                 $project: {
    //                     item: 1, paymentstatus: 1, paymentMethod: 1, orderStatus: 1, date: 1, shipmentStatus: 1, totalAmount: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
    //                 }
    //             }
    //         ]).toArray()

    //         resolve(orders)
    //     })
    // }

    generateRazorpay: (orderId, totalAmount) => {
        totalAmount = Math.floor(totalAmount)
        return new Promise((resolve, reject) => {
            razorpay(orderId, totalAmount).then((order) => {
                resolve(order);
            }).catch((err) => {
                console.log(err);
                reject();
            })
        })
    },
    getSearchResult: (key) => {
        return new Promise((resolve, reject) => {
            key = key.replace(/[^a-zA-Z ]/g, "")
            db.get().collection(collection.PRODUCT_COLLECTION).find(
                {
                    $or: [
                        { name: { $regex: key, $options: 'i' } },
                        { type: { $regex: key, $options: 'i' } },
                        { brand: { $regex: key, $options: 'i' } },
                        { color: { $regex: key, $options: 'i' } },
                    ]
                }
            ).limit(16).toArray().then((response) => {
                resolve(response);
            })
        })
    },
    addToWishlist: (productId, userId) => {
        return new Promise(async (resolve, reject) => {
            let isProductExits = await db.get().collection(collection.USER_COLLECTION).findOne({ $and: [{ _id: ObjectId(userId) }, { wishlist: ObjectId(productId) }] });

            if (isProductExits) {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, { $pull: { wishlist: ObjectId(productId) } });
                resolve({ remove: true })
            } else {
                console.log("push");
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, { $push: { wishlist: ObjectId(productId) } }).then((response) => {
                    resolve({ insert: true })
                }).catch(() => {
                    resolve(false)
                })
            }
        })
    },
    productExistWishlist: (userId, productId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let isProductExits = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId), wishlist: ObjectId(productId) });
                if (isProductExits) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            } catch (err) {
                reject()
            }
        })
    },
    getWishList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wishList = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectId(userId) }
                },
                {
                    $lookup:
                    {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'wishlist',
                        foreignField: '_id',
                        as: 'products'
                    }
                },
                {
                    $project: { products: 1 }
                }
            ]).toArray();
            resolve(wishList[0].products);
        })
    },
    deleteFromWishList: (productId, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) },
                {
                    $pull: { wishlist: ObjectId(productId) }
                }
            ).then((response) => {
                resolve();
            })
        })
    },
    moveToWishlist: (productId, userId) => {
        console.log(productId, userId);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) },
                { $pull: { 'cart.products': { product: ObjectId(productId) } } }
            ).then((response) => {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) },
                    { $push: { wishlist: ObjectId(productId) } }, { upsert: true }).then((response) => {
                        resolve();
                    })
            })
        })
    },
    productExistCart: (userId, productId) => {
        return new Promise(async (resolve, reject) => {
            let isProductExits = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId), 'cart.products.product': ObjectId(productId) });
            if (isProductExits) {
                resolve(true);
            } else {
                resolve(false);
            }
        })
    },
    getUserDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId) }).then((response) => {
                resolve(response)
            })
        })
    },
    updateUserProfile: (userDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userDetails.userId) }, {
                $set: {
                    fname: userDetails.fname,
                    lname: userDetails.lname,

                    dateOfbirth: userDetails.dateOfbirth
                }
            }).then((response) => {
                // email: userDetails.email,
                //     phone: userDetails.phone,
                resolve(response)
            })
        })
    },
    applyCoupon: (coupon, cartTotal, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).findOne({ couponCode: coupon }).then((couponDetails) => {
                if (couponDetails && cartTotal >= parseInt(couponDetails.minimumPurchase) && cartTotal <= parseInt(couponDetails.maximumPurchase)) {
                    let savingPrice = (cartTotal * (parseInt(couponDetails.couponDiscount) / 100));
                    let discountedPrice = cartTotal - savingPrice;
                    db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, {
                        $set: {
                            'cart.discountedPrice': discountedPrice,
                            'cart.savingPrice': savingPrice,
                            'cart.coupon': coupon,
                        }
                    }).then((response) => {
                        console.log(response, ">dsfsdfsdf");
                        resolve({ savingPrice, discountedPrice });
                    }).catch((response) => {
                        resolve(false);
                    })
                } else {
                    resolve(false)
                }
            })
        })
    },
    removeCoupon: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, {
                $unset: { 'cart.discountedPrice': "", 'cart.savingPrice': "", 'cart.coupon': "" }
            }).then((response) => {
                resolve(true)
            }).catch(() => {
                resolve(false)
            })
        })
    },
    getOrderForInvoice: (orderId, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: ObjectId(orderId), userId: ObjectId(userId) }).then((response) => {
                resolve(response)
            }).catch(() => {
                resolve(false)
            })
        })
    },
    getAllCoupon: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).find().toArray().then((coupons) => {
                resolve(coupons)
            }).catch(() => {
                reject();
            })
        })
    },
    getUserAllAddress: (req, res) => {
        try {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(req.session.user._id) }).then((response) => {
                console.log(response.address);
                res.render('user/address', { user: req.session.user, address: response.address });
            })
        } catch (err) {
            res.redirect('/')
        }
    },
    getUserAddress: async (req, res) => {
        try {
            let user = await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectId(req.session.user._id) }
                },
                { $unwind: "$address" },
                {
                    $match: { 'address.id': req.params.addressId }
                }
            ]).toArray()
            console.log(user);
            res.render('user/edit-address', { address: user[0].address })
        } catch (err) {
            res.render('/error');
        }
    },
    updateUserAddress: async (req, res) => {
        try {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(req.session.user._id), "address.id": req.body.addressId }, {
                $set: {
                    "address.$.firstName": req.body.firstName,
                    "address.$.lastName": req.body.lastName,
                    "address.$.street": req.body.street,
                    "address.$.AddressLine2": req.body.AddressLine2,
                    "address.$.Landmark": req.body.Landmark,
                    "address.$.postalCode": req.body.postalCode,
                    "address.$.state": req.body.state,
                    "address.$.country": req.body.country
                }
            }).then((response) => {
                res.json({ status: true })
            })
        } catch (err) {

        }
    },
    deleteAddress: async (req, res) => {
        console.log(req.params.addressId);
        try {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(req.session.user._id) }, {
                $pull: { address: { id: req.params.addressId } }
            }).then((response) => {
                res.redirect('/address-management')
            })
        } catch (err) {
            console.log(err);
        }
    },
    checkPassord: async (req, res) => {
        try {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(req.body.userId) });
            if (user) {
                bcrypt.compare(req.body.password, user.password).then(function (result) {
                    if (result) {
                        if (user.status == true) {
                            verify.sendVerificationToken(req.body.phone).then((response) => {
                                if (response) {
                                    res.json({ status: true, message: "OTP send" })
                                } else {
                                    res.json({ status: false, message: "Something went wrong" })

                                }
                            })
                        } else {
                            req.json({ status: 'blocked', message: "User Blocked" })
                        }
                    } else {
                        res.json({ status: false, message: "Incorrect username or password" })
                    }
                });

            } else {
                res.josn({ status: false, message: "User not exists" })
            }
        } catch (err) {
            res.josn({ status: false, message: "Something went wrong" })

        }
    },
    verifyOtpInChangePassword: (req, res) => {
        try {
            verify.checkVerificationToken(req.body.otp, req.body.phone).then((response) => {
                if (response) {
                    res.json({ status: true, message: "OTP verified successfully " })
                } else {
                    res.json({ status: false, message: "Incorrect OTP" })
                }
            })
        } catch (err) {
            res.json({ status: false, message: "Something went wrong" })
        }
    },
    updatePassword: async (req, res) => {
        try {
            if (req.body.password === req.body.confirmPassword) {
                let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(req.body.userId) })
                if (user) {
                    bcrypt.hash(req.body.password, 10, function (err, hash) {
                        req.body.password = hash;
                        db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(req.body.userId) }, {
                            $set: {
                                password: req.body.password
                            }
                        }).then((response) => {
                            res.json({ status: true, message: "Password Updated Successfully" })
                        })
                    });
                } else {
                    res.json({ status: false, message: "User Not exists" })
                }
            } else {
                res.json({ status: false, message: "Password Not Matching" })
            }

        } catch (err) {
            res.json({ status: false, message: "Something went wrong" })
        }
    },
    AddReview: (req, res) => {
        console.log(req.body);
        try {
            req.body.orderId = ObjectId(req.body.orderId);
            req.body.productId = ObjectId(req.body.productId);
            req.body.userId = ObjectId(req.body.userId);
            req.body.like = 0;
            req.body[req.body.rating] = true;
            req.body.date = new Date().toString().slice(0, 21);


            db.get().collection(collection.REVIEW_COLLECTION).insertOne(req.body).then((response) => {
                res.json({ status: true, message: "review added" })
            })
        } catch (err) {
            req.json({ status: false })
        }
    },
    getProductReviews: (productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.REVIEW_COLLECTION).aggregate([
                {
                    $match: { productId: ObjectId(productId) }
                },
                {
                    $lookup: {
                        from: collection.USER_COLLECTION,
                        localField: 'userId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
            ]).toArray().then((reviews) => {
                resolve(reviews)
            }).catch(() => {
                reject(false)
            })
        })

    },
    buyNow: async (req, res) => {
        let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: ObjectId(req.params.productId) });
        const productObject = {
            product: ObjectId(req.params.productId),
            name: product.name,
            description: product.name,
            quantity: 1,
            "tax-rate": 0,
            price: product.price,
        }
        if (!product) {
            res.render('/error');
        }
        if (product.quantity > 0) {

            const user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(req.session.user._id) });
            console.log(user);
            const productExists = user.cart.products.findIndex(products => products.product == req.params.productId);
            if (productExists != -1) {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(req.session.user._id), 'cart.products.product': ObjectId(req.params.productId) },
                    {
                        $unset: { activeOrder: "" },
                        $inc: { 'cart.products.$.quantity': 1 }
                    }).then((response) => {
                        res.redirect('/cart');
                    })
            }
            else {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(req.session.user._id) }, {
                    $unset: { activeOrder: "" },
                    $push: { 'cart.products': productObject }
                }).then((response) => {
                    res.redirect('/cart');
                })
            }
        } else {
            res.render('/error');
        }
    }


}