var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

let Schemas = require('../db/schema');

let Users = Schemas.UserSchema;
let CurrentUsers = Schemas.CurrentUserSchema;

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
  Users.findOne().where('username', username).exec(function(err, user) {
      if (err) {
        res.status(500).json({
          error: true,
          message: "Internal Server Error"
        });
      }

      // Make sure the user exists
      if (user) {
        // Compare the given password with the DB password
        let matchComparison = bcrypt.compare(password, user.password);
        matchComparison.then(match => {
          // Return failure
          if (!match) {
            res.status(401).json({
              error: true,
              message: 'Incorrect Email or Password'
            });
            return;
          }

          // Generate token using SECRET_KEY
          const expiresIn = 60 * 60 * 24;
          const expiry = Math.floor(Date.now() / 1000) + expiresIn;
          const userID = user._id;
          const token = jwt.sign({userID, expiry}, process.env.SECRET_KEY);

          // Send Token
          res.status(200).json({
            token_type: "Bearer",
            token: token,
            expires_in: expiresIn
          });
        }).catch(err => {
          console.log(err)
          res.status(500).json({
            error: true,
            message: "Internal Server Error"
          });
        })
      } else {
        res.status(401).json({
          error: true,
          message: 'Incorrect Email or Password'
        });
      }
  });
});

// POST Register route
router.post('/register', function(req, res, next) {
    // Checks have already passed the middleware that checks that they are set.
    const username = req.body.username;
    const password = req.body.password;

    // Check whether the username exists
    Users.find().where('username', username).countDocuments().exec(function(err, count) {
      // On fail, return error
      if (err) {
        console.log(err);
        res.status(500).json({
          error: true,
          message: "Internal Server Error"
        });
      }

      // If the user has not been found in the DB
      if (!(count > 0)) {
        const saltRounds = 10;
        const hash = bcrypt.hashSync(password, saltRounds);
        let hashedPassword = hash;

        let newUser = new Users({
          username: username,
          password: hashedPassword
        })

        // Commit Data
        newUser.save(function (err, user) {
          if (err) {
              res.status(500).json({
                  error: true,
                  message: "Internal Server Error"
              });
          }

          // Send success
          res.status(200).json({
              inserted: true,
              user: 
              {
                username: username
              }
          });
        });

      } else {
        res.status(409).json({
          error: true,
          message: "User already exists"
        });
      }
    });
});

module.exports = router;
