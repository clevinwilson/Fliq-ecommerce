const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID

const client = require('twilio')(accountSid, authToken);


function sendVerificationToken(phoneNumber){
    return new Promise((resolve,reject)=>{
        client.verify
            .services(serviceSid)
            .verifications
            .create({
                to: `+91${phoneNumber}`,
                channel: "sms"
            }).then((data) => {
                resolve(true)

            }).catch(() => {
                resolve(false)

            })
    })
}

function checkVerificationToken(otp,phoneNumber){
    return new Promise((resolve,reject)=>{
        client.verify
            .services(serviceSid)
            .verificationChecks
            .create({
                to: `+91${phoneNumber}`,
                code: otp
            }).then((data) => {
                if (data.valid) {
                    resolve(true);
                } else {
                    resolve(false)
                }
            }).catch(() => {
                resolve(false)
            })
    })
}

module.exports = { sendVerificationToken, checkVerificationToken }

