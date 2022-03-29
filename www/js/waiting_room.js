"use_strict";

import * as cookie from './cookie.js';
import { Logger } from './logger.js';

const socket = io();

let logger = new Logger(true);

//Set up buttons
let bail_button = document.getElementById('bail');
let start_button = document.getElementById('start');
bail_button.onclick = leave_table;
start_button.onclick = start_game;

//Set up socket listeners
socket.on('log', function (data) {
    console.log(data);
});

socket.on('reload', function (data) {
    location.reload();
});

socket.on('make_host', function (data) {
    start_button.style.display = 'inline';
});

socket.on('revoke_host', function (data) {
    start_button.style.display = 'none';
});

//Detect if you are the host
socket.emit('am_host');


//Define functions
function leave_table() {

    let name = '__request';
    let data = {
        command: 'leave_table'
    };

    let strdat = JSON.stringify(data);

    fetch(name, {
        method: "post",
        body: strdat,
        headers: { 'Content-Type': 'application/json' }
    })
        .catch(function (error) {
            logger.log('leave_table', 'Error leaving table', error);
        })
        .then(function (response) {
            let res = response.json();
            logger.log('leave_table', 'returned resource', res);
            return res;
        })
        .then(function (data) {
            logger.log('leave_table', 'Current table', data.table_id);
            logger.log('leave_table', 'User ID', data.user_id);

            cookie.setCookie('table_id', data.table_id);
            cookie.setCookie('user_id', data.user_id);

            logger.log('leave_table', 'Table_ID Cookie', cookie.getCookie('table_id'));

            location.reload();
        });

}

function start_game() {

    let name = '__request';
    let data = {
        command: 'game_request',
        game: {
            request: 'start_game',
            params: {}
        }
    };

    let strdat = JSON.stringify(data);

    fetch(name, {
        method: "post",
        body: strdat,
        headers: { 'Content-Type': 'application/json' }
    })
        .catch(function (error) {
            logger.log('request_usernames', 'Error creating table', error);
        })
        .then(function (response) {
            let res = response.json();
            return res;
        })
        .then(function (data) {
 
        });
}

//Clear the users local storage upon entering the waiting room
//Data need not be saved between games, so this is an optimal time to clear it
window.onload = () => {
    window.localStorage.clear();
}