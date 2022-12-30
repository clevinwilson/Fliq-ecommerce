const collection = require('../config/collection');
const db = require('../config/connection');
const bcrypt = require('bcrypt');
const verify = require('../controller/otp_verification');
const { ObjectId } = require('mongodb');



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
    getCategory: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).find({ status: true }).toArray().then((response) => {
                resolve(response)
            })
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
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match:{_id:ObjectId(userId)}
                },
                {
                    $unwind:'$cart'
                },
                {
                    $project:{
                        item:'$cart.product',
                        quantity:'$cart.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()

            resolve(cart)
        })
    },
    updateProductCount:(data,userId)=>{
        return new Promise(async(resolve,reject)=>{
            console.log(data.quantity,data.productId,userId);
            let response = await db.get().collection(collection.USER_COLLECTION).updateOne({_id:ObjectId(userId) ,'cart.product': ObjectId(data.productId) },
                {
                    $inc: { 'cart.$.quantity': parseInt(data.quantity) }
                }).then((response) => {
                     resolve();
                }).catch((err)=>{
                    reject();
                })
        })
    }
}