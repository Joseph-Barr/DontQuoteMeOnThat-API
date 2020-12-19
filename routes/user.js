var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Function verifies that the provided request body contains a username and password
const verifyLoginBody = (req, res, next) => {
  const username = req.body.username;
  const password = req.body.password;

  if (!username || !password) {
    res.status(400).json({
      error: true,
      message: 'Invalid Header: Make sure Username and Password are complete'
    });
    return;
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
  res.locals.dbPool
  .connect()
  .then(client => {
    return client
      .query('SELECT * FROM users WHERE username = $1', [username])
      .then(query => {
        client.release()
        // User exists in the DB
        if (query.rows[0]) {
          let user = query.rows[0]; 
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
            const userID = user.id;
            const token = jwt.sign({userID, expiry}, process.env.SECRET_KEY);

            // Send Token
            res.status(200).json({
              token_type: "Bearer",
              token: token,
              expires_in: expiresIn
            });
            return;
          }).catch(err => {
            console.log(err)
            res.status(500).json({
              error: true,
              message: "Internal Server Error"
            });
            return;
          })
        } else {
          res.status(401).json({
            error: true,
            message: 'Incorrect Email or Password'
          });
          return;
        }
      })
      .catch(err => {
        client.release();
        console.log(err.stack);
        res.status(500).json({
          error: true,
          message: "Internal Server Error"
        });
      });
  })
  .catch(err => {
    console.log(err);
    res.status(500).json({
        error: true,
        message: "Internal Server Error"
    });
});
});

// POST Register route
router.post('/register', function(req, res, next) {
    // Checks have already passed the middleware that checks that they are set.
    const username = req.body.username;
    const password = req.body.password;

    res.locals.dbPool
  .connect()
  .then(client => {
    return client
      .query('SELECT * FROM users WHERE username = $1', [username])
      .then(query => {
        let user = query.rows[0];
      
        // User does not exist in the DB
        if (!user) { 
          const saltRounds = 10;
          const hash = bcrypt.hashSync(password, saltRounds);
          let hashedPassword = hash;

          // Store the new user
          client.query("INSERT INTO users (username, password) VALUES ($1, $2)", [username, hashedPassword])
          .then(query => {
            client.release();
            if (query.rowCount === 1) {
              // Send success
              res.status(201).json({
                inserted: true,
                user: 
                {
                  username: username
                }
              });
            }
          })
          .catch(err => {
            client.release()
            console.log(err);
            res.status(500).json({
              error: true,
              message: "Internal Server Error"
            });
          });

        } else {
          client.release()
          res.status(409).json({
            error: true,
            message: "User already exists"
          });
        }
    })       
    .catch(err => {
      client.release()
      console.log(err.stack)
    });
  })
  .catch(err => {
    console.log(err);
    res.status(500).json({
      error: true,
      message: "Internal Server Error"
    });
  });
});

module.exports = router;
