var express = require('express');
var router = express.Router();
var QuoteSchema = require('../db/schema');
var jwt = require('jsonwebtoken');

// The schema to be used by mongoose to form the DB requests
var Quote = QuoteSchema.QuoteSchema;

/* GET /quote Page */
// TODO: Need a better search method
router.get('/', function(req, res, next) {
    const quoteReq = req.body.quote;
    // Get the quote from the query parameters
    if (quoteReq) {
        Quote.find({text: new RegExp('' + quoteReq + '')}).exec(function(err, quotes) {
            if (err) { 
                res.status(500).json({
                    error: true,
                    message: "Internal Server Error"
                });
                return handleError(err); 
            }
            
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
        });

        
    } else {
        Quote.find({}, '_id text by year creator public').limit(100).exec(function(err, quotes) {
            if (err) {
                res.status(500).json({
                    error: true,
                    message: "Internal Server Error"
                });
            }

            res.status(200).json({
                quotes: quotes
            });
        });
    }
}); 

// GET /quote/random
// Gets a random quote
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

// GET /quote/{id} page
router.get('/:id', function(req, res, next) {
    const quoteID = req.params.id;

    Quote.findOne({_id: quoteID}, 'text creator by year public').exec((err, quote) => {
        if (err) {
            res.status(500).json({
                error: true,
                message: 'Internal Server Error'
            });
            return;
        }

        // Send the found quote
        if (quote) {
            res.status(200).json({
                quote: quote
            })
        } else {
            res.status(404).json({
                error: true,
                message: 'Quote not found'
            })
        }
    });

});

// Authenticated route middleman verification
const authenticate = (req, res, next) => {
    // Check the provided web token
    const authorisation = req.headers.authorization;
    let token = null;

    // Token validation
    let splAuthorisation = authorisation.split(" ");
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
    // Check that the quote doesnt already exist
        // Check whether an extremely similar quote exists

    let newQuoteValues = {
        text: text,
        by: by,
        creator: res.locals.userID,
        public: public,
        year: year
    }

    // Remove all undefined values from the new quote
    Object.keys(newQuoteValues).forEach(key => newQuoteValues[key] === undefined && delete newQuoteValues[key]);

    // Create the new quote
    let newQuote = new Quote(newQuoteValues);

    newQuote.save(function (err, quote) {
        if (err) {
            console.log(err);
            res.status(500).json({
                error: true,
                message: "Internal Server Error"
            });
            return;
        }

        res.status(200).json({
            inserted: true,
            quote: quote
        });
    });
});
/*
// POST request to list all the quotes from a user
router.post("/list", function(req, res, next) {
    let listingUser = req.body.user;
    if (!listingUser) {
        listingUser = res.locals.userID;
    }


});
*/

// GET all the quotes created by a given user ID. The user ID is stored in the provided token
router.get('/user/all', function(req, res, next) {
    const user = res.locals.userID;

    Quote.find({creator: user}).exec((err, quotes) => {
        if (err) {
            console.log(err);
            res.status(500).json({
                error: true,
                message: "Internal Server Error"
            });
            return;
        }

        // Quotes have been located
        res.status(200).json({
            user: user,
            quotes: quotes
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

    Quote.findOne({_id: quoteID}, 'creator').exec((err, quote) => {
        if (err) {
            console.log(err);
            res.status(500).json({
                error: true,
                message: 'Internal Server Error'
            });
            return;
        }

        // Check if an object was actually returned
        if (quote === null) {
            res.status(404).json({
                error: true,
                message: 'Quote not found'
            });
            return;
        }

        // Verify the obtained data matches the request
        if (quote.creator !== res.locals.userID) {
            res.status(401).json({
                error: true,
                message: 'Unauthorized action'
            });
            return;
        }

        // The user must own the data they are trying to modify
        if (!(res.headersSent)) {
            next();
        }
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

    Quote.findOneAndRemove({_id: quoteID}).exec((err, quote) => {
        if (err) {
            console.log(err);
            res.status(500).json({
                error: true,
                message: 'Internal Server Error'
            });
            return;
        }

        // No quote has been deleted
            // NOTE: This if should never be TRUE as the ownership middleware checks that the quoteID is always valid
        if (quote == null) {
            res.status(404).json({
                error: true,
                deleted: false,
                message: 'Quote Not Found'
            });
            return;
        }

        res.status(200).json({
            deleted: true,
            quote: quote
        });
        return;
    });
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

    // Remove all undefined values from the new quote
    Object.keys(newQuote).forEach(key => newQuote[key] === undefined && delete newQuote[key]);

    Quote.findOneAndUpdate({_id: req.params.id}, newQuote).exec((err, quote) => {
        if (err) {
            res.status(500).json({
                error: true,
                message: 'Internal Server Error'
            });
            return;
        }

        res.status(200).json({
            updated: quote,
            values: newQuote
        });
    });
});




module.exports = router;