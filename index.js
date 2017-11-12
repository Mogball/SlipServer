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
    databaseAuthletiableOverride: {
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
const connectionPath = "connections/{0}";
const messagePath = "messages";

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
 * Request to obtain a list of a user's connections.
 *
 * @GET
 * query: {
 *     uid: @required @type {string}
 * }
 *
 * @200, 204
 * response: {
 *     $key: $uid
 * }
 *
 * @400, 403, 500
 * response: error
 */
app.get('/connections', function (req, res) {
    let msg, msgTemplate = "GET connections/{0} : {1}, {2}";
    if (!req.query.uid) {
        msg = "Cannot find user ID";
        res.status(400);
        res.send(msg);
        console.log(msgTemplate.format(null, res.statusCode, msg));
    } else {
        database
            .ref(connectionPath.format(req.query.uid))
            .once('value', function (snapshot) {
                if (!snapshot.val()) {
                    msg = "No user connections";
                    res.status(204);
                    res.json({});
                } else {
                    msg = "Retrieved {0} connections".format(snapshot.numChildren());
                    res.status(200);
                    res.json(snapshot.val());
                }
            })
            .catch(function (error) {
                msg = error.toString();
                res.status(403);
                res.send(msg);
            })
            .then(function () {
                console.log(msgTemplate.format(req.query.uid, res.statusCode, msg));
            });
    }
});

app.get('/messages', function (req, res) {
    let msg, msgTemplate = "GET messages : {0}, {1}";
    if (!req.query.lat || !req.query.lon) {
        msg = "Null latitude or longitude";
        res.status(400);
        res.send(msg);
        console.log(msgTemplate.format(res.statusCode, msg));
        return;
    }
    database.ref(messagePath).once('value', function (snapshot) {
        snapshot.forEach(function (child) {
            const key = child.key;
            const data = child.val();
        });
    });
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


let quadtree = {};

quadtree.encode = function (coordinate, precision) {

    let origin = {lng: 0, lat: 0};
    let range = {lng: 180, lat: 90};

    let result = '';

    while (precision > 0) {
        range.lng /= 2;
        range.lat /= 2;

        if ((coordinate.lng < origin.lng) && (coordinate.lat >= origin.lat)) {
            origin.lng -= range.lng;
            origin.lat += range.lat;
            result += '0';
        } else if ((coordinate.lng >= origin.lng) && (coordinate.lat >= origin.lat)) {
            origin.lng += range.lng;
            origin.lat += range.lat;
            result += '1';
        } else if ((coordinate.lng < origin.lng) && (coordinate.lat < origin.lat)) {
            origin.lng -= range.lng;
            origin.lat -= range.lat;
            result += '2';
        } else {
            origin.lng += range.lng;
            origin.lat -= range.lat;
            result += '3';
        }

        --precision;
    }

    return result;
};

quadtree.decode = function (encoded) {
    let origin = {lng: 0, lat: 0};
    let error = {lng: 180, lat: 90};

    let precision = encoded.length;
    let currentPrecision = 0;

    while (currentPrecision < precision) {
        error.lng /= 2;
        error.lat /= 2;

        let quadrant = encoded[currentPrecision];
        if (quadrant === '0') {
            origin.lng -= error.lng;
            origin.lat += error.lat;
        } else if (quadrant === '1') {
            origin.lng += error.lng;
            origin.lat += error.lat;
        } else if (quadrant === '2') {
            origin.lng -= error.lng;
            origin.lat -= error.lat;
        } else {
            origin.lng += error.lng;
            origin.lat -= error.lat;
        }

        ++currentPrecision;
    }

    return {origin: origin, error: error};
};

quadtree.neighbour = function (encoded, north, east) {
    let decoded = quadtree.decode(encoded);
    let neighbour = {
        lng: decoded.origin.lng + decoded.error.lng * east * 2,
        lat: decoded.origin.lat + decoded.error.lat * north * 2
    };

    return quadtree.encode(neighbour, encoded.length);
};

quadtree.bbox = function (encoded) {
    let decoded = quadtree.decode(encoded);

    return {
        minlng: decoded.origin.lng - decoded.error.lng,
        minlat: decoded.origin.lat - decoded.error.lat,
        maxlng: decoded.origin.lng + decoded.error.lng,
        maxlat: decoded.origin.lat + decoded.error.lat
    };
};

quadtree.envelop = function (bbox, precision) {
    let end = quadtree.encode({lng: bbox.maxlng, lat: bbox.maxlat}, precision);

    let rowStart = quadtree.encode({lng: bbox.minlng, lat: bbox.minlat}, precision);
    let rowEnd = quadtree.encode({lng: bbox.maxlng, lat: bbox.minlat}, precision);

    let current = rowStart;

    let quadtrees = [];
    while (true) {
        while (current != rowEnd) {
            quadtrees.push(current);
            current = quadtree.neighbour(current, 0, 1);
        }

        if (current == end) break;

        quadtrees.push(rowEnd);

        rowEnd = quadtree.neighbour(rowEnd, 1, 0);
        rowStart = quadtree.neighbour(rowStart, 1, 0);
        current = rowStart;
    }

    quadtrees.push(end);
    return quadtrees;
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = quadtree;
}
else {
    if (typeof define === 'function' && define.amd) {
        define([], function () {
            return quadtree;
        });
    }
    else {
        window.quadtree = quadtree;
    }
}