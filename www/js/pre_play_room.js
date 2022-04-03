"use_strict";

import * as cookie from './cookie.js';

const socket = io();

//Set up buttons
let startButton = document.getElementById('start');
startButton.onclick = startGame;


//Set up name table
let userTable = document.getElementById('user_table');

//Set up table_id
let tableIdElem = document.getElementById('table_id');
let tableId = '...';
tableIdElem.innerText = 'Table: ' + tableId; //Display the table ID
getTableID();

//Set up socket listeners
socket.on('log', function (data) { //Log server data
    console.log(data);
});

socket.on('reload', function (data) { //Force a page reload
    location.reload();
});

socket.on('make_host', function (data) { //Set yourself to be the host
    startButton.style.display = 'inline';
});

socket.on('revoke_host', function (data) { //Set yourself as a basic player
    startButton.style.display = 'none';
});

socket.on('user_joined', function (data) { //Add to the user table
    addUserToTable(data.name, data.id);
});

socket.on('user_left', function (data) { //Remove from the user table
    removeUserFromTable(data.id);
});

socket.on('user_disconnected', function (data) { //Remove from the user table
    removeUserFromTable(data.id);
});

//Detect if you are the host
socket.emit('am_host');
getUsernames(); //Fill the username table with current users


function getUsernames() {

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
                while (userTable.firstChild) {
                    userTable.removeChild(userTable.firstChild);
                }

                //Build up the new table of names
                data.data.map(uobj => { addUserToTable(uobj.name, uobj.id); });
            }
        });

}

function getTableID() {

    let name = '__request';
    let data = {
        command: 'game_request',
        game: {
            request: 'get_table_id',
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
                tableId = data.table_id;
                tableIdElem.innerText = 'Table: ' + tableId; //Display the table ID
            }
        });

}

function addUserToTable(name, id) {
    let tr = document.createElement('tr');
    let td = document.createElement('td');
    td.textContent = name;
    tr.classList.add('username_display');
    tr.id = 'user_id:' + id;
    console.log(tr);
    tr.appendChild(td);
    userTable.appendChild(tr);
}

function removeUserFromTable(id) {
    let elem = document.getElementById('user_id:' + id);
    while (elem) {
        elem.remove();
        elem = document.getElementById('user_id:' + id);
    }
}

function startGame() {

    let name = '__request';
    let data = {
        command: 'game_request',
        game: {
            request: 'start_matches',
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