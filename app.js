var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const customEnv = require('custom-env').env(true)
const helmet = require('helmet');
const cors = require('cors');

// Database engine
const { Pool, Client } = require('pg');


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
// Let the webapp call to create Pool requests in Postgres
const dbPool = new Pool();
// Pass dbPool down the middleware stack
app.use(function (req, res, next) {
  res.locals.dbPool = dbPool;
  next()
})

// The pool will emit an error on behalf of any idle clients; it contains if a backend error or network partition happens
dbPool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err)
  process.exit(-1)
})


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
