const db = require('../config/connection');
const collection = require('../config/collection');
const bcrypt = require('bcrypt');
const { ObjectId } = require("mongodb");
const salesReport = require('../helpers/salesreport');
const { response } = require('express');


module.exports = {
    doLogin: (data) => {
        return new Promise(async (resolve, reject) => {
            const admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ username: data.name });
            console.log(admin);
            if (admin) {
                bcrypt.compare(data.passwrod, admin.password, function (err, result) {
                    if (result) {
                        resolve({ status: true })
                    } else {
                        resolve({ status: false })
                    }
                });
            } else {
                resolve({ status: false })
            }
        })
    },
    getUsersList: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).find().toArray().then((usersList) => {
                resolve(usersList)
            })
        })
    },
    deleteUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).deleteOne({ _id: ObjectId(userId) }).then((response) => {
                resolve();
            })
        })
    },
    getUserDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId) }).then((userDetails) => {
                resolve(userDetails);
            })
        })
    },
    EditUserDetails: (userDetails) => {
        console.log(userDetails);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userDetails.userId) },
                {
                    $set: {
                        fname: userDetails.fname,
                        lname: userDetails.lname,
                        email: userDetails.email,
                        phone: userDetails.phone
                    }
                }).then((response) => {
                    if (response.modifiedCount == 1) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                    console.log(response);
                    // 
                })
        })
    },
    blockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) },
                {
                    $set: {
                        status: false
                    }
                }
            ).then((response) => {
                resolve(response.modifiedCount)
            })
        })
    },
    unBlockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) },
                {
                    $set: {
                        status: true
                    }
                }
            ).then((response) => {
                resolve(response.modifiedCount)
            })
        })
    },
    addCoupon: (data) => {
        return new Promise((resolve, reject) => {
            data.status = true;
            data.date = new Date();
            data.couponDiscount = parseInt(data.couponDiscount);
            data.couponCode = data.couponCode.toUpperCase();
            data.ExpiryDate = new Date(data.ExpiryDate);
            db.get().collection(collection.COUPON_COLLECTION).insertOne(data).then((response) => {
                resolve()
            })
        })
    },
    getCoupons: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).find().toArray().then((response) => {
                resolve(response)
            })
        })
    },
    checkCoupon: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ couponCode: data.couponCode }).then((response) => {
                if (response) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
        })
    },
    getUserCount: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).find().count().then((response) => {
                resolve(response)
            })
        })
    },
    getOrderDetailsCount: () => {
        return new Promise(async (resolve, reject) => {
            let orderPlaced = await db.get().collection(collection.ORDER_COLLECTION).find({ $and: [{ "shipmentStatus.ordrePlaced.status": true }, { orderStatus: 'placed' }] }).count();
            let orderDelivered = await db.get().collection(collection.ORDER_COLLECTION).find({ $and: [{ "shipmentStatus.delivered.status": true }, { orderStatus: 'placed' }] }).count();
            let orderShipped = await db.get().collection(collection.ORDER_COLLECTION).find({ $and: [{ "shipmentStatus.shipped.status": true }, { orderStatus: 'placed' }] }).count();
            let total = orderPlaced + orderDelivered + orderShipped;
            orderPlaced = (orderPlaced / total) * 100;
            orderDelivered = (orderDelivered / total) * 100;
            orderShipped = (orderShipped / total) * 100;
            resolve({ orderPlaced, orderDelivered, orderShipped })
        })
    },
    getOrdersByMonth: () => {
        return new Promise(async (resolve) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { "shipmentStatus.delivered.status": true }
                },
                {
                    $group: {
                        _id: "$month",
                        total: { $sum: '$totalAmount' }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]).toArray()
            let details = [];
            orders.forEach(element => {
                details.push(element.total)
            });
            resolve(details)
        })
    },
    getProductCount: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).find().count().then((response) => {
                resolve(response)
            })
        })
    },
    getOrdreCount: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).find({ orderStatus: 'placed' }).count().then((response) => {
                resolve(response)
            })
        })
    },
    deleteCoupon: (couponId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).deleteOne({ _id: ObjectId(couponId) }).then((response) => {
                resolve(response)
            })
        })
    },
    editCoupon: (couponId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.COUPON_COLLECTION).findOne({ _id: ObjectId(couponId) }).then((response) => {
                resolve(response)
            })
        })
    },
    updateCoupon: (data) => {
        return new Promise((resolve, reject) => {
            data.status = true;
            data.date = new Date();
            data.couponDiscount = parseInt(data.couponDiscount);
            data.couponCode = data.couponCode.toUpperCase();
            db.get().collection(collection.COUPON_COLLECTION).updateOne({ _id: ObjectId(data.couponId) }, {
                $set: {
                    couponCode: data.couponCode,
                    ExpiryDate: new Date(data.ExpiryDate),
                    couponDiscount: data.couponDiscount,
                    minimumPurchase: data.minimumPurchase,
                    maximumPurchase: data.maximumPurchase,
                    status: data.status,
                    lastUpdate: data.date
                }
            }).then((response) => {
                resolve();
            })
        })
    },
    getSalesReportData: () => {
        return new Promise(async (resolve) => {
            let data = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { "shipmentStatus.delivered.status": true }
                },
                {
                    $unwind: '$products'
                },
                {
                    $group: {
                        _id: "$month",
                        total: { $sum: '$totalAmount' },
                        orderCount: { $sum: 1 },
                        productQty: { $sum: "$products.quantity" }
                    }
                },
                {
                    $sort: { monthInNo: 1 }
                }
            ]).toArray()
            resolve(data)
        })
    },
    gerSalesReportInfo: async (req, res) => {

        try {
            if (new Date(req.body.fromDate) < new Date()) {
                let data = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    {
                        $match: {
                            $and: [
                                { "shipmentStatus.delivered.status": true },
                                {
                                    date: {
                                        $gt: new Date(req.body.fromDate),
                                        $lte: new Date(req.body.toDate)
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $group: {
                            _id: "$month",
                            total: { $sum: '$totalAmount' },
                            orderCount: { $sum: 1 },
                            productQty: { $sum: "$products.quantity" }
                        }
                    },
                    {
                        $sort: { monthInNo: 1 }
                    }
                ]).toArray();
                console.log(data);
                salesReport(data).then(() => {
                    res.json({ status: true })
                })
            } else {
                res.json({ status: false })
            }
        } catch (err) {
            res.json({ status: false })
        }
    },
    getOrderDetails: (orderId) => {
        return new Promise(async (resolve, reject) => {
            const orderDetails = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectId(orderId) }
                },
                {
                    $lookup:
                    {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'products.product',
                        foreignField: '_id',
                        as: 'products'
                    }
                }
            ]).toArray();
            resolve(orderDetails[0])
        })
    },
    confirmReturn: async (req, res) => {
        try {
            let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: ObjectId(req.params.orderId) });
            if (order) {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(req.params.orderId) }, {
                    $set: {
                        return: 'confirmed'
                    }
                }).then((response) => {
                    db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(order.userId) },
                        {
                            $inc: { 'wallet.total': order.totalAmount },
                            $push: { 'wallet.transactions': { type: "Received", dateString: new Date().toString().slice(0, 16), date: new Date(), amount: order.totalAmount } }
                        }).then((response) => {
                            res.json({ status: true })
                        })
                })
            }
        } catch (err) {
            res.render('/error')
        }

    },
    highlights: async (req, res) => {
        try {
            const highlight = await db.get().collection(collection.HIGHLIGHTS_COLLECTION).aggregate([
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'productId',
                        foreignField: '_id',
                        as: 'product'
                    }
                }
            ]).toArray();
            db.get().collection(collection.PRODUCT_COLLECTION).find().toArray().then((products)=>{
                res.render('admin/highlight', { products, admin: req.session.adminLogin, highlight });
            })

        } catch (err) {
            res.render('/error')
        }
    },
    addHighlight: async (req, res) => {
        try {
            const highlight = await db.get().collection(collection.HIGHLIGHTS_COLLECTION).findOne({ productId: ObjectId(req.body.productId) })
            if (!highlight) {
                db.get().collection(collection.HIGHLIGHTS_COLLECTION).insertOne({productId:ObjectId(req.body.productId)}).then((response) => {
                    res.redirect('/admin/highlight');
                })
            } else {
                res.redirect('/admin/highlight')
            }
        } catch (err) {
            res.render('/error')
        }
    }


}