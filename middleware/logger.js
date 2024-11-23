
const requestLogger = (req, res, next) => {
        console.log('Method:', req.method);
        console.log('Path:  ', req.path);
        console.log('Body:  ', req.body);
        // Intercept the response body
        // const originalSend = res.send;
        // res.send = function (body) {
        //     console.log('Response Body:', body); // Log the response body
        //     originalSend.call(this, body); // Call the original res.send with the body
        // };
        // console.log('---');
        next();
    };
    
module.exports = requestLogger;