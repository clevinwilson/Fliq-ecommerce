const collection = require('../config/collection');
const db = require('../config/connection');
const { ObjectId } = require("mongodb");

module.exports={
    placeOrder: (phone, paymentMethod, userDetails, cartTotal) => {
        return new Promise((resolve, reject) => {
            userDetails.address.phone = phone;
            var date = new Date();
            var current_date = date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear();
            var current_time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();

            orderObj = {
                userId: ObjectId(userDetails._id),
                deliveryDetails: userDetails.address,
                paymentMethod: paymentMethod,
                orderStatus: paymentMethod === 'COD' ? "placed" : 'pending',
                products: userDetails.cart,
                totalAmount: cartTotal,
                date: current_date,
                shipmentStatus: { ordrePlaced: { id: Date.now() + '-' + Math.round(Math.random() * 1E9), status: true, lastUpdate: { date: current_date, time: current_time, placeUpdates: [] } } }
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userDetails._id) }, {
                    $set: {
                        cart: []
                    }
                })
                resolve({ status: true, response })
            })
        })
    },
    changeOrderStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(orderId) }, {
                $set: {
                    orderStatus: "placed"
                }
            }).then((response) => {
                resolve();
            }).catch((err) => {
                reject(err)
            })
        })
    },
    getMyOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { userId: ObjectId(userId) }
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
            resolve(orders);
        })
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
    cancelOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(orderId) }, {
                $set: {
                    orderStatus: false
                }
            }).then((response) => {
                resolve();
            })
        })
    },

    //admin
    getAllOrder: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).find().toArray().then((response) => {
                resolve(response);
            })
        })
    },
    changeOrderstatus: (orderId, status) => {
        var date = new Date();
        var current_date = date.getDate() + "-" + (date.getMonth() + 1) + "-" + date.getFullYear();
        var current_time = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
        const obj = {
            id: Date.now() + '-' + Math.round(Math.random() * 1E9),
            status: true,
            lastUpdate: { date: current_date, time: current_time, placeUpdates: [] }
        }
        return new Promise((resolve, reject) => {
            if (status == 0) {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(orderId) }, {
                    $set: {
                        'shipmentStatus.ordrePlaced': obj,
                        'shipmentStatus.shipped.status': false,
                        'shipmentStatus.outForDelivery.status': false,
                        'shipmentStatus.delivered.status': false,
                    }
                }).then((response) => { resolve() })
            } else if (status == 1) {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(orderId) }, {
                    $set: {
                        'shipmentStatus.ordrePlaced.status': true,
                        'shipmentStatus.shipped': obj,
                        'shipmentStatus.outForDelivery.status': false,
                        'shipmentStatus.delivered.status': false,
                    }
                }).then((response) => { resolve() })
            } else if (status == 2) {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(orderId) }, {
                    $set: {
                        'shipmentStatus.ordrePlaced.status': true,
                        'shipmentStatus.shipped.status': true,
                        'shipmentStatus.outForDelivery': obj,
                        'shipmentStatus.delivered.status': false
                    }
                }).then((response) => { resolve() })
            } else if (status == 3) {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(orderId) }, {
                    $set: {
                        'shipmentStatus.ordrePlaced.status': true,
                        'shipmentStatus.shipped.status': true,
                        'shipmentStatus.outForDelivery.status': true,
                        'shipmentStatus.delivered': obj
                    }
                }).then((response) => { resolve() })
            }
        })
    },


}