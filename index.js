String.prototype.format = function () {
    let args = arguments;
    return this.replace(/{(\d+)}/g, function (match, number) {
        return typeof args[number] != 'undefined' ? args[number] : match;
    });
};

// --------------------------------------------------------- //
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const service = require('./slip-8e306-firebase-adminsdk-aoudz-4d399c93bd.json');
const app = express();

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

//noinspection JSUnusedLocalSymbols
const authAdmin = {
    credential: admin.credential.cert(service),
    databaseURL: "https://slip-8e306.firebaseio.com"
};
//noinspection JSUnusedLocalSymbols
const authUser = {
    credential: admin.credential.cert(service),
    databaseURL: "https://slip-8e306.firebaseio.com",
    databaseAuthVariableOverride: {
        uid: "slip-server-admin"
    }
};

admin.initializeApp(authAdmin);

// ---------------------- Boilerplate ---------------------- //
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function (request, response) {
    response.render('pages/index');
});
// --------------------------------------------------------- //

const database = admin.database();
const userPath = "users/{0}";

/**
 * Request to obtain user information associated with a provided {@code UID}.
 *
 * @GET
 * query: {
 *     uid: @required @type {string}
 * }
 *
 * @200
 * response: {
 *     uid: @type {string},
 *     email: @type {string},
 *     phoneNumber: @type {string},
 *     firstName: @type {string},
 *     lastName: @type {string},
 *     occupation: @type {string},
 *     company: @type {string},
 *     signature: @type {long}
 * }
 *
 * @400, 403, 500
 * response: error
 */
app.get('/users', function (req, res) {
    let msg, msgTemplate = "GET users/{0} : {1}, {2}";
    if (!req.query.uid) {
        msg = "Cannot find user ID";
        res.status(400);
        res.send(msg);
        return;
    }
    database
        .ref(userPath.format(req.query.uid))
        .once('value', function (snapshot) {
            if (snapshot.val()) {
                msg = "User information retrieved";
                res.status(200);
                res.json(snapshot.val());
            } else {
                msg = "Invalid user ID";
                res.status(400);
                res.send(msg);
            }
        })
        .catch(function (error) {
            msg = error.toString();
            res.status(403);
            res.send(msg);
        })
        .then(function () {
            console.log(msgTemplate.format(req.query.uid || null, res.statusCode, msg));
        });
});

/**
 * Send a request adding a new user or updating an existing user's information.
 *
 * @POST
 * body: {
 *     uid: @required @type {string},
 *     email: @type {string},
 *     phoneNumber: @type {string},
 *     firstName: @type {string},
 *     lastName: @type {string},
 *     occupation: @type {string},
 *     company: @type {string},
 *     signature: @type {long}
 * }
 *
 * @200
 * response: success
 *
 * @400, 403, 500
 * response: error
 */
app.post('/users', function (req, res) {
    let msg, msgTemplate = "POST users/{0} : {1}, {2}";
    if (!req.body.user) {
        msg = "Cannot find user parameter";
    } else if (!req.body.user.uid) {
        msg = "Cannot find user ID";
    } else {
        const params = ['uid', 'email', 'phoneNumber', 'firstName', 'lastName', 'occupation', 'company', 'signature'];
        const invalid = [];
        for (const key in req.body.user) {
            if (req.body.user.hasOwnProperty(key)) {
                if (params.indexOf(key) == -1) {
                    invalid.push(key);
                }
            }
        }
        if (invalid.length > 0) {
            msg = "Invalid parameters: [{0}]".format(invalid);
        } else {
            database
                .ref(userPath.format(req.body.user.uid))
                .update(req.body.user, function (error) {
                    if (error) {
                        msg = "Database write error: {0}".format(error);
                        res.status(500);
                    } else {
                        msg = "User information updated";
                        res.status(200);
                    }
                })
                .catch(function (error) {
                    msg = error.toString();
                    res.status(403);
                })
                .then(function () {
                    res.send(msg);
                    console.log(msgTemplate.format(req.body.user.uid, res.statusCode, msg));
                });
            return;
        }
    }
    res.status(400);
    res.send(msg);
    console.log(msgTemplate.format(req.body.user ? req.body.user.uid || null : null, res.statusCode, msg));
});

/**
 * Send a request to delete a user, providing a {@code UID}.
 *
 * @DELETE
 * body: {
 *     uid: @required @type {string}
 * }
 *
 * @200
 * response: success
 *
 * @400, 403, 500
 * response: error
 */
app.delete('/users', function (req, res) {
    let msg, msgTemplate = "DELETE users/{0} : {1}, {2}";
    if (!req.body.uid) {
        msg = "Cannot find user ID";
        res.status(400);
        res.send(msg);
        console.log(msgTemplate.format(null, res.statusCode, msg));
    } else {
        database
            .ref(userPath.format(req.body.uid))
            .set(null, function (error) {
                if (error) {
                    msg = "Database delete error: {0}".format(error);
                    res.status(500);
                } else {
                    msg = "User successfully deleted";
                    res.status(200);
                }
            })
            .catch(function (error) {
                msg = error.toString();
                res.status(403);
            })
            .then(function () {
                res.send(msg);
                console.log(msgTemplate.format(req.body.uid, res.statusCode, msg));
            });
    }
});

/**
 * Open the server port and listen to requests
 * @type {http.Server}
 */
const server = app.listen(app.get('port'), function () {
    const host = server.address().address;
    const port = server.address().port;
    console.log("Slip server listening on http://%s:%s", host, port);
});