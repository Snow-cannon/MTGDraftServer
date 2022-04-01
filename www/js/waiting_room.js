"use_strict";

import * as cookie from './cookie.js';

const socket = io();

//Set up buttons
let bailButton = document.getElementById('bail');
let startButton = document.getElementById('start');
bailButton.onclick = leaveTable;
startButton.onclick = startGame;

//Set up cube-import element
const cubeInput = document.getElementById('cube_import');
cubeInput.addEventListener('input', (e) => { //Set row count to be in the range 2 < n < 10
    let rows = cubeInput.value.split("\n").length;
    cubeInput.rows = Math.min(10, Math.max(rows, 2));
});

//Get wrapper div. Hides all cube-import elements
const importCubeWrapper = document.getElementById('wrapper');
importCubeWrapper.style.display = 'none';

//Set up name table
let userTable = document.getElementById('user_table');

//Set up table_id
let tableIdElem = document.getElementById('table_id');
let tableId = cookie.getCookie('table_id');
tableIdElem.innerText = 'Table: ' + tableId; //Display the table ID

//Set up socket listeners
socket.on('log', function (data) { //Log server data
    console.log(data);
});

socket.on('reload', function (data) { //Force a page reload
    location.reload();
});

socket.on('make_host', function (data) { //Set yourself to be the host
    startButton.style.display = 'inline';
    importCubeWrapper.style.display = 'inline';
});

socket.on('revoke_host', function (data) { //Set yourself as a basic player
    startButton.style.display = 'none';
    importCubeWrapper.style.display = 'none';
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

function removeUserFromTable(id){
    let elem = document.getElementById('user_id:' + id);
    while(elem){
        elem.remove();
        elem = document.getElementById('user_id:' + id);
    }
}

//Define functions
function leaveTable() {

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

function startGame() {

    let name = '__request';
    let data = {
        command: 'game_request',
        game: {
            request: 'start_game',
            params: {
                cubeData: cubeInput.value
            }
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