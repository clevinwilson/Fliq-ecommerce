const collection = require('../config/collection');
const db = require('../config/connection');
const { ObjectId } = require("mongodb");
const { response } = require('express');

module.exports = {
    placeOrder: (phone, paymentMethod, userDetails, price) => {
        return new Promise((resolve, reject) => {
            userDetails.address.phone = phone;
            let date = new Date();
            let today = new Date();
            let expectedDeliveryDate = new Date(today);
            expectedDeliveryDate.setDate(today.getDate() + 6);
            const month = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

            orderObj = {
                userId: ObjectId(userDetails._id),
                deliveryDetails: userDetails.address,
                paymentMethod: paymentMethod,
                orderStatus: paymentMethod === 'COD' ? "placed" : 'pending',
                products: userDetails.cart.products,
                totalAmount: Math.floor(price) ,
                originalPrice: userDetails.originalPrice,
                date: date,
                coupon: userDetails.cart.coupon ?? 0,
                savingPrice: userDetails.cart.savingPrice ?? 0,
                orderDate: new Date().toString().slice(0, 16),
                monthInNo: new Date().getMonth()+1,
                month: month[new Date().getMonth()],
                expectedDeliveryDate: expectedDeliveryDate.toString().slice(0, 16),
                cartId: userDetails._id,
                shipmentStatus: { ordrePlaced: { id: Date.now() + '-' + Math.round(Math.random() * 1E9), status: true, lastUpdate: { date: new Date().toString().slice(0, 21), placeUpdates: [] } } }
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
    getMyOrders: (req,res) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { userId: ObjectId(req.session.user._id) }
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
            console.log(orders);
            res.render('user/orders', { orders, user: req.session.user, cartCount: res.cartCount });
        })
    },
    getOrderDetails: (req,res) => {
        return new Promise(async (resolve, reject) => {
           try{
               const orderDetails = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                   {
                       $match: { _id: ObjectId(req.params.orderId) }
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
               console.log(orderDetails);
               res.render('user/order-details', { order: orderDetails[0], user: req.session.user, cartCount: res.cartCount });
           }catch(err){
            res.render('/error')
           }
        })
    },
    orderSuccess:(req,res)=>{
        try{
            res.render('user/order-success');
        }catch(err){
            res.render('/error')
        }
    },
    cancelOrder: (req,res) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(req.params.orderId) }, {
                $set: {
                    orderStatus: false
                }
            }).then(async(response) => {
                res.json({ status: true })
                let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: ObjectId(req.params.orderId) });
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