import * as game from "./game.js";


export async function postState(state) {

    console.log('sending state');

    let name = '__request';
    let data = {
        command: 'game_request',
        game: {
            request: 'updata_game_state',
            params: {
                data: state
            }
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
            console.log(data);
            if(data.ok){
                
            } else {
                console.log('updating error');
            }
        });

}

export async function concedeGame() {

    console.log('sending state');

    let name = '__request';
    let data = {
        command: 'game_request',
        game: {
            request: 'concede_game',
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
            console.log(data);
            if(data.ok){
                
            } else {
                console.log('server error');
            }
        });

}

export async function getState() {

    let name = '__request';
    let data = {
        command: 'game_request',
        game: {
            request: 'get_table_state',
            params: {}
        }
    };

    let strdat = JSON.stringify(data);

    await fetch(name, {
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
                let content = data.data;
                if(content.update != undefined){
                    game.importState(content.update, content.last);
                }
            } else {
                console.log('fetch state error');
            }
        });

}

const socket = io();

socket.on('log', function (data) {
    console.log(data);
});

socket.on('get_state', function (data) {
    console.log('getting state');
    getState();
});

socket.on('reload', function (data) {
    location.reload();
});