// index.js -- rules server for node

"use strict";

const { log, log_in, statement, set_logger_theme, set_max_height, set_max_depth } = require('./logger.js');



set_max_depth(4);
set_max_height(100);
log('test', 'test', { test: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] });



const express = require('express');
const app = express();
app.use(express.json());

const cookieParser = require('cookie-parser');
const session = require('express-session');
app.use(cookieParser());
var sessionMW = session({
    secret: 'thisIsServer',
    resave: true,
    saveUninitialized: true,
    // One Day
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
});
app.use(sessionMW);

//Update the server version
let server_version_obj = require('./version.json');
server_version_obj.version += 1;

var jsonfile = require('jsonfile');
jsonfile.writeFile('./version.json', server_version_obj, { spaces: 4 }, function (err) {
    statement('Version Control Error', (err === null) ? 'No Error' : err);
});

//Get the server version
var server_version = server_version_obj.version;

statement('Server version', server_version);

//User/Table stuff
var socketIO = require('socket.io');
const users = require('./user.js');
const tables = require('./table.js');

const url = require('url');
const path = require('path');
const fs = require('fs');

const full_dist = false;
const try_dist = false;

function www_root() {

    var p = path.parse(process.cwd());
    // root, dir, base, ext, name

    let www;
    if (full_dist) {
        www = path.join(p.dir, "dist");
    } else {
        www = path.join(p.dir, "www");
    }

    return www;
}

function js_root() {
    var p = path.parse(process.cwd());
    // root, dir, base, ext, name

    let www;
    if (try_dist) {
        www = path.join(p.dir, "dist");
    } else {
        www = path.join(p.dir, "www");
    }
    return www;
}

// -------------------------------------------------
// Main entry point is /
app.get('/', (req, res) => {

    //Set the main game path
    var pp = path.join(www_root(), 'html', 'room_view.html');

    //Create cookie reset functions

    //If their user ID is invalid, send them to the join page
    const resetTableCookie = function () {
        req.session.table_id = -1;
        res.cookie('table_id', -1);
        req.cookies.table_id = -1;
        pp = path.join(www_root(), 'html', 'join.html');
    }

    //If their table ID is invalid, send them to the join page
    const resetUserCookie = function () {
        req.session.user_id = -1;
        res.cookie('user_id', -1);
        req.cookies.user_id = -1;
        pp = path.join(www_root(), 'html', 'join.html');
    }

    //Check for an outdated cookie
    let cookie_version = -1;

    //Get the cookie's server version if it has one
    if (req.cookies.cookie_version !== undefined) {
        cookie_version = parseInt(req.cookies.cookie_version);
    }

    //Get the user and table ID from the request
    let user_id = parseInt(req.cookies.user_id);
    let table_id = parseInt(req.cookies.table_id);

    //Check if the cookie is up-to-date
    if (cookie_version !== server_version) {
        resetTableCookie();
        resetUserCookie();

        req.session.cookie_version = server_version;
        res.cookie('cookie_version', server_version);
        req.cookies.cookie_version = server_version;

    } else {

        //Check if the cookie has a table and user ID
        if (!req.cookies.table_id || !req.cookies.user_id) {
            resetTableCookie();
            resetUserCookie();
        } else {
            log('GET', 'Request User_ID', { user_id: user_id });
            if (!users.exists(user_id)) {
                resetTableCookie();
                resetUserCookie();
            } else if (!tables.exists(table_id)) {
                resetTableCookie();
            } else if (!users.user_table_match(user_id)) {
                resetUserCookie();
                resetTableCookie();
            } else {
                req.session.user_id = user_id;
                req.session.table_id = table_id;
            }
        }
    }


    var s = fs.createReadStream(pp);
    s.on('open', function () {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        s.pipe(res);
    });
    s.on('error', function () {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Not found');
    });

});

// -------------------------------------------------
// testing files

app.get('/mocha/*.js', (req, res) => {
    showMochaFile(req, res, 'text/javascript');
});

function showMochaFile(req, res, content) {
    var q = url.parse(req.url, true);
    // protocol, auth, host port hostname hash search query pathname path href

    var qp = path.parse(q.pathname);

    var pp = path.join(www_root(), '../node/node_modules/mocha', qp.base);

    var s = fs.createReadStream(pp);
    s.on('open', function () {
        res.writeHead(200, { 'Content-Type': content });
        s.pipe(res);
    });
    s.on('error', function () {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Mocha file Not found');
        log('showMochaFile', 'Unable to find', { path: pp });
    });
}

app.get('/chai/*.js', (req, res) => {
    showChaiFile(req, res, 'text/javascript');
});

function showChaiFile(req, res, content) {
    var q = url.parse(req.url, true);
    // protocol, auth, host port hostname hash search query pathname path href

    var qp = path.parse(q.pathname);

    var pp = path.join(www_root(), '../node/node_modules/chai', qp.base);

    var s = fs.createReadStream(pp);
    s.on('open', function () {
        res.writeHead(200, { 'Content-Type': content });
        s.pipe(res);
    });
    s.on('error', function () {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Mocha file Not found');
        log('showChaiFile', 'Unable to find', { path: pp });
    });
}
// --------------------
// Web resources files.

app.get('*.js', (req, res) => {
    showJSFile(req, res, 'text/javascript');
});

function showJSFile(req, res, content) {
    var q = url.parse(req.url, true);
    // protocol, auth, host port hostname hash search query pathname path href

    var pp = path.join(js_root(), q.pathname);

    var s = fs.createReadStream(pp);
    s.on('open', function () {
        res.writeHead(200, { 'Content-Type': content });
        s.pipe(res);
    });
    s.on('error', function () {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Not found');
        log('showJSFile', 'Unable to find', { path: pp });
    });
}

app.get('*.json', (req, res) => {
    showFile(req, res, 'text/json');
});

app.get('*.html', (req, res) => {
    showFile(req, res, 'text/html');
});

function showFile(req, res, content) {
    var q = url.parse(req.url, true);
    // protocol, auth, host port hostname hash search query pathname path href

    var pp = path.join(www_root(), q.pathname);

    var s = fs.createReadStream(pp);
    s.on('open', function () {
        res.writeHead(200, { 'Content-Type': content });
        s.pipe(res);
    });
    s.on('error', function () {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Not found');
        log('showFile', 'Unable to find', { path: pp });
    });
}

// --------------
// Media files

app.get('\*.css', (req, res) => {
    showFile(req, res, 'text/css');
});

app.get('\*.ico', (req, res) => {
    showMedia(req, res, 'image/x-icon');
});

app.get('/\*.jpg', (req, res) => {
    showMedia(req, res, 'image/jpeg');
});

app.get('/\*.png', (req, res) => {
    showMedia(req, res, 'image/jpeg');
});

app.get('/\*.svg', (req, res) => {
    showMedia(req, res, 'image/svg');
});

app.get('/\*.mp3', (req, res) => {
    showMedia(req, res, 'audio/mpeg');
});

function showMedia(req, res, content) {
    var q = url.parse(req.url, true);
    // protocol, auth, host port hostname hash search query pathname path href

    var rp = path.join(www_root(), decodeURI(q.pathname));

    if (!fs.existsSync(rp)) {
        log('showMedia', 'Unable to find', { path: rp });
        res.writeHead(404, { 'Content-Type': 'text/html' });
        return res.end("404 Not Found");
    }

    // From https://stackoverflow.com/questions/5823722/how-to-serve-an-image-using-nodejs
    var s = fs.createReadStream(rp);
    s.on('open', function () {
        res.writeHead(200, { 'Content-Type': content });
        s.pipe(res);
    });
    s.on('error', function () {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('Not found');
    });
};

// ---------------------------------------
// Game Implementation
const debug = false;

app.post('/__request', (req, res) => {
    var data = req.body;

    var cmd = data.command;
    let user_id = parseInt(req.cookies.user_id);
    let table_id = parseInt(req.cookies.table_id);
    let cookie_version = parseInt(req.cookies.cookie_version);
    let tobj = undefined;
    let uobj = undefined;
    let return_val = undefined;
    let join_success = false;
    let join_id = -1;

    switch (cmd) {
        case 'create_table':
            //Log the action
            log_in('POST', 'create_table', 'Running...');

            //Create the new table
            tobj = tables.create_table(999);

            //Check that users cookies are updated to the most recent version
            if (cookie_version !== server_version) {
                uobj = undefined;
            } else {
                //Get the user based off ID
                uobj = users.get_user(user_id);
            }

            //If the user does not exist, create one
            if (uobj !== undefined) {

            } else {
                uobj = users.add_user(req.cookies.user_name);
                log_in('POST', 'create_table', 'Adding user', { user: uobj.id });
            }

            //Check that the new table exists
            if (tobj !== undefined) {
                //Add the user to the table (join removes it from the old table)
                join_success = tables.join_table(uobj.id, tobj.id);
            } else {
                //If the table dose not exist, log that it is missing
                log_in('POST', 'create_table', 'created table does not exist', { table: tobj.id });
            }

            //If the user was unable to join the table, clear it
            if (!join_success) { tobj = undefined; }

            //Create the returned object
            return_val = { table_id: (tobj !== undefined) ? tobj.id : -1, user_id: (uobj !== undefined) ? uobj.id : -1, version: server_version };
            log_in('create_table', 'Return Value', { return: JSON.stringify(return_val) });

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(JSON.stringify(return_val));
            return res.end("");

        case 'join_table':
            //Log the action
            log_in('POST', 'join_table', 'Running...');

            join_id = parseInt(data.join_id)

            //Create the new table
            tobj = tables.get_table(join_id);

            //Get the user based off ID
            uobj = users.get_user(user_id);

            //If the user does not exist, create one
            if (uobj !== undefined) {
                //Do nothing if the user exists
            } else {
                uobj = users.add_user(req.cookies.user_name);
                log_in('join_table', 'Adding user', { user: uobj.id });
            }

            join_success = false;

            //Check that the table exists
            if (tobj !== undefined) {
                //Add the user to the table (join removes it from the old table)
                join_success = tables.join_table(uobj.id, tobj.id);
            } else {
                //If the table dose not exist, log that it is missing
                log_in('POST', 'join_table', 'Table does not exist', { table: join_id });
            }

            if (!join_success) { tobj = undefined; }

            //Create the returned object
            return_val = { table_id: -1, user_id: -1 };
            if (tobj !== undefined) { return_val.table_id = tobj.id; }
            if (uobj !== undefined) { return_val.user_id = uobj.id; }
            log_in('POST', 'join_table', 'Return Value', { return: JSON.stringify(return_val) });

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(JSON.stringify(return_val));
            return res.end("");

        case 'leave_table':
            tables.leave_table(user_id);

            log('POST', 'User left table', { table_id: table_id });

            return_val = { table_id: -1, user_id: -1 };
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(JSON.stringify(return_val));
            return res.end("");

        default:
            log('POST', 'Unknown command request', { cmd: cmd });
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write("Bad post data for request.");
            return res.end("What?");
    };

});


// ----------------------------------------
// Server init

var server = app.listen(8008, () => {
    var host = server.address().address;
    var port = server.address().port;

    statement("Server listening at", host, port);
});

var io = socketIO(server);

io.use(function (socket, next) {
    sessionMW(socket.request, socket.request.res, next);
    statement('Socket Session setup for new socket');
});


// ----------------------------------------
// Socket Stuff here

io.on('connection', function (socket) {

    /**
     * Validates that the socket is connected to a user. If the User
     * does exist it calls the callback function. Otherwise it forces
     * a reload
     * @param {Socket} socket 
     * @param {uobj|socket} callback 
     */
    const validate_callback = function (socket, callback) {
        let user_id = socket.request.session.user_id;
        let uobj = users.get_user(user_id);
        if (uobj !== undefined && user_id > -1) {
            callback(socket, uobj);
        } else {
            socket.emit('reload');
        }
    }

    //Assign the socket to the user if the user exists
    if (users.exists(socket.request.session.user_id)) {
        let uobj = users.get_user(socket.request.session.user_id);
        uobj.set_socket(socket);
        uobj.activate();
        uobj.notify_table('log', uobj.display_name + ' joined');
        log_in('SOCKET', 'set_socket', 'User ID', { userID: uobj.id }, { display_name: uobj.display_name });
    }

    socket.on('bleep', function (e) {
        validate_callback(socket, (socket, uobj) => {
            uobj.notify_table('log', 'Bleep!');
        });
    });

    socket.on('disconnect', function (e) {
        validate_callback(socket, (socket, uobj) => {
            uobj.deactivate();
            uobj.notify_table('log', 'User ' + users.get_user(uobj.id).display_name + ' disconnected');
        });
    });

});