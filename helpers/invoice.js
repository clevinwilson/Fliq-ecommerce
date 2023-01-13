const fs = require("fs");
function getInvoice(order, cartTotal) {
    console.log(order);
    return new Promise((resolve,reject)=>{
        const data = {
            images: {
                logo: fs.readFileSync('public/images/Fliq-logos_white.png', 'base64'),
                background: fs.readFileSync('public/images/invoicetemp.jpg', 'base64')
            },
            // Your own data
            sender: {
                company: "Fliq Corp",
                address: "Fliq Corp Taliparamba",
                zip: "670633",
                city: "Kannur",
                country: "India"
            },
            // Your recipient
            client: {
                company: order.deliveryDetails.firstName + " " + order.deliveryDetails.lastName,
                address: order.deliveryDetails.street,
                zip: order.deliveryDetails.postalCode,
                city: order.deliveryDetails.AddressLine2,
                country: order.deliveryDetails.country
            },
            information: {
                // Invoice number
                number: order._id,
                // Invoice data
                date: order.date,
            },
            products: order.products,
            // Settings to customize your invoice
            settings: {
                currency: "INR",
            },
        };

        resolve(data);
    })
}


module.exports = getInvoice;