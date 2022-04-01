exports.load_cube = function(cubeData) {

    //Return ok: true if the cube is valid. Return data if necessary
    if(cubeData === ""){
        return { ok: false, error: "String is empty" }
    }
    let strArray = cubeData.split(/\r?\n/);
    let num = 0;
    let cardName = '';
    let cardArray = [];
    for(elem in strArray){
        num = elem.slice(0, elem.indexOf(' ')-1);
        num = parseInt(num, 10);
        if(num == NaN){
            return { ok: false, error: "String " + elem + " is not an acceptable input." }
        }
        cardName = elem.slice(elem.indexOf(' ')+1, elem.length - 1);
        cardArray.push({num, cardName});
    }

    return { ok: true, cardArray: cardArray }

}