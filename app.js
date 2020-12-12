var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const customEnv = require('custom-env').env(true)
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');
var quoteRouter = require('./routes/quote');
var userRouter = require('./routes/user');

var app = express();

// Swagger docs imports
const yaml = require('yamljs');
const swaggerUI = require('swagger-ui-express');
const swaggerDocument = yaml.load('./swaggerDOCS.yaml');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// DB Stuff
  //Set up default mongoose connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test", { useNewUrlParser: true });
  //Get the default connection
var db = mongoose.connection;
  //Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
app.use((req, res, next) => {
	req.db = db;
	next();
});

// Actual rendering of the quotes
app.use('/quote', quoteRouter);
// User functions
app.use('/user', userRouter);

// Swagger docs for the API
app.use('/api', swaggerUI.serve);
app.get('/api', swaggerUI.setup(swaggerDocument));

// Index
app.use('/', indexRouter);



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
