"use_strict";

import * as cookie from './cookie.js';
import { Logger } from './logger.js';

const socket = io();
const cardDiv = document.getElementById('pack_holder');
const deckDiv = document.getElementById('deck_holder');

socket.on('make_host', function (data) {
    console.log('You are host!');
});

socket.on('get_hand', function (data) {
    console.log('get hand pls');
    getPackFromServer();
});

socket.emit('request_hand');



let cardSelected;
let cardSelectedIndex;

function clearSelectedCards(parent) {
    for(const child of parent.children) {
        child.classList.remove("selected");
    }
}

function renderCards(pack, element, clickEvent){
    for(let i = 0; i < pack.length; ++i){
        let card = pack[i]
        const cardImg = document.createElement("img");
        cardImg.classList.add("card");
        cardImg.src = card.img;
        if(card.back !== ""){
            cardImg.addEventListener("mouseover", () => {cardImg.src = card.back});
            cardImg.addEventListener("mouseout", () => {cardImg.src = card.img});
        }
        if(clickEvent){
            cardImg.addEventListener("mouseup", () => {
                cardSelected = card;
                cardSelectedIndex = i;
                clearSelectedCards(element)
                cardImg.classList.add("selected")
                console.log(packArr);
            });
        }
        element.appendChild(cardImg);
    }
}

async function getPackFromServer(){
    let name = '__request';
    let data = {
        command: 'game_request',
        game: {
            request: 'get_user_pack',
            params: {}
        }
    };

    let strdat = JSON.stringify(data);

    let response = await fetch(name, {
        method: "post",
        body: strdat,
        headers: { 'Content-Type': 'application/json' }
    });

    if(response.ok){
        let responseJSON = await response.json();
        if(responseJSON.ok){
            renderCards(responseJSON.pack, cardDiv, true);
        }
    }
}