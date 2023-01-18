const collection = require('../config/collection');
const db = require('../config/connection');
const { ObjectId } = require("mongodb");

module.exports = {
    getCategory: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).find({ status: true }).toArray().then((response) => {
                resolve(response)
            })
        })
    },
    addCategory: async (req, res) => {
        try {
            req.body.status = true;
            req.body.image = req.files.image[0];

            let category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ name: req.body.name });

            if (!category) {
                db.get().collection(collection.CATEGORY_COLLECTION).insertOne(req.body).then((response) => {
                    res.redirect('/admin/view-category');
                })
            }
            else {
                req.session.categoryErrorMessage = "Category already exists "
                res.redirect('/admin/add-category');
            }
        } catch (err) {
            req.session.categoryErrorMessage = "Something went wrong "
            res.redirect('/admin/add-category')
        }
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
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ categoryId: ObjectId(categoryId) });
            if (!product) {
                db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ _id: ObjectId(categoryId) }).then((response) => {
                    resolve(response);
                })
            } else {
                resolve(false)
            }

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