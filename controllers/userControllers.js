const collection = require('../config/collection');
const db = require('../config/connection');
const bcrypt = require('bcrypt');
const verify = require('../helpers/otp_verification');
const { ObjectId } = require('mongodb');
const { razorpay } = require('../helpers/razorpay');



module.exports = {

    doSignup: function (userData) {
        return new Promise(async (resolve, reject) => {
            userData.joined_date = new Date();
            userData.address = [];
            userData.status = true;
            userData.wishlist = [];
            userData.orders = [];
            userData.cart = [];

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
   
    addToCart: (productId, userId) => {
        const productObject = {
            product: ObjectId(productId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            const user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId) });
            const productExists = user.cart.findIndex(products => products.product == productId);
            if (productExists != -1) {
                db.get().collection(collection.USER_COLLECTION).updateOne({ 'cart.product': ObjectId(productId) },
                    {
                        $inc: { 'cart.$.quantity': 1 }
                    }).then((response) => {
                        resolve();
                    })
            }
            else {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, {
                    $push: { cart: productObject }
                }).then((response) => {
                    resolve();
                })
            }

        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId) });
            if (user) {
                resolve(user.cart.length ?? 0)
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
                    $unwind: '$cart'
                },
                {
                    $project: {
                        item: '$cart.product',
                        quantity: '$cart.quantity'
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
        return new Promise((resolve, reject) => {
            console.log(data);
            if (data.count == -1 && data.quantity == 1) {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, {
                    $pull: { cart: { product: ObjectId(data.productId) } }
                }).then((response) => {
                    resolve(false)
                })
            } else {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId), 'cart.product': ObjectId(data.productId) },
                    {
                        $inc: { 'cart.$.quantity': parseInt(data.count) }
                    }).then((response) => {
                        resolve(true);
                    }).catch((err) => {
                        reject();
                    })
            }
        })
    },
    deleteCartProduct: (productId, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) }, {
                $pull: { cart: { product: ObjectId(productId) } }
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
                    $unwind: '$cart'
                },
                {
                    $project: {
                        product: '$cart.product',
                        quantity: '$cart.quantity'
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
        return new Promise((resolve, reject) => {
            razorpay(orderId, totalAmount).then((order) => {
                resolve(order);
            })
                .catch((err) => {
                    reject();
                })
        })
    },
   
}