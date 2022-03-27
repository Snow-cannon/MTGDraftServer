"use_strict";

import * as cookie from './cookie.js';
import { Logger } from './logger.js';

const socket = io();
const cardDiv = document.getElementById('pack_holder');
const deckDiv = document.getElementById('deck_holder');
const ls = window.localStorage;

socket.on('make_host', function (data) {
    console.log('You are host!');
});

socket.on('get_hand', function (data) {
    getPackFromServer();
});

socket.emit('request_hand');



let cardSelected;
let cardSelectedIndex;
let userDeck = [];

function clearSelectedCards(parent) {
    for (const child of parent.children) {
        child.classList.remove("selected");
    }
}
function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function renderCards(pack, element, clickEvent) {
    for (let i = 0; i < pack.length; ++i) {
        let card = pack[i]
        const cardImg = document.createElement("img");
        cardImg.classList.add("card");
        cardImg.src = card.img;
        if (card.back !== "") {
            cardImg.addEventListener("mouseover", () => { cardImg.src = card.back });
            cardImg.addEventListener("mouseout", () => { cardImg.src = card.img });
        }
        if (clickEvent) {
            cardImg.addEventListener("mouseup", () => {
                cardSelected = card;
                cardSelectedIndex = i;
                clearSelectedCards(element)
                cardImg.classList.add("selected")
            });
        }
        element.appendChild(cardImg);
    }
}

async function getPackFromServer() {

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

    if (response.ok) {
        let responseJSON = await response.json();
        if(responseJSON.ok){
            renderCards(responseJSON.pack, cardDiv, true);
        }
    }
}


function confirmSelection(element){
    if(cardSelected !== undefined){
        addToDeck(cardSelected); 
        currPack.splice(cardSelectedIndex, 1);
        removeAllChildNodes(element); 
        renderCards(currPack, element, true);
        cardSelected = undefined;
    }
}

function addToDeck(card){
    userDeck.push(card);
    renderCards([card], deckDiv, false);
    ls.setItem('deck') = json.stringify(userDeck);
}

const confirmButton = document.getElementById('confirm');
confirmButton.addEventListener("click", () => {confirmSelection(cardDiv)});

window.onload = () => {
    userDeck = JSON.parse(ls.getItem('deck'));
}