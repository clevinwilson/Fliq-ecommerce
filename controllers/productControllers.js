const db=require('../config/connection');
const collection=require('../config/collection');
const { ObjectId } = require("mongodb");


module.exports={
    addProduct:(data)=>{
        data.categoryId=ObjectId(data.categoryId)
        data.price=parseInt(data.price);
        data.status=true;
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne(data).then((response)=>{
                console.log(response);
                resolve()
            })
        })
    },
    getProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({status:true}).toArray();
           resolve(products)
        })
    },
    deleteProduct:(productId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:ObjectId(productId)},{
                $set:{
                    status:false
                }
            }).then((response)=>{
                resolve(response);
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

                       _id: 1, name: 1, type: 1,status:1, brand: 1, modelnumber: 1, color: 1, price: 1, quantity: 1, storage: 1, specification: 1, overview: 1, images:1, categoryDetails: { $arrayElemAt: ['$categoryDetails', 0] }
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
    fetchProductImage:(productId,imageNo)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(productId)}).then((response)=>{
                console.log(response.images[imageNo]);
                resolve(response.images[imageNo])
            })
        })
    }
}