"use_strict";

import * as cookie from './cookie.js';
import { Logger } from './logger.js';

const socket = io();

let logger = new Logger(true);

let table_id_display = document.getElementById('table_id_display');
let user_id_display = document.getElementById('user_id_display');
let user_name_display = document.getElementById('user_name_display');

let user_id = cookie.getCookie('user_id');
let table_id = cookie.getCookie('table_id');
let user_name = cookie.getCookie('user_name');

let bleep_button = document.getElementById('bleep');
let bail_button = document.getElementById('bail');
let start_button = document.getElementById('start');

start_button.style.display = 'none';

bleep_button.onclick = () => socket.emit('bleep');
bail_button.onclick = leave_table;
start_button.onclick = start_game;

table_id_display.innerText = 'table: ' + table_id;
user_id_display.innerText = 'user: ' + user_id;
user_name_display.innerText = 'Name: ' + user_name;



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

socket.emit('am_host');


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

window.onload = () => {
    window.localStorage.clear();
}