const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const hbs = require('express-handlebars');
const db=require('./config/connection');
const session = require('express-session');
const Handlebars = require('handlebars');

require('dotenv').config();




const userRouter = require('./routes/user');
const adminRouter = require('./routes/admin')

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));


app.engine('hbs', hbs.engine({ extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layout/', partialsDir: __dirname + '/views/partials/' }))
app.use(session({
  secret: 'fliqkey539',
  resave: false,
  saveUninitialized: true,
}))


//prevent cache last page
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});


app.use('/', userRouter);
app.use('/admin',adminRouter)


//db connection

db.main()
  .then()
  .catch(console.error)

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
