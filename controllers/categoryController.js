const collection = require('../config/collection');
const db = require('../config/connection');
const { ObjectId } = require("mongodb");

module.exports={
    getCategory: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).find({ status: true }).toArray().then((response) => {
                resolve(response)
            })
        })
    },
    addCategory: (data) => {
        data.status = true;
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).insertOne(data).then((response) => {
                resolve(response)
            })
        })
    },
    getCategoryDetails: (categoryId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: ObjectId(categoryId) }).then((response) => {
                if (response) {
                    resolve(response)
                } else {
                    resolve(false)
                }
            })
        })
    },
    editCategoryWithImage: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ _id: ObjectId(data.categoryId) },
                {
                    $set: {
                        name: data.name,
                        description: data.description,
                        image: data.image
                    }
                }).then((response) => {
                    resolve(true)
                })
        })
    },
    editCategory: (data) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ _id: ObjectId(data.categoryId) },
                {
                    $set: {
                        name: data.name,
                        description: data.description
                    }
                }).then((response) => {
                    resolve(true)
                })
        })
    },

    deleteCategory: (categoryId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ _id: ObjectId(categoryId) }).then((response) => {
                resolve(response);
            })
        })
    },
    changeStatus: (categoryId, status) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ _id: ObjectId(categoryId) },
                {
                    $set: {
                        status
                    }
                }).then((response) => {
                    resolve(response);
                })
        })
    },
    getCategoryList: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).find().toArray().then((categoryList) => {
                resolve(categoryList)
            })
        })
    },
}