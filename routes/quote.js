var express = require('express');
var router = express.Router();
var jwt = require('jsonwebtoken');

/* GET /quote Page */
// TODO: Need a better search method
router.get('/', function(req, res, next) {
    const quoteReq = req.query.quote;
    // Get the quote from the query parameters
    if (quoteReq) {
        // Find like quotes
        res.locals.dbPool
        .connect()
        .then(client => {
            return client
            .query('SELECT * FROM quotes WHERE id LIKE %$1%', [1])
            .then(query => {
                client.release()
                let quotes = query.rows;
                // Aggregate results into a json object removing the _id field
                const noIdQuotes = quotes.map(quote => {
                    return {
                        text: quote.text,
                        by: quote.by
                    };
                });

                // Send results
                res.status(200).json({
                    quoteReq: quoteReq,
                    quotes: noIdQuotes
                });
            })
            .catch(err => {
                client.release()
                console.log(err.stack)
                res.status(500).json({
                    error: true,
                    message: "Internal Server Error"
                });
                return handleError(err); 
            });
        });
        
    } else {
        res.locals.dbPool
        .connect()
        .then(client => {
            return client
            .query('SELECT * FROM quotes LIMIT 100')
            .then(query => {
                client.release()
                let quotes = query.rows;
                res.status(200).json({
                    quotes: quotes
                });
            })
            .catch(err => {
                client.release()
                console.log(err.stack)
                res.status(500).json({
                    error: true,
                    message: "Internal Server Error"
                });
            });
        });
    }
}); 

// GET /quote/random
// Gets a random quote
// @depreciated
// Currently removed from functionality as its use is limited and complex to implement currently
/*
    router.get('/random', function(req, res, next) {
        // Count all rows in the quotes collection
        Quote.countDocuments().exec(function (err, count) {
            // ON error, return database failure
            if (err) { 
                res.status(500).json({
                    error: true,
                    message: "Internal Server Error"
                });
                return handleError(err); 
            }
            // Generate a random number that will be used to select a random  
            const randomNum = Math.floor(Math.random() * count);

            // Get the random result
            Quote.findOne().skip(randomNum).exec(function(err, quote) {
                if (err) { 
                    res.status(500).json({
                        error: true,
                        message: "Internal Server Error"
                    });
                    return handleError(err); 
                }

                // Return the results
                if (quote) {
                    res.status(200).json({
                        text: quote.text,
                        by: quote.by,
                        year: quote.year
                    });
                } else {
                    res.status(500).json({
                        error: true,
                        message: "Internal Server Error"
                    })
                }

            });
        });
    });
*/

// GET /quote/{id} page
router.get('/:id', function(req, res, next) {
    const quoteID = req.params.id;

    res.locals.dbPool
    .connect()
    .then(client => {
        return client
        .query('SELECT * FROM quotes WHERE id = $1', [quoteID])
        .then(query => {
            client.release()
            let quote = query.rows;
            if (quote[0]) {
                res.status(200).json({
                    quote: quote[0]
                });
            } else {
                res.status(404).json({
                    error: true,
                    message: 'Quote not found'
                });
            }
        })
        .catch(err => {
            client.release()
            console.log(err.stack)
            res.status(500).json({
                error: true,
                message: 'Internal Server Error'
            });
        })
    })
});

// Authenticated route middleman verification
const authenticate = (req, res, next) => {
    // Check the provided web token
    const authorisation = req.headers.authorization;
    let token = null;

    // Token validation
    let splAuthorisation = '';
    try {
        splAuthorisation = authorisation.split(" ");
    } catch (err) {
        console.log(err);
        if (err instanceof TypeError) {
            res.status(401).json({
                error: true,
                message: "Invalid Authorisation Header"
            });
            return;
        }
    }
    
    if (authorisation && splAuthorisation.length == 2) {
        token = splAuthorisation[1];
    } else {
        res.status(401).json({
            error: true,
            message: "Authorisation header not found"
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        if (decoded.expiry > Date.now()) {
            res.status(401).json({
                error: true,
                message: "Authorisation header not found"
            });
            return;
        } 
        // Add the user ID to the req
        res.locals.userID = decoded.userID;

        // End the middleware function and move to the authorised routes
        next();
    } catch (err) {
        res.status(500).json({
            error: true,
            message: "Invalid Token"
        });
    }
};

router.use(authenticate);

router.post("/create", function(req, res, next) {
    // Create a quote
    const text = req.body.text;
    const by = req.body.by;
    const year = req.body.year;
    let public = false;
    if (req.body.public) {
        public = true;
    }
    let newQuote = {
        text: text,
        by: by,
        year: year,
        public: public,
        creator: res.locals.userID
    };
    // TODO: Check that the quote doesnt already exist
        // Check whether an extremely similar quote exists

    // Insert new quote
    res.locals.dbPool
    .connect()
    .then(client => {
        return client
        .query('INSERT INTO quotes (text, by, year, creator, public) VALUES ($1, $2, $3, $4, $5);', [text, by, year, res.locals.userID, public])
        .then(query => {
            client.release();
            res.status(200).json({
                inserted: true,
                quote: newQuote
            });
            return;     
        })
        .catch(err => {
            client.release();
            console.log(err.stack)
            res.status(500).json({
                error: true,
                message: "Internal Server Error"
            });
        });
    });
});

// GET all the quotes created by a given user ID. The user ID is stored in the provided token
router.get('/user/all', function(req, res, next) {
    const user = res.locals.userID;

    res.locals.dbPool
    .connect()
    .then(client => {
        return client
        .query('SELECT * FROM quotes WHERE creator = $1', [user])
        .then(query => {
            client.release()
            res.status(200).json({
                user: user,
                quotes: query.rows
            });
        })
        .catch(err => {
            client.release()
            console.log(err.stack)
            res.status(500).json({
                error: true,
                message: "Internal Server Error"
            });
        });
    });
});

// For routes that require ownership of the modified data, this function verifies that the user has permission to modify it
router.use('/:modification(edit|delete)/:id', (req, res, next) => {
    const quoteID = req.params.id;
    if (!quoteID) {
        res.status(400).json({
            error: true,
            message: 'Missing Quote ID Param. Example: /quote/edit/aaaaaa1111111'
        });
        return;
    }

    res.locals.dbPool
    .connect()
    .then(client => {
        return client
        .query('SELECT creator FROM quotes WHERE id = $1', [quoteID])
        .then(query => {
            client.release();
            let quote = query.rows[0];
            if(quote) {
                // Verify the obtained data matches the request
                if (quote.creator !== res.locals.userID) {
                    res.status(401).json({
                        error: true,
                        message: 'Unauthorized action'
                    });
                    return;
                } else {
                    next();
                }
            } else {
                res.status(404).json({
                    error: true,
                    message: 'Quote not found'
                });
                return;
            }
        })
        .catch(err => {
            client.release();
            console.log(err.stack)
            res.status(500).json({
                error: true,
                message: 'Internal Server Error'
            });
        });
    });
});

// DELETE a quote
router.delete('/delete/:id', (req, res, next) => {
    const quoteID = req.params.id;
    if (!quoteID) {
        res.status(400).json({
            error: true,
            message: 'Invalid quote ID'
        });
    }

    res.locals.dbPool
    .connect()
    .then(client => {
        return client
        .query('DELETE FROM quotes WHERE id = $1', [quoteID])
        .then(query => {
            client.release()
            res.status(200).json({
                deleted: true,
                quote: quoteID
            });
        })
        .catch(err => {
            client.release()
            console.log(err.stack)
            res.status(500).json({
                error: true,
                message: 'Internal Server Error'
            });
        })
    })
});

// POST Edit a quote
router.post('/edit/:id', (req, res, next) => {
    const newText = req.body.text;
    const newBy = req.body.by;
    const newYear = req.body.year;
    const newPub = req.body.public;

    // Create new quote object
    let newQuote = {
        text: newText,
        by: newBy,
        year: newYear,
        public: newPub
    };

    res.locals.dbPool
    .connect()
    .then(client => {
        return client
        .query('UPDATE quotes SET text = $1, by = $2, year = $3, public = $4 WHERE id = $5', [newText, newBy, newYear, newPub, req.params.id])
        .then(query => {
            client.release()
            res.status(200).json({
                updated: req.params.id,
                values: newQuote
            });
        })
        .catch(err => {
            client.release()
            console.log(err.stack)
            res.status(500).json({
                error: true,
                message: 'Internal Server Error'
            });
        })
    })
});




module.exports = router;