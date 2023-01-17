const collection = require('../config/collection');
const db = require('../config/connection');
const bcrypt = require('bcrypt');
const verify = require('../helpers/otp_verification');
const { ObjectId } = require('mongodb');
const { razorpay } = require('../helpers/razorpay');
const { response } = require('express');



module.exports = {

    doSignup: function (userData) {
        return new Promise(async (resolve, reject) => {
            userData.joined_date = new Date();
            userData.address = [];
            userData.status = true;
            userData.wishlist = [];
            userData.orders = [];
            userData.cart = { products: [] };

            const user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            if (user) {
                resolve(false)
            } else {
                bcrypt.hash(userData.password, 10, function (err, hash) {
                    userData.password = hash;
                    db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((response) => {
                        resolve(true);
                    }).catch(() => reject())
                });
            }
        })
    },
    generateOtp: (userData) => {
        return new Promise(async (resolve, reject) => {
            const user = await db.get().collection(collection.USER_COLLECTION).findOne({ phone: userData.phone });
            if (!user) {
                verify.sendVerificationToken(userData.phone).then((response) => {
                    if (response) {
                        resolve({ status: true })
                    } else {
                        resolve({ status: false, message: "Something went wrong" })
                    }
                })
            } else {
                resolve({ status: false, message: "User already exists" })
            }
        })
    },
    verifyOtp: (otp, userData) => {
        return new Promise((resolve, reject) => {
            verify.checkVerificationToken(otp, userData.phone).then((response) => {
                if (response) {
                    resolve(response)
                } else {
                    resolve(response)
                }
            })
        })
    },
    doLogin: (data) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: data.email });
            if (user) {

                bcrypt.compare(data.password, user.password).then(function (result) {
                    if (result) {
                        if (user.status == true) {
                            resolve({ user, status: true })
                        } else {
                            resolve({ status: 'blocked' })
                        }
                    } else {
                        resolve({ status: false, message: "Incorrect username or password" })
                    }
                });

            } else {
                resolve({ status: false, message: "User not exists" })
            }
        })
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
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId) });
            if (user) {
                resolve(user.cart.products.length ?? 0)
            }
        })
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
            let isProductExits = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId), wishlist: ObjectId(productId) });
            if (isProductExits) {
                resolve(true);
            } else {
                resolve(false);
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
            console.log(err);
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
    }


}