var express = require('express');
var router = express.Router();

let Users = require('../')

// Function verifies that the provided request body contains a username and password
const verifyLoginBody = (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    res.status(400).json({
      error: true,
      message: 'Invalid Header: Make sure Username and Password are complete'
    });
  }
  next();
};

// Load middleware funtion
router.use(verifyLoginBody);

/* POST login page. */
router.post('/login', function(req, res, next) {
 // Get the username / password
  const username = req.body.username;
  const password = req.body.password;

  // Process data
    // Check whether the users already exists

  

  // Generate token using SECRET_KEY

  // Save token

  // Send Token
});

// POST Register route
router.post('/register', function(req, res, next) {

    // Process username/password

    // Check whether the username exists
    
    // Load data into mongoose save function

    // Return the username and password that were loaded into the DB
});

module.exports = router;
