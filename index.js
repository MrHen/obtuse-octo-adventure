var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.get('/healthcheck', function (req, res) {
    res.send('Heroku World!');
});

app.use(express.static('app'));

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});


