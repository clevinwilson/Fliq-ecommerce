const db=require('../config/connection');
const collection=require('../config/collection');
const { ObjectId } = require("mongodb");
const { response } = require('express');


module.exports={
    addProduct:(data)=>{
        data.categoryId=ObjectId(data.categoryId)
        data.price=parseInt(data.price);
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(data).then((response)=>{
                console.log(response);
                resolve()
            })
        })
    },
    getProducts:()=>{
        return new Promise(async(resolve,reject)=>{
           let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
           resolve(products)
        })
    },
    deleteProduct:(productId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:ObjectId(productId)}).then((response)=>{
                resolve();
            })
        })
    },
    getProductDetails:(productId)=>{
        return new Promise(async(resolve,reject)=>{
           let Details=await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([
                {
                    $match:{
                        _id:ObjectId(productId)
                    }
                },
                { $lookup:{
                        from:collection.CATEGORY_COLLECTION,
                    localField:"categoryId",
                        foreignField:"_id",
                        as:"categoryDetails"
                    }   
                },
               {
                   $project: {

                       _id: 1, name: 1, type: 1, brand: 1, modelnumber: 1, color: 1, price: 1, quantity: 1, storage: 1, specification: 1, overview: 1, images:1, categoryDetails: { $arrayElemAt: ['$categoryDetails', 0] }
                   }
               }
                
            ]).toArray()
           resolve(Details[0])
            
        })
    },
    editProduct:(data)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: ObjectId(data.productId)},{
                $set:{
                    name: data.name,
                    type:data.type,
                    brand: data.brand,
                    modelnumber: data.modelnumber,
                    color: data.color,
                    category: data.category,
                    price: parseInt(data.price),
                    quantity: data.quantity,
                    storage: data.storage,
                    specification: data.specification,
                    overview: data.overview,
                    images:data.images
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    },
    getOrderDetails:(orderId,userId)=>{
        console.log(orderId);
        return new Promise(async(resolve,reject)=>{
           let orderDetails=await db.get().collection(collection.USER_COLLECTION).aggregate([
                {
                    $match:{_id:ObjectId(userId)}
                },
                {
                    $unwind:'$orders'
                },
                {
                    $match: { "orders.id":orderId}
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'products.product',
                        foreignField:'_id',
                        as:'product'
                    }
                }
            ]).toArray();
            console.log(orderDetails);
        })
    },
    getAllProducts:(categoryId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).find({ categoryId: ObjectId(categoryId) }).toArray().then((response)=>{
                resolve(response)
            })
        })
    },
    fetchProductImage:(productId,imageNo)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(productId)}).then((response)=>{
                console.log(response.images[imageNo]);
                resolve(response.images[imageNo])
            })
        })
    }
}