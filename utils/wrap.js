// Express 4 mein async route ke errors ko error-handler tak pahunchane ke liye
module.exports = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
