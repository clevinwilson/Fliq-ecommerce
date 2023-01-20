const verifyLogin = (req, res, next) => {
    console.log(req.session);
    if (req.session.loggedIn) {
        next()
    } else {
        let err = new Error("You are not authenticated");
        res.setHeader("WWW-Authenticate", "Basic");
        err.status = 401;
        res.redirect('/login');
        res.json({status:false})
    }
}


module.exports=verifyLogin;