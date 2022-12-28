const db=require('../config/connection');
const collection=require('../config/collection');
const { ObjectId } = require("mongodb");
const { response } = require('express');


module.exports={
    addProduct:(data)=>{
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
        console.log(productId);
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(productId)}).then((response)=>{
                resolve(response)
            })
        })
    }
}