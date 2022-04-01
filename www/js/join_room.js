"use_strict";

import * as cookie from './cookie.js';

var joinButton = document.getElementById("joinTable");
joinButton.onclick = joinTable;

var createButton = document.getElementById("createTable");
createButton.onclick = createTable;

let tablewidget = document.getElementById("tableID");
let oldTableId = cookie.getCookie('table_id');
tablewidget.value = '';
if (oldTableId > -1) {
    tablewidget.value = oldTableId;
}

let namewidget = document.getElementById("userName");
namewidget.value = cookie.getCookie('user_name');
namewidget.focus();


function joinTable(evt) {

    if (namewidget.value === '') {
        alert('You must enter a username!');
        return;
    } else {
        //Set username cookie
        cookie.setCookie('user_name', namewidget.value, 1);
    }

    let name = '__request';
    let data = {
        command: 'join_table',
        join_id: tablewidget.value
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

            let table_id = cookie.getCookie('table_id');
            if (table_id > -1) {
            } else {
                alert('Join failed');
            }

            if (data.table_id > -1) {
                location.reload();
            }
        });
}




function createTable(evt) {

    if (namewidget.value === '') {
        alert('You must enter a username!');
        return;
    } else {
        //Set username cookie
        cookie.setCookie('user_name', namewidget.value, 1);
    }

    let name = '__request';
    let data = {
        command: 'create_table'
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

            //Set username cookie
            cookie.setCookie('user_name', namewidget.value, 1);

            if (data.table_id > -1) {
                location.reload();
            }
        })

}