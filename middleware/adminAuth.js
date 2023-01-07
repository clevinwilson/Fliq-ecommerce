const verifyAdminLogin = (req, res, next) => {
    if (req.session.adminLogin) {
        next();
    } else {
        let err = new Error("You are not authenticated");
        res.setHeader("WWW-Authenticate", "Basic");
        err.status = 401;
        res.redirect('/admin');
    }
}

module.exports=verifyAdminLogin;

