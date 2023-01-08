const Razorpay = require('razorpay');
const crypto = require("crypto");
keyId = process.env.KEY_ID;
keySecret = process.env.KEY_SECRET;



const instance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
});

function razorpay(orderId, totalAmount) {
    return new Promise((resolve, reject) => {
        const options = {
            amount: totalAmount*100,  // amount in the smallest currency unit
            currency: "INR",
            receipt: "" + orderId
        };
        instance.orders.create(options, function (err, order) {
            if (err) {
                reject(false);
            } else {
                resolve(order);
            }
        });
    })
}


function razorpayVerify(details){
    return new Promise((resolve,reject)=>{
        const hmac = crypto.createHmac('sha256', keySecret);
        hmac.update(details['payment[razorpay_order_id]'] + "|" + details['payment[razorpay_payment_id]']);
        generated_signature=hmac.digest('hex');

        if (generated_signature == details['payment[razorpay_signature]']) {
           resolve(true)
        }else{
            reject();
        }
    })
}
module.exports = {razorpay,razorpayVerify};