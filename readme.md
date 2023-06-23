# Learning Platforms

The e-commerce project is a full-stack web application built with Node.js and MongoDB, integrating payment gateways such as Razorpay and Stripe. The platform allows users to browse and purchase products from various categories, securely make payments using their preferred payment method, and provides a seamless return and refund process.

## Features

- An e-commerce project focused on selling electronics, ensuring a seamless user experience.
- Built a commerce platform using Node.js and NoSQL database MongoDB to ensure scalability.
- Integrated Razorpay for seamless payment processing, enabling users to make transactions quickly and securely.
- Implemented Cross-Site Request Forgery (CSRF) protection.
- Integrate Twilio for phone OTP verification, ensuring that only authorized users can access their accounts.
- Hosted on Amazon AWS, Used NGINX as a proxy server.
- Implemented a user-friendly order cancellation feature, allowing users to cancel their orders. Successful cancellations trigger automatic refunds, which are credited back to the user's wallet.
- Return and Refund: The platform offers a user-friendly return and refund process. If a user wants to return a product, they can initiate the process through their account. Once the return is verified, the product's cost is refunded directly to the user's wallet within a specified timeframe. The refunded amount can be used for future purchases or withdrawn to their bank account.
- Live link: www.fliqcart.me/



## Prerequisites

Before you can run the app, make sure you have the following installed on your machine:

- Node.js (v12 or above)
- npm (v6 or above)

## Getting Started

1. Clone this repository to your local machine:

   git clone  learnwise_backend

2. Navigate to the project directory:

   cd learnwise_backend

3. Install the dependencies:

   npm install

4. Start the development server:

   npm start

The app should now be running at http://localhost:3000.

