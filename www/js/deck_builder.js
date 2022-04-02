const numCardsInDeck = document.getElementById('card-count');

let width = window.innerWidth;
let height = window.innerHeight;

let stage = new Konva.Stage({
    container: 'container',
    width: width,
    height: height,
});
stage.container().style.position = 'absolute';
stage.container().style.top = '3%';
stage.container().style.left = '0';
const stageTop = () => container.getBoundingClientRect().y;
stage.height(container.getBoundingClientRect().height);

var con = stage.container();
con.addEventListener('dragover', function (e) {
    e.preventDefault(); // !important
});

//Layer for cards and Layer for overlay stuff such as selection Rectangles
let cardLayer = new Konva.Layer();
let topLayer = new Konva.Layer();
stage.add(cardLayer);
stage.add(topLayer);

//All cards are stored as well as all of the currenet selected cards
let cards = [];
let selectArr = [];
let showPopup = true;

//Constants to offset stacks of cards and the percentage of the card to crop
const yOffset = () => { return (cards[0] !== undefined) ? cards[0].height() / 6 : 40 };

//Get all of the zones in the document that are zones to put cards in
const cardZones = document.getElementsByClassName("sub-card-zone");
let cardZoneRects = [];

//Process the zones and get the rectangles. The object also stores the cards in the rectangles and a referenece to the parent div ID
for (let zone of cardZones) {
    cardZoneRects.push({ rect: zone.getBoundingClientRect(), cards: [], parent_id: zone.parentElement.id });
}

//When the window resizes, resize all of the cards to fit(roughly)
window.onresize = () => {
    stage.width(window.innerWidth);
    stage.height(container.getBoundingClientRect().height);
    for (let i = 0; i < cardZones.length; ++i) {
        let zone = cardZones[i]
        cardZoneRects[i].rect = zone.getBoundingClientRect();
    }
    for (let card of cards) {
        card.resize();
    }
    relayerCardZones();
}

//These event listeners deal keep track of the currently pressed keys for use in other functions
let keyDownObject = {};
document.addEventListener('keydown', (event) => {
    let name = event.key;
    let code = event.code;
    // Alert the key name and key code on keydown
    keyDownObject[name] = true;
}, false);
document.addEventListener('keyup', (event) => {
    let name = event.key;
    let code = event.code;
    // Alert the key name and key code on keydown
    keyDownObject[name] = false;
}, false);


/**
 * Creats a card from an image url and adds it to layer.
 * @param {String} url 
 */
function addCard(cardData, cropPercentage) {
    let imageObj = new Image();
    let scale = getSmallestZone(cropPercentage);
    imageObj.onload = function () {
        let card = new Konva.Image({
            x: 200,
            y: 250,
            offsetX: scale * 2.5 / 2,
            offsetY: scale * 3.5 / 2 * cropPercentage,
            image: imageObj,
            width: scale * 2.5,
            height: scale * 3.5 * cropPercentage,
            draggable: true,
            stroke: '#00FFFF',
            strokeWidth: 0,
            data: cardData,
        });
        //Crop the image to to the desired height
        card.crop({
            x: 0,
            y: 0,
            width: imageObj.width,
            height: imageObj.height * cropPercentage,
        });
        card.resize = () => {
            let scale = getSmallestZone(cropPercentage);
            card.offsetX(scale * 2.5 / 2);
            card.offsetY(scale * 3.5 / 2 * cropPercentage);
            card.width(scale * 2.5);
            card.height(scale * 3.5 * cropPercentage);
        }
        //Clone the card to use as a popup for more details
        let popup = card.clone();
        popup.crop({
            x: 0,
            y: 0,
            width: imageObj.width,
            height: imageObj.height,
        });
        popup.height(scale * 7);
        popup.width(scale * 5);
        popup.visible(false);

        //When you mouse over the card, show the popup inside the window
        card.on('mouseenter', (e) => {
            if (!showPopup) { return }
            if (card.x() + card.width() + popup.width() > window.innerWidth) {
                popup.x(card.x() - popup.width());
            }
            else {
                popup.x(card.x() + card.width());
            }
            if (card.y() + popup.height() < window.innerHeight) {
                popup.y(card.y());
            }
            else {
                popup.y(card.y() - popup.height() + card.height());
            }
            popup.visible(true);
        });
        //Hide the popup
        card.on('mouseleave', (e) => {
            popup.visible(false);
        });
        topLayer.add(popup);

        //Double clicking while holding shift selects all of the cards in the zone of the card double-clicked
        card.on('dblclick', (e) => {
            if (keyDownObject['Shift']) {
                for (let zone of cardZoneRects) {
                    if (zone.cards.includes(card)) {
                        addSelection(zone.cards);
                        return;
                    }
                }
            }
        });
        //Dagging the card
        card.on('dragstart', (e) => {
            popup.visible(false);
            //If the shift key is down, don't start dragging
            if (keyDownObject['Shift']) {
                card.draggable(false);
                card.draggable(true);
                return;
            }
            //If the card is part of a group selection pick up the whole selection
            if (selectArr.includes(card)) {
                pickupCards(selectArr);
            }
            //Otherwise just pickup that card
            else {
                pickupCards([card]);
            }
        });
        //During drag
        card.on('dragmove', (e) => {
            //If the card is part of a selected group, move the group with the card
            if (selectArr.includes(card)) {
                for (let i = 0; i < selectArr.length; ++i) {
                    let c1 = selectArr[i];
                    if (c1 != card) {
                        c1.x(card.x());
                        c1.y(card.y() + (i - selectArr.indexOf(card)) * yOffset());
                    }
                    //Set the z-index in selection order(same as old zone)
                    c1.zIndex(cards.length - selectArr.length + i);
                }
            }
        });
        //On ending drag
        card.on('dragend', (e) => {
            if (keyDownObject['Shift']) {
                return;
            }
            if (selectArr.includes(card)) {
                dropCards(card, selectArr);
            }
            else {
                dropCards(card, [card]);
            }
            clearSelected();
            stage.batchDraw();
        });
        // add the shape to the cardLayer
        cardLayer.add(card);
        cards.push(card);
        fillZonesByColor()
    }
    imageObj.src = cardData.img;
}

/**
 * Finds the smallest (either thinnest or shortest after scaling) zone in order to scale the cards. Returns a base scaling factor
 * @returns {Number}
 */
function getSmallestZone(cropPercentage) {
    let shortest = cardZoneRects[0].rect.height;
    let thinnest = cardZoneRects[0].rect.width;
    for (let zone of cardZoneRects) {
        if (zone.rect.height < shortest) {
            shortest = zone.rect.height;
        }
        if (zone.rect.width < thinnest) {
            thinnest = zone.rect.width;
        }
    }
    return (shortest / (3.5 * cropPercentage) > thinnest / 2.5) ? thinnest / 2.5 : shortest / (3.5 * cropPercentage);
}

/**
 * Takes in a card as the "control" and an array of cards. Puts all cards into the zone where the control card is within.
 * @param {Object<card>} baseCard 
 * @param {[]Object<card>} cards 
 */
function dropCards(baseCard, cards) {
    let targetZone;
    for (let zone of cardZoneRects) {
        if (inRect(zone.rect, baseCard)) {
            targetZone = zone;
        }
    }
    if (targetZone != undefined) {
        for (let card of cards) {
            targetZone.cards.push(card);
        }
    }
    relayerCardZones();
}

/**
 * Takes an array of cards and removes them from their zones.
 * @param {[]Object<card>} cards 
 */
function pickupCards(cards) {
    for (let card of cards) {
        for (let zone of cardZoneRects) {
            if (zone.cards.includes(card)) {
                zone.cards.splice(zone.cards.indexOf(card), 1);
            }
        }
    }
    relayerCardZones();
}


/**
 * Goes through each card zone and layers the cards nicely using yOffset and changing the ZIndex to be in order top to bottom
 */
function relayerCardZones() {
    for (let zone of cardZoneRects) {
        zone.cards.forEach((a, i) => { a.x(zone.rect.x + a.width() / 2); a.y(zone.rect.y - stageTop() + a.height() / 2 + i * yOffset()); a.setZIndex(i) });
    }
    updateNumCardsInDeck();
}

/**
 * Checks if a card is in a rectangle.
 * @param {Object<rect>} rect 
 * @param {Object<card>} card 
 * @returns {Boolean}
 */
function inRect(rect, card) {
    return (card.x() > rect.left && card.x() < rect.right && card.y() > rect.top - stageTop() && card.y() < rect.bottom - stageTop());
}



/**
 * 
 * 
 * Context menu functions
 * 
 * 
 */
let currentShape;
let menuNode = document.getElementById('menu');
document.getElementById('tap-button').addEventListener('click', () => {
    if (selectArr.includes(currentShape)) {
        for (let card of selectArr) {
            if (card.rotation() == 90) {
                card.rotation(0);
            }
            else {
                card.rotation(90);
            }
        }
    }
    else {
        if (currentShape.rotation() == 90) {
            currentShape.rotation(0);
        }
        else {
            currentShape.rotation(90);
        }
    }
});

function fillZonesByColor(){
    let zoneColorDistr = ['W', 'U', 'B', 'R', 'G'];
    pickupCards(cards);
    let deckBoard = cardZoneRects.filter((x) => { if (x.parent_id === 'deck') return x; });
    for (let i = 0; i < deckBoard.length; ++i) {
        let zone = deckBoard[i];
        for(const card of cards){
            if(card.getAttr('data').color.length === 1 && card.getAttr('data').color[0] === zoneColorDistr[i]){
                zone.cards.push(card);
            }
            else if(i === deckBoard.length - 1 && card.getAttr('data').color.length > 1){
                zone.cards.push(card);
            }
        }
    }
    let sideBoard = cardZoneRects.find((x) => { if (x.parent_id === 'side-board') return x; });
    for(const card of cards){
        if(card.getAttr('data').color.length === 0){
            sideBoard.cards.push(card);
        }
    }
    relayerCardZones();
}

document.getElementById('fill-button').addEventListener('click', () => {
    fillZonesByColor();
});

document.getElementById('side-board-button').addEventListener('click', () => {
    let side_board = cardZoneRects.find((x) => { if (x.parent_id === 'side-board') return x; });
    pickupCards(cards);
    for (let i = 0; i < cards.length; ++i) {
        side_board.cards.push(cards[i]);
        relayerCardZones();
    }
});

document.getElementById('sort-zone').addEventListener('click', () => {
    let deckBoard = cardZoneRects.filter((x) => { if (x.parent_id === 'deck') return x; });
    let deckCards = [];
    for(let i = 0; i < deckBoard.length; ++i){
        let zone = deckBoard[i];
        deckCards = deckCards.concat(zone.cards);
    }
    pickupCards(deckCards);
    for(const card of deckCards){
        if(Math.floor(card.getAttr('data').CMC) < deckBoard.length){
            deckBoard[Math.floor(card.getAttr('data').CMC)].cards.push(card);
        }
        else{
            deckBoard[deckBoard.length-1].cards.push(card);
        }
    }
    relayerCardZones();
});

window.addEventListener('click', () => {
    // hide menu
    menuNode.style.display = 'none';
});

stage.on('contextmenu', function (e) {
    // prevent default behavior
    e.evt.preventDefault();
    if (e.target === stage) {
        // if we are on empty place of the stage we will do nothing
        return;
    }
    currentShape = e.target;
    // show menu
    menuNode.style.display = 'initial';
    let containerRect = stage.container().getBoundingClientRect();
    menuNode.style.top =
        containerRect.top + stage.getPointerPosition().y + 4 + 'px';
    menuNode.style.left =
        containerRect.left + stage.getPointerPosition().x + 4 + 'px';
});


const delta = 6;
let startX;
let startY;
let mouseDown = false;

//This rectangle is used to select cards
let selectRect = new Konva.Rect({
    visible: false,
    opacity: .3,
    fill: 'blue',
});
topLayer.add(selectRect);

stage.on('mousedown', function (event) {
    //Checks if it is a left-click
    if (event.evt.button === 0) {
        let mousePos = stage.getPointerPosition();
        startX = mousePos.x;
        startY = mousePos.y;
        //If the click is not on a object or the shift key is down, start dragging and clear selected cards
        if (event.target === stage || keyDownObject['Shift']) {
            mouseDown = true;
            clearSelected();
        }
    }
});

stage.on('mousemove', function (event) {
    if (mouseDown) {
        //Show the selection rectangle and update it's position
        let mousePos = stage.getPointerPosition();
        selectRect.x(startX);
        selectRect.y(startY);
        selectRect.width(mousePos.x - selectRect.x());
        selectRect.height(mousePos.y - selectRect.y());
        selectRect.visible(true);
    }
});

stage.on('mouseup', function (event) {
    if (event.evt.button === 0) {
        let mousePos = stage.getPointerPosition();
        const diffX = Math.abs(mousePos.x - startX);
        const diffY = Math.abs(mousePos.y - startY);

        //If the difference is very small, it is probably just a click
        if (diffX < delta && diffY < delta) {
            clearSelected();
        }
        else if (mouseDown) {
            //Add the cards inside the rectangle to the selected cards array
            for (let zone of cardZoneRects) {
                for (let card of zone.cards) {
                    if (hitCheck(selectRect, card)) {
                        addSelection([card]);
                    }
                }
            }
        }
        //Hide selection rectangle
        selectRect.visible(false);
        mouseDown = false;
    }
});

stage.on('wheel', function(e){
    e.evt.preventDefault();
    let pointer = stage.getPointerPosition();
    let directionUp = e.evt.deltaY > 0 ? true : false;
    for(const zone of cardZoneRects){
        if(pointer.x > zone.rect.x && pointer.x < zone.rect.x + zone.rect.width && pointer.y > zone.rect.y && pointer.y < zone.rect.y + zone.rect.height){
            if(directionUp){
                let lastCard = zone.cards.pop();
                zone.cards.unshift(lastCard);
            }
            else{
                let lastCard = zone.cards.shift();
                zone.cards.push(lastCard);
            }
            relayerCardZones();
        }
    }
});


//Checks if a card is in a shapes bounding rect
function hitCheck(shape1, card) {

    let s1 = shape1.getClientRect(); // use this to get bounding rect for shapes other than rectangles.
    let s2 = card.getClientRect();

    // corners of shape 1
    let X = s1.x;
    let Y = s1.y
    let A = s1.x + s1.width;
    let B = s1.y + s1.height;

    // corners of shape 2
    let X1 = s2.x;
    let A1 = s2.x + s2.width;
    let Y1 = s2.y;
    let B1 = s2.y + yOffset(); //This checks if the rect covers the space near the top of the card specifically
    // Simple overlapping rect collision test
    if (A < X1 || A1 < X || B < Y1 || B1 < Y) {
        return false
    }
    else {
        return true;
    }
}

//Clears the selected cards of the highlight and clears the array
function clearSelected() {
    for (let card of selectArr) {
        card.strokeWidth(0);
    }
    selectArr = [];
}

//Add the cards to the selected cards array and sets the strokewidth to highlight the cards
function addSelection(cardArr) {
    for (let card of cardArr) {
        card.strokeWidth(4);
        selectArr.push(card);
    }
}

//For now adds a card for each sub-card-zone
async function initCards() {
    for (let zone of cardZoneRects) {
        let response = await fetch("https://api.scryfall.com/cards/random?-is:double-faced+version=png");
        if (response.ok) {
            let responseJSON = await response.json();
            let img;
            addCard(responseJSON.image_uris.png, 10 / 16);
        }
    }
}

async function initCards2() {
    for (let zone of cardZoneRects) {
        let response = await fetch("https://api.scryfall.com/cards/random?-is:double-faced+version=png");
        if (response.ok) {
            let responseJSON = await response.json();
            let img;
            addCard(responseJSON.image_uris.png, 1);
            showPopup = false;
        }
    }
}

const ls = window.localStorage;

function initDeckFromLS() {
    let userDeck = [];
    if (JSON.parse(ls.getItem('deck') === null)) {
        userDeck = [];
    }
    else {
        userDeck = JSON.parse(ls.getItem('deck'));
    }
    for (const card of userDeck) {
        addCard(card, 1);
    }
    showPopup = false;
}


const whiteLands = document.getElementById('white-lands');
const blueLands = document.getElementById('blue-lands');
const blackLands = document.getElementById('black-lands');
const redLands = document.getElementById('red-lands');
const greenLands = document.getElementById('green-lands');
const lands = [whiteLands, blueLands, blackLands, redLands, greenLands];

lands.forEach((a) => a.addEventListener('input', function(e){
    updateNumCardsInDeck();
}))

function getNumLands() {
    let sum = 0;
    for(const land of lands){
        if(parseInt(land.value) > 0){
            sum += parseInt(land.value);
        }
    }
    return sum;
}

function getLands() {
}

function updateNumCardsInDeck(){
    if (getCardsByParentZone("deck") !== undefined) {
        let countCards = getCardsByParentZone("deck").length + getNumLands();
        numCardsInDeck.innerHTML = `Total Cards In Deck: ${countCards}`;
    }
}

window.onload = () => initDeckFromLS();

function getCardsByParentZone(zoneName) {
    return cardZoneRects.filter((x) => { if (x.parent_id === zoneName) return x; }).reduce((x, a) => { return x.concat(a.cards) }, []);
}

document.getElementById('finished-building').addEventListener('click', function(event){
    ls.setItem('deckObj', JSON.stringify({deck:getCardsByParentZone('deck').map(a => a.getAttr('data')), sideBoard: getCardsByParentZone('side-board').map(a => a.getAttr('data')), commandZone: getCardsByParentZone('specialty-board').map(a => a.getAttr('data'))}));
    console.log(ls.getItem('deckObj'));
});









