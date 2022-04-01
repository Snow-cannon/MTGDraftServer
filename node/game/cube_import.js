exports.load_cube = function(cubeData) {

    //Return ok: true if the cube is valid. Return data if necessary
    if(cubeData === ""){
        return { ok: false, error: "String is empty" }
    }
    let strArray = cubeData.split(/\r?\n/);
    let num = 0;
    let cardName = '';
    let cardArray = [];
    for(elem of strArray){
        num = elem.slice(0, elem.indexOf(' '));
        num = parseInt(num, 10);
        if(isNaN(num)){
            return { ok: false, error: "String " + elem + " is not an acceptable input." }
        }
        cardName = elem.slice(elem.indexOf(' ')+1, elem.length);
        for(let i = 0; i < num; ++i){
            cardArray.push(cardName);
        }
    }

    return { ok: true, cardArray: cardArray }

}