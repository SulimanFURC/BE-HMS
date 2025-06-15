const requestLogger = (req, res, next) => {
        console.log('------------ Request Body ------------------');
        console.log("Time: ", new Date().toISOString());
        console.log('Method:', req.method);
        console.log('Path:  ', req.path);
        console.log('Body:  ', req.body);
        console.log('------------ Request Body END ------------------');
    
        // Intercept the response body
        const originalJson = res.json;
        const originalSend = res.send;
    
        res.json = function (body) {
            console.log('------------ Response Body ------------------');
            console.log('Body:  ', body);
            console.log('------------ Response Body END ------------------');
            return originalJson.call(this, body);
        };
        res.send = function (body) {
            console.log('------------ Response Body ------------------');
            console.log('Body:  ', body);
            console.log('------------ Response Body END ------------------');
            return originalSend.call(this, body);
        };
    
        next();
    };
    
module.exports = requestLogger;