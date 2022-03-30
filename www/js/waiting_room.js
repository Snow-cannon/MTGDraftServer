"use_strict";

import * as cookie from './cookie.js';

const socket = io();

//Set up buttons
let bail_button = document.getElementById('bail');
let start_button = document.getElementById('start');
bail_button.onclick = leave_table;
start_button.onclick = start_game;

//Set up name table
let user_table = document.getElementById('user_table');

//Set up table_id
let table_id_elem = document.getElementById('table_id');
let table_id = cookie.getCookie('table_id');
table_id_elem.innerText = 'Table: ' + table_id;

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

socket.on('user_joined', function (data) {
    add_user_to_table(data.name, data.id);
});

socket.on('user_left', function (data) {
    remove_user_from_table(data.id);
});

socket.on('user_disconnected', function (data) {
    remove_user_from_table(data.id);
});

//Detect if you are the host
socket.emit('am_host');
get_usernames();


function get_usernames() {

    let name = '__request';
    let data = {
        command: 'game_request',
        game: {
            request: 'get_usernames',
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
        })
        .then(function (response) {
            let res = response.json();
            return res;
        })
        .then(function (data) {
            if (data.ok) {
                //Clear the name table
                while (user_table.firstChild) {
                    user_table.removeChild(user_table.firstChild);
                }

                //Build up the new table of names
                data.data.map(uobj => { add_user_to_table(uobj.name, uobj.id); });
            }
        });

}

function add_user_to_table(name, id) {
    let tr = document.createElement('tr');
    let td = document.createElement('td');
    td.textContent = name;
    tr.classList.add('username_display');
    tr.id = 'user_id:' + id;
    console.log(tr);
    tr.appendChild(td);
    user_table.appendChild(tr);
}

function remove_user_from_table(id){
    let elem = document.getElementById('user_id:' + id);
    while(elem){
        elem.remove();
        elem = document.getElementById('user_id:' + id);
    }
}




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
        })
        .then(function (response) {
            let res = response.json();
            return res;
        })
        .then(function (data) {
            cookie.setCookie('table_id', data.table_id);
            cookie.setCookie('user_id', data.user_id);

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
    });
}

//Clear the users local storage upon entering the waiting room
//Data need not be saved between games, so this is an optimal time to clear it
window.onload = () => {
    window.localStorage.clear();
}