const collection = require('../config/collection');
const db = require('../config/connection');
const { ObjectId } = require("mongodb");


module.exports={
    addBanner: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BANNER_COLLECTION).insertOne(data).then((response) => {
                resolve(response)
            })
        })
    },
    getBanner: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BANNER_COLLECTION).find().toArray().then((bannerList) => {
                resolve(bannerList)
            })
        })
    },
    getBannerDetails: (bannerId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BANNER_COLLECTION).findOne({ _id: ObjectId(bannerId) }).then((response) => {
                resolve(response)
            })
        })
    },
    deleteBanner: (bannerId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BANNER_COLLECTION).deleteOne({ _id: ObjectId(bannerId) }).then((response) => {
                resolve(response)
            }).catch(()=>{
                reject();
            })
        })
    },
    editBanner: (data) => {
        console.log(data,">>>>>>>>>>>");
        return new Promise((resolve, reject) => {
            db.get().collection(collection.BANNER_COLLECTION).updateOne({ _id: ObjectId(data.bannerId) },
                {
                    $set: {
                        title: data.title,
                        subtitle: data.subtitle,
                        text: data.text,
                        color: data.color,
                        image: data.image,
                    }
                }).then((response) => {
                    resolve(response)
                })
        })
    },
}