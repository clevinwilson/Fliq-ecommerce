const { ObjectId } = require('mongodb');
const collection = require('../config/collection');
const db = require('../config/connection');
const cartCount = async (req, res, next) => {
    if (req.session.user) {

        let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: ObjectId(req.session.user._id) });
        if (user) {
            res.cartCount = user.cart.products.length ?? 0;
            console.log(user.cart.products.length);
            next();
        } else {
            res.cartCount = 0;
            next();
        }
    } else {
        res.cartCount = 0;
        next();
    }
}


module.exports = cartCount;