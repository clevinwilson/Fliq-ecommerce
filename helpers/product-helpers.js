const db=require('../config/connection');
const collection=require('../config/collection');
const { ObjectId } = require("mongodb");
const { response } = require('express');


module.exports={
    addProduct:(data)=>{
        data.categoryId=ObjectId(data.categoryId)
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
                    price: data.price,
                    quantity: data.quantity,
                    storage: data.storage,
                    specification: data.specification,
                    overview: data.overview,
                }
            }).then((response)=>{
                resolve(response)
            })
        })
    }
}