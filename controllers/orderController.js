const collection = require('../config/collection');
const db = require('../config/connection');
const { ObjectId } = require("mongodb");
const { response } = require('express');

module.exports = {
    placeOrder: (phone, paymentMethod, userDetails, price) => {
        return new Promise((resolve, reject) => {
            userDetails.address.phone = phone;
            let date = new Date()
            const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            orderObj = {
                userId: ObjectId(userDetails._id),
                deliveryDetails: userDetails.address,
                paymentMethod: paymentMethod,
                orderStatus: paymentMethod === 'COD' ? "placed" : 'pending',
                products: userDetails.cart.products,
                totalAmount: price,
                originalPrice: userDetails.originalPrice,
                date: date,
                monthInNo: new Date().getMonth()+1,
                month: month[new Date().getMonth()],
                cartId: userDetails._id,
                shipmentStatus: { ordrePlaced: { id: Date.now() + '-' + Math.round(Math.random() * 1E9), status: true, lastUpdate: { date: date, placeUpdates: [] } } }
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userDetails._id) }, {
                    $set: {
                        activeOrder: ObjectId(response.insertedId)
                    }
                })
                resolve({ status: true, response })
            })
        })
    },
    getActiveOrder: (activeOderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: ObjectId(activeOderId) }).then((response) => {
                if (response) {
                    resolve(response);
                } else {
                    resolve(false);
                }
            })
        })
    },
    changeOrderStatus: (orderId, userId) => {
        return new Promise( (resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(orderId) }, { $set: { orderStatus: "placed" } }).then((response) => {
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) },
                    {
                        $set: { cart: {products:[]} },
                        $unset: { activeOrder: "" }

                    }).then(async(response) => {
                        resolve()
                        let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: ObjectId(orderId) });
                        let orderProducts = order.products
                        orderProducts.forEach(obj => {
                            
                            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: ObjectId(obj.product) }, {
                                $inc: { quantity: Number("-" + obj.quantity) }
                            })
                        });
                    })
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
                },
                {
                    $sort: { date: -1 }
                }
            ]).toArray();
            resolve(orders);
        })
    },
    getOrderDetails: (orderId) => {
        return new Promise(async (resolve, reject) => {
           try{
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
           }catch(err){
            reject();
           }
        })
    },
    cancelOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(orderId) }, {
                $set: {
                    orderStatus: false
                }
            }).then(async(response) => {
                resolve();
                let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: ObjectId(orderId) });
                let orderProducts = order.products
                orderProducts.forEach(obj => {
                    db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: ObjectId(obj.product) }, {
                        $inc: { quantity: Number(obj.quantity) }
                    })
                });
            })
        })
    },

    //admin
    getAllOrder: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).find().sort({ date: -1 }).toArray().then((response) => {
                resolve(response);
            })
        })
    },
    changeOrderstatus: (orderId, status) => {
        let date = new Date().toString().slice(0, 21)
        
        const obj = {
            id: Date.now() + '-' + Math.round(Math.random() * 1E9),
            status: true,
            lastUpdate: { date: date, placeUpdates: [] }
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