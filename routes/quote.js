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
        res.status(404).json({error: true, message: 'Enter a quote as part of the HTTP Request Body'});
    }
}); 

// GET /quote/random
// Gets a random quote
router.get('/random', function(req, res, next) {
    // Count all rows in the quotes collection
    Quote.count().exec(function (err, count) {
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
            console.log("Got: " + quote);
            res.status(200).json({
                text: quote.text,
                by: quote.by
            });
        });
    });
});

// GET /quote/{id} page
router.get('/:id', function(req, res, next) {
    res.render('index', { title: '/quote/'+ req.params.id +'' });
});

// Authenticated route middleman verification
const authenticate = (req, res, next) => {
    // Check the provided web token
    const authorisation = req.header.authorisation;
    let token = null;

    // Token validation
    let splAuthorisation = authorisation.split(" ");
    if (authorisation && splAuthorisation.length == 2) {
        token = splAuthorisation[1];
    } else {
        res.status(403).json({
            error: true,
            message: "Authorisation header not found"
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        if (decoded.expiry > Date.now()) {
            res.status(403).json({
                error: true,
                message: "Authorisation header not found"
            });
            return;
        } 
        // End the middleware function and move to the authorised routes
        next();
    } catch (err) {
        res.status(500).json({
            error: true,
            message: "Invalid Token"
        });
    }
};

// router.use(authenticate);

router.post("/create", function (req, res, next) {
    // Create a quote
    const text = req.body.text;
    const by = req.body.by;
    let public = false;
    if (req.body.public) {
        public = true;
    }
    // Check that the query doesnt already exist
        // Check whether an extremely similar query exists

    // Create the new quote
    let newQuote = new Quote({
        text: text,
        by: by,
        public: public
    });
    newQuote.save(function (err, quote) {
        if (err) {
            res.status(500).json({
                error: true,
                message: "Internal Server Error"
            });
        }

        res.status(200).json({
            inserted: true,
            quote: quote
        });
    });
});

module.exports = router;