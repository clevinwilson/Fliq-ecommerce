const Razorpay = require('razorpay');
const crypto = require("crypto");




const instance = new Razorpay({
    key_id: "rzp_test_deE2E1795zFmxy",
    key_secret: "zDZ8GFjzaxyncyKYdabslzOE",
});

function razorpay(orderId, totalAmount) {
    return new Promise((resolve, reject) => {
        const options = {
            amount: totalAmount,  // amount in the smallest currency unit
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
        const hmac = crypto.createHmac('sha256', 'zDZ8GFjzaxyncyKYdabslzOE');
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