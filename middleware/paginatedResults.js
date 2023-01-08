const db = require('../config/connection');
const collection = require('../config/collection');
const { ObjectId } = require("mongodb");


function paginatedResults() {
    return async(req, res, next) => {
        let page = parseInt(req.query.page);
        let limit = parseInt(req.query.limit);
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const categoryCount = await db.get().collection(collection.PRODUCT_COLLECTION).find({ categoryId: ObjectId(req.params.categoryId) }).count()
        results = {};

        if (endIndex < categoryCount) {
            results.next = {
                page: page + 1,
                limit: limit
            }
        }

        if (startIndex > 0) {
            results.previous = {
                page: page - 1,
                limit: limit
            }
        }

        if(endIndex > categoryCount){
            results.limit=categoryCount;
        }else{
            results.limit = endIndex;

        }

        results.current = parseInt(req.query.page);

        
        db.get().collection(collection.PRODUCT_COLLECTION).find({ categoryId: ObjectId(req.params.categoryId) }).skip(startIndex).limit(endIndex).toArray().then((response) => {
            results.categoryCount = categoryCount;
            results.categoryId=req.params.categoryId;
            
            results.products = response;
            res.paginatedResults = results
            next();
        })
        
    }
}

module.exports=paginatedResults;