"use strict";

const fetch = require("node-fetch-commonjs");

/**
 * Creates n draft packs
 * @param {Integer} n Number of packs to be created
 * @returns {[][]Object<name, img, back, color>}
 */
exports.createPacks = async function (n) {
    let packArr = [];
    for (let i = 0; i < n; ++i) {
        packArr.push(await getPack());
    }
    return packArr;
}

/**
 * Gets a card from the Scryfall api based on the give uri
 * @param {String} uri 
 * @returns {Object<name, img, back, color>}
 */
async function getCard(uri) {
    const response = await fetch(uri);
    if (response.ok) {
        const responseJSON = await response.json();
        // console.log(responseJSON);
        let cardName = responseJSON.name;
        let img_url = "";
        let card_back = "";
        let color_identity = responseJSON.color_identity;
        if (responseJSON.image_status === "missing") {
            return await getCard(uri);
        }
        if (responseJSON.card_faces !== undefined) {
            if (responseJSON.card_faces[0].image_uris === undefined || responseJSON.card_faces[1].image_uris === undefined) {
                return await getCard(uri);
            }
            img_url = responseJSON.card_faces[0].image_uris.png;
            card_back = responseJSON.card_faces[1].image_uris.png;
        }
        else {
            if (responseJSON.image_uris === undefined) {
                return await getCard(uri);
            }
            img_url = responseJSON.image_uris.png;
        }
        return { name: cardName, img: img_url, back: card_back, color: color_identity };
    }
}


function colorCheck(colorConsistency, colorIdentity){
    if (colorIdentity.length > 1){
        colorConsistency.M++;
    }
    else if (colorIdentity.length == 1) {
        colorConsistency[colorIdentity[0]]++;
    }
    return colorConsistency;
}

async function getPack() {
    let pack = [];
    let colorConsistency = { W: 0, U: 0, B: 0, R: 0, G: 0, M: 0 };
    let curElem = 0;
    //land
    pack.push(await getCard("https://api.scryfall.com/cards/random?q=usd>%3D10+t%3Aland+lang%3Aen"));
    colorConsistency = colorCheck(colorConsistency, pack[curElem].color);
    curElem++;
    //Foil Analog
    pack.push(await getCard("https://api.scryfall.com/cards/random?q=%28block%3Ahtr+or+set%3Acmb2+or+%28set%3Apcel+%28t%3Acreature+or+t%3Asummon%29%29+or+%28border%3Asilver+and+usd>%3D7%29%29+-is%3Atoken+-t%3Aland+lang%3Aen"));
    colorConsistency = colorCheck(colorConsistency, pack[curElem].color);
    curElem++;
    //Rare Analog
    pack.push(await getCard("https://api.scryfall.com/cards/random?q=%28usd>%3D100+-is%3Atoken+-t%3Aland%29+lang%3Aen"));
    colorConsistency = colorCheck(colorConsistency, pack[curElem].color);
    curElem++;
    //Uncommon Analog
    for (let i = 0; i < 3; ++i) {
        pack.push(await getCard("https://api.scryfall.com/cards/random?q=%28usd<%3D100+usd>%3D10+-is%3Atoken+-t%3Aland%29+lang%3Aen"));
        colorConsistency = colorCheck(colorConsistency, pack[curElem].color);
        curElem++;
    }
    //Common Analog
    let apiCall = "https://api.scryfall.com/cards/random?q=usd<%3D10+%28rarity%3Arare+or+rarity%3Amythic%29%28-is%3Atoken+-t%3Aland+-is%3Adigital+-set%3Apcel+-block%3Ahtr+-set%3Acmb2+-set%3Acmb1%29-%28type%3Aplane+or+type%3Ascheme%29+lang%3Aen";

    for (let i = 0; i < 10; ++i) {
        let curApiCall = apiCall;
        for (const key in colorConsistency) {

            if (colorConsistency[key] >= 3) {
                curApiCall = curApiCall + "+-c%3A" + key;
            }
        }
        pack.push(await getCard(curApiCall));
        colorConsistency = colorCheck(colorConsistency, pack[curElem].color);
        curElem++;
    }

    return pack;
}