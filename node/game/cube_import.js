exports.load_cube = function(cubeData) {

    if(true){
        //Return ok: true if the cube is valid. Return data if necessary

        let strArray = cubeData.split("\n");
        let num = 0;
        let cardName = '';
        let cardArray = [];
        let errorString = "";
        for(elem in strArray){
            num = elem.slice(0, elem.indexOf(' ')-1);
            num = parseInt(num, 10);
            if(num == NaN){
                errorString = "String" + elem + "is not an acceptable input.";
                break;
            }
            cardName = elem.slice(elem.indexOf(' ')+1, elem.length - 1);
            cardArray.push({num, cardName});
        }
        if(errorString != ""){
            return { ok: false, error: errorString }
        }

        return { ok: true, cardArray: cardArray }
    } else {
        //Return ok: false if the cube is not valid (Too few cards)
        return { ok: false }
    }
}