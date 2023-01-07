const db = require('../config/connection');
const collection = require('../config/collection');
const bcrypt = require('bcrypt');
const { ObjectId } = require("mongodb");

module.exports = {
    doLogin: (data) => {
        console.log(data);
        return new Promise(async (resolve, reject) => {
            const admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ username: data.name });
            console.log(admin);
            if (admin) {
                bcrypt.compare(data.passwrod, admin.password, function (err, result) {
                    if (result) {
                        resolve({ status: true })
                    } else {
                        resolve({ status: false })
                    }
                });
            } else {
                resolve({ status: false })
            }
        })
    },
    getUsersList: () => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).find().toArray().then((usersList) => {
                resolve(usersList)
            })
        })
    },
    deleteUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).deleteOne({ _id: ObjectId(userId) }).then((response) => {
                resolve();
            })
        })
    },
    getUserDetails: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(userId) }).then((userDetails) => {
                resolve(userDetails);
            })
        })
    },
    EditUserDetails: (userDetails) => {
        console.log(userDetails);
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userDetails.userId) },
                {
                    $set: {
                        fname: userDetails.fname,
                        lname: userDetails.lname,
                        email: userDetails.email,
                        phone: userDetails.phone
                    }
                }).then((response) => {
                    if (response.modifiedCount == 1) {
                        resolve(true)
                    } else {
                        resolve(false)
                    }
                    console.log(response);
                    // 
                })
        })
    },
    blockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) },
                {
                    $set: {
                        status: false
                    }
                }
            ).then((response) => {
                resolve(response.modifiedCount)
            })
        })
    },
    unBlockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: ObjectId(userId) },
                {
                    $set: {
                        status: true
                    }
                }
            ).then((response) => {
                resolve(response.modifiedCount)
            })
        })
    },
    
   
    
    
    
   


}