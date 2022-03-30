"use_strict";

import * as cookie from './cookie.js';

var join_button = document.getElementById("joinTable");
join_button.onclick = join_table;

var create_button = document.getElementById("createTable");
create_button.onclick = create_table;

let tablewidget = document.getElementById("tableID");
let old_table_id = cookie.getCookie('table_id');
tablewidget.value = '';
if (old_table_id > -1) {
    tablewidget.value = old_table_id;
}

let namewidget = document.getElementById("userName");
namewidget.value = cookie.getCookie('user_name');
namewidget.focus();


function join_table(evt) {

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




function create_table(evt) {

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