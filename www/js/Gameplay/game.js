import * as library from "./library.js"
import * as serverInterface from "./gameServerInterface.js"

const mtgCardBack = './imgs/MTGCardBack.jpg';

const numCardsInDeck = document.getElementById('card-count');
let resizeClosure = new library.observer();

let width = window.innerWidth;
let height = window.innerHeight;
let userDeck = [];
let commandZone = [];

let stage = new Konva.Stage({
    container: 'container',
    width: width,
    height: height,
});
stage.container().style.position = 'absolute';
stage.container().style.top = '0';
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
let bottomLayer = new Konva.Layer();
stage.add(bottomLayer);
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
let resizeWindow = () => {
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
resizeClosure.subscribe(resizeWindow);

//These event listeners deal keep track of the currently pressed keys for use in other functions
let keyDownObject = {};
document.addEventListener('keydown', (event) => {
    let name = event.key;
    let code = event.code;
    // Alert the key name and key code on keydown
    keyDownObject[name] = true;
    if (name === "p") {
        console.log(exportState());
    }
}, false);
document.addEventListener('keyup', (event) => {
    let name = event.key;
    let code = event.code;
    // Alert the key name and key code on keydown
    keyDownObject[name] = false;
}, false);

let id = 0;
/**
 * Creats a card from an image url and adds it to layer.
 * @param {String} url 
 */
function addCard(cardData, cropPercentage, zone, rotation=0, flipBool=false, transformBool=false, counters=[]) {
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
            id: id++,
            rotation: rotation,
            transformBool: false,
            flipBool: false,
            counters: [],
        });
        console.log(card.getAttr('counters'));
        //Crop the image to to the desired height
        card.crop({
            x: 0,
            y: 0,
            width: imageObj.width,
            height: imageObj.height * cropPercentage,
        });
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

        card.resize = () => {
            let scale = getSmallestZone(cropPercentage);
            card.offsetX(scale * 2.5 / 2);
            card.offsetY(scale * 3.5 / 2 * cropPercentage);
            card.width(scale * 2.5);
            card.height(scale * 3.5 * cropPercentage);
            popup.offsetX(scale * 2.5 / 2);
            popup.offsetY(scale * 3.5 / 2 * cropPercentage);
            popup.height(scale * 7);
            popup.width(scale * 5);
        }


        //When you mouse over the card, show the popup inside the window
        card.on('mouseenter', (e) => {
            if (!showPopup) { return }
            if (card.x() - card.offsetX() + card.width() + popup.width() > window.innerWidth) {
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
                    relayerCounters(c1);
                    //Set the z-index in selection order(same as old zone)
                    c1.zIndex(cards.length - selectArr.length + i);
                }
            }
            relayerCounters(card);
            relayerCardZones();
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
            relayerCardZones();
            clearSelected();
            exportState();
            stage.batchDraw();
        });
        card.on('contextmenu', function (e) {
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
            let menuRect = menuNode.getBoundingClientRect();
            if (stage.getPointerPosition().x + menuRect.width > containerRect.right) {
                menuNode.style.left =
                    containerRect.left + stage.getPointerPosition().x - menuRect.width + 4 + 'px';
            }
            else {
                menuNode.style.left =
                    containerRect.left + stage.getPointerPosition().x + 4 + 'px';
            }
            if (stage.getPointerPosition().y + menuRect.height > containerRect.bottom) {
                menuNode.style.top =
                    containerRect.top + stage.getPointerPosition().y - menuRect.height + 4 + 'px';
            }
            else {
                menuNode.style.top =
                    containerRect.top + stage.getPointerPosition().y + 4 + 'px';
            }
        });

        card.on('wheel', function (e) {
            e.evt.preventDefault();
            let pointer = stage.getPointerPosition();
            let directionUp = e.evt.deltaY > 0 ? true : false;
            for (const zone of cardZoneRects) {
                if (pointer.x > zone.rect.x && pointer.x < zone.rect.x + zone.rect.width && pointer.y > zone.rect.y - stageTop() && pointer.y < zone.rect.y + zone.rect.height - stageTop()) {
                    if (directionUp) {
                        let lastCard = zone.cards.pop();
                        zone.cards.unshift(lastCard);
                    }
                    else {
                        let lastCard = zone.cards.shift();
                        zone.cards.push(lastCard);
                    }
                    relayerCardZones();
                }
            }
        });

        card.transform = () => {
            if (card.getAttr('data').back !== "" && card.image().src != card.getAttr('data').back) {
                let imageObj2 = new Image();
                imageObj2.onload = function () {
                    card.image(imageObj2);
                    popup.image(imageObj2);
                };
                imageObj2.src = card.getAttr('data').back;
                card.setAttr('transformBool', true);
            }
            else {
                let imageObj2 = new Image();
                imageObj2.onload = function () {
                    card.image(imageObj2);
                    popup.image(imageObj2);
                };
                imageObj2.src = card.getAttr('data').img;
                card.setAttr('transformBool', false);
            }
        }

        card.flip = () => {
            if (!(new RegExp('./MTGCardBack.jpg$').test(card.image().src))) {
                let imageObj2 = new Image();
                imageObj2.onload = function () {
                    card.image(imageObj2);
                    popup.image(imageObj2);
                };
                imageObj2.src = mtgCardBack;
                card.setAttr('flipBool', true);
            }
            else {
                let imageObj2 = new Image();
                imageObj2.onload = function () {
                    card.image(imageObj2);
                    popup.image(imageObj2);
                };
                imageObj2.src = card.getAttr('data').img;
                card.setAttr('flipBool', false);
            }
            
        }

        card.add = (counter) => {
            console.log(card.getAttr('counters'));
            card.getAttr('counters').push(counter);
            relayerCounters(card);

        }
        card.remove = (counter) => {
            card.getAttr('counters').splice(card.getAttr('counters').indexOf(counter), 1);
            relayerCounters(card);
        }
        counters.forEach((x) => {console.log(JSON.parse(x)); addCounter(card, JSON.parse(x)['children'][1]['attrs']['text'])});
        // add the shape to the cardLayer
        zone.cards.push(card);
        cardLayer.add(card);
        cards.push(card);
        relayerCardZones();
    }
    if(transformBool && card.getAttr('data').back !== ""){
        imageObj.src = cardData['back'];
    }
    if(flipBool){
        imageObj.src = mtgCardBack;
    }
    else{
        imageObj.src = cardData['img'];
    }
    
}

function relayerCounters(card) {
    let heightSum = 0;
    for (let i = 0; i < card.getAttr('counters').length; ++i) {
        let currCounter = card.getAttr('counters')[i];
        currCounter.x(card.x() - card.offsetX());
        currCounter.y(card.y() - card.offsetY() + heightSum + yOffset());
        heightSum += currCounter.height();
        currCounter.setZIndex(Math.min(card.getZIndex() + 1, cardLayer.getChildren().length - 1));
    }
}

function removeAllCounters(card) {
    let length = card.getAttr('counters').length
    for (let i = 0; i < length; ++i) {
        let currCounter = card.getAttr('counters').pop();
        currCounter.destroy();

    }
}

function addCounter(card, value=1) {
    let label = new Konva.Label({
        x: (card.x() - card.offsetX()),
        y: (card.y() - card.offsetY() + yOffset()),
        draggable: false
    });

    // add a tag to the label
    label.add(new Konva.Tag({
        fill: '#bbb',
        stroke: '#333',
        shadowColor: 'black',
        shadowBlur: 10,
        shadowOffset: [10, 10],
        shadowOpacity: 0.2,
        lineJoin: 'round',
        cornerRadius: 5,
        index: 0,
    }));

    // add text to the label
    label.add(new Konva.Text({
        text: value,
        fontSize: 20,
        lineHeight: 1.2,
        padding: 4,
        fill: 'green',
    }));

    label.on('wheel', function (e) {
        e.evt.preventDefault();
        let pointer = stage.getPointerPosition();
        let direction = e.evt.deltaY > 0 ? -1 : 1;
        label.children[1].text(parseInt(label.children[1].text()) + direction);
        exportState();
    });
    label.on('contextmenu', function (e) {
        // prevent default behavior
        e.evt.preventDefault();
        if (e.target === stage) {
            // if we are on empty place of the stage we will do nothing
            return;
        }

        currentShape = label;
        // show menu
        counterMenu.style.display = 'initial';
        let containerRect = stage.container().getBoundingClientRect();
        let menuRect = counterMenu.getBoundingClientRect();
        if (stage.getPointerPosition().x + menuRect.width > containerRect.right) {
            counterMenu.style.left =
                containerRect.left + stage.getPointerPosition().x - menuRect.width + 4 + 'px';
        }
        else {
            counterMenu.style.left =
                containerRect.left + stage.getPointerPosition().x + 4 + 'px';
        }
        if (stage.getPointerPosition().y + menuRect.height > containerRect.bottom) {
            counterMenu.style.top =
                containerRect.top + stage.getPointerPosition().y - menuRect.height + 4 + 'px';
        }
        else {
            counterMenu.style.top =
                containerRect.top + stage.getPointerPosition().y + 4 + 'px';
        }

    });
    label.setIndex = () => {

    }
    label.removeAndDestroy = () => {
        card.remove(label);
        label.destroy();
    }
    cardLayer.add(label);
    card.add(label);

}
document.getElementById('remove-counter').addEventListener('click', () => {
    currentShape.removeAndDestroy();
});

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
        let zindex = 0;
        zone.cards.forEach((a, i) => {
            a.x(zone.rect.x + a.width() / 2);
            a.y(zone.rect.y - stageTop() + a.height() / 2 + i * yOffset());
            a.setZIndex(zindex);
            relayerCounters(a);
            if (a.getAttr('counters').length > 0) {
                zindex += a.getAttr('counters').length + 1;
            }
            else {
                zindex++;
            }

        });
    }
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
let libraryMenuNode = document.getElementById('library-menu');
let counterMenu = document.getElementById('counter-menu');
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
    exportState();
});

document.getElementById('add-counter').addEventListener('click', () => {
    addCounter(currentShape);
    exportState();
});


window.addEventListener('click', () => {
    // hide menu
    counterMenu.style.display = 'none';
    menuNode.style.display = 'none';
    libraryMenuNode.style.display = 'none';

});

document.getElementById('transform-card').addEventListener('click', () => {
    if (selectArr.includes(currentShape)) {
        for (let card of selectArr) {
            card.transform();
        }
    }
    else {
        currentShape.transform();
    }
    exportState();
});

document.getElementById('shuffle-library').addEventListener('click', () => {
    libraryClass.shuffleDeck();
});

document.getElementById('flip-card').addEventListener('click', () => {
    if (selectArr.includes(currentShape)) {
        for (let card of selectArr) {
            card.flip();
        }
    }
    else {
        currentShape.flip();
    }
    exportState();
});

function removeCard(card) {
    pickupCards([card]);
    removeAllCounters(card);
    cards.splice(cards.indexOf(card), 1);
    card.image(null);
    card.x(-400);
    card.destroy();
}

document.getElementById('library-top').addEventListener('click', () => {
    if (selectArr.includes(currentShape)) {
        pickupCards(selectArr);
        for (let card of selectArr) {
            removeAllCounters(card);
            if (card.getAttr('data').name !== undefined) {
                libraryClass.putOnTop(card.getAttr('data'));
            }
            cards.splice(cards.indexOf(card), 1);
            card.image(null);
            card.x(-400);
            card.destroy();
        }
        selectArr = [];
    }
    else {
        removeAllCounters(currentShape);
        pickupCards([currentShape]);
        if (currentShape.getAttr('data').name !== undefined) {
            libraryClass.putOnTop(currentShape.getAttr('data'));
        }
        cards.splice(cards.indexOf(currentShape), 1);
        selectArr.splice(selectArr.indexOf(currentShape), 1);
        currentShape.image(null);
        currentShape.x(-400);
        currentShape.destroy();
    }
    relayerCardZones();
    exportState();
    cardLayer.draw();
});
document.getElementById('library-bottom').addEventListener('click', () => {
    if (selectArr.includes(currentShape)) {
        pickupCards(selectArr);
        for (let card of selectArr) {
            removeAllCounters(card);
            if (card.getAttr('data').name !== undefined) {
                libraryClass.putOnBottom(card.getAttr('data'));
            }
            cards.splice(cards.indexOf(card), 1);
            card.image(null);
            card.x(-400);
            card.destroy();
        }
        selectArr = [];
    }
    else {
        removeAllCounters(currentShape);
        pickupCards([currentShape]);
        if (currentShape.getAttr('data').name !== undefined) {
            libraryClass.putOnBottom(currentShape.getAttr('data'));
        }
        cards.splice(cards.indexOf(currentShape), 1);
        selectArr.splice(selectArr.indexOf(currentShape), 1);
        currentShape.image(null);
        currentShape.x(-400);
        currentShape.destroy();
    }
    relayerCardZones();
    cardLayer.draw();
    exportState();
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
            for (let card of cards) {
                if (hitCheck(selectRect, card)) {
                    addSelection([card]);
                }
            }
        }
        //Hide selection rectangle
        selectRect.visible(false);
        mouseDown = false;
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

export function getCardsByParentZone(zoneName) {
    return cardZoneRects.filter((x) => { if (x.parent_id === zoneName) return x; }).reduce((x, a) => { return x.concat(a.cards) }, []);
}

let libraryClass;
window.onload = () => {
    libraryClass = new library.library()
    libraryClass.shuffleDeck();
    initGame();
}



function initGame() {
    let imageObj = new Image();
    let libDiv = cardZoneRects.find((x) => { if (x.parent_id === 'library') return x; }).rect;
    let scale = (libDiv.height / 3.5 > libDiv.width / 2.5) ? libDiv.width / 2.5 : libDiv.height / 3.5;

    imageObj.onload = function () {
        let libraryImg = new Konva.Image({
            x: libDiv.x,
            y: libDiv.y,
            image: imageObj,
            width: scale * 2.5,
            height: scale * 3.5,
            draggable: false,
            stroke: '#00FFFF',
            strokeWidth: 0,
        });
        libraryImg.x(libDiv.x + (libDiv.width - libraryImg.width()) / 2)
        libraryImg.y(libDiv.y + (libDiv.height - libraryImg.height()) / 2)
        libraryImg.on('contextmenu', function (e) {
            e.evt.preventDefault();
            currentShape = e.target;
            libraryMenuNode.style.display = 'initial';
            let containerRect = stage.container().getBoundingClientRect();
            libraryMenuNode.style.top =
                containerRect.top + stage.getPointerPosition().y + 4 + 'px';
            libraryMenuNode.style.left =
                containerRect.left + stage.getPointerPosition().x + 4 + 'px';
        });
        let libraryResize = () => {
            libDiv = cardZoneRects.find((x) => { if (x.parent_id === 'library') return x; }).rect;
            let scale = (libDiv.height / 3.5 > libDiv.width / 2.5) ? libDiv.width / 2.5 : libDiv.height / 3.5;
            libraryImg.width(scale * 2.5);
            libraryImg.height(scale * 3.5);
            libraryImg.x(libDiv.x + (libDiv.width - libraryImg.width()) / 2);
            libraryImg.y(libDiv.y + (libDiv.height - libraryImg.height()) / 2);
            libraryImg.setZIndex(0);
        }

        resizeClosure.subscribe(libraryResize);
        bottomLayer.add(libraryImg);
        libraryImg.setZIndex(0);
    }
    imageObj.src = mtgCardBack;
}

document.getElementById('draw-button').addEventListener('click', function (e) {
    let deckBoard = cardZoneRects.filter((x) => { if (x.parent_id === 'hand') return x; });
    let emptyHand = deckBoard.find((x) => (x.cards.length === 0));
    let zone = (emptyHand !== undefined) ? emptyHand : deckBoard[deckBoard.length - 1];
    addCard(libraryClass.drawCard(), 10 / 16, zone);
});

document.getElementById('token-button').addEventListener('click', function (e) {
    let deckBoard = cardZoneRects.filter((x) => { if (x.parent_id === 'hand') return x; });
    let emptyHand = deckBoard.find((x) => (x.cards.length === 0));
    let zone = (emptyHand !== undefined) ? emptyHand : deckBoard[deckBoard.length - 1];
    addCard({ img: mtgCardBack }, 10 / 16, zone);
});

document.getElementById('look-button').addEventListener('click', function (e) {
    let deckBoard = cardZoneRects.filter((x) => { if (x.parent_id === 'library') return x; });
    let emptyHand = deckBoard.find((x) => (x.cards.length === 0));
    let zone = (emptyHand !== undefined) ? emptyHand : deckBoard[deckBoard.length - 1];
    let deckArr = libraryClass.drawN(libraryClass.getLibrarySize());
    for (const card of deckArr) {
        addCard(card, 10 / 16, zone);
    }
});

document.getElementById('load-state').addEventListener('click', function (e) {
    loadState(serverInterface.getState());
});

async function exportState() {
    let board = cardZoneRects.filter((x) => { if (x.parent_id === 'play-area') return x; });
    let processedBoard = [];
    for(const zone of board){
        processedBoard.push({cards: zone.cards.map((a) => {let b = a.clone(); b.setAttr('counters', JSON.stringify(b.getAttr('counters'))); return b;})});
    }
    let discBoard = cardZoneRects.filter((x) => { if (x.parent_id === 'discard') return x; });
    let processedDiscBoard = [];
    for(const zone of discBoard){
        processedDiscBoard.push({cards: zone.cards.map((a) => {let b = a.clone(); b.setAttr('counters', JSON.stringify(b.getAttr('counters'))); return b;})});
    }
    let stack = cardZoneRects.filter((x) => { if (x.parent_id === 'stack') return x; });
    let processedStackBoard = [];
    for(const zone of stack){
        processedStackBoard.push({cards: zone.cards.map((a) => {let b = a.clone(); b.setAttr('counters', JSON.stringify(b.getAttr('counters'))); return b;})});
    }
    let oppDisc = cardZoneRects.filter((x) => { if (x.parent_id === 'opp-discard') return x; });
    let processedOppDiscBoard = [];
    for(const zone of oppDisc){
        processedOppDiscBoard.push({cards: zone.cards.map((a) => {let b = a.clone(); b.setAttr('counters', JSON.stringify(b.getAttr('counters'))); return b;})});
    }
    let exportObj = { board: processedBoard, discard: processedDiscBoard, stack: processedStackBoard, oppDisc: processedOppDiscBoard };
    await serverInterface.postState(JSON.stringify(exportObj));
    console.log("exported");
}

function reloadZone(board, stateboard){
    for (let j = 0; j < board.length; ++j) {
        let zone = board[j];
        for (let i = 0; i < zone.cards.length; ++i) {
            let card = zone.cards[i];
            removeCard(card);
        }
        for (let i = 0; i < stateboard[stateboard.length - j -1].cards.length; ++i) {
            let card = JSON.parse(stateboard[stateboard.length - j -1].cards[i]);
            console.log(card);
            addCard(card['attrs']['data'], 10 / 16, zone, card['attrs']['rotation'], card['attrs']['flipBool'], card['attrs']['transformBool'], JSON.parse(card['attrs']['counters']));

        }
    }
    relayerCardZones();
}

export function importState(stateString) {
    let state = JSON.parse(stateString);
    let board = cardZoneRects.filter((x) => { if (x.parent_id === 'play-area') return x; })
    reloadZone(board, state.board);
    let discBoard = cardZoneRects.filter((x) => { if (x.parent_id === 'discard') return x; });
    reloadZone(discBoard, state.oppDisc);
    let stack = cardZoneRects.filter((x) => { if (x.parent_id === 'stack') return x; });
    reloadZone(stack, state.stack);
    let oppDisc = cardZoneRects.filter((x) => { if (x.parent_id === 'opp-discard') return x; });
    reloadZone(oppDisc, state.discard);
}



window.onresize = () => resizeClosure.update();