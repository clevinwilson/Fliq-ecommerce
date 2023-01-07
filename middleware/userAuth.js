const verifyLogin = (req, res, next) => {
    if (req.session.loggedIn) {
        next()
    } else {
        let err = new Error("You are not authenticated");
        res.setHeader("WWW-Authenticate", "Basic");
        err.status = 401;
        res.redirect('/login')
    }
}


module.exports=verifyLogin;