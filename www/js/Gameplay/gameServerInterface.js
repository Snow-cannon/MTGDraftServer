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
                game.importState(data.data);
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