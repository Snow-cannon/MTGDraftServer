"use strict";

//default values
var colors = {
    mainFunc: 120,
    secondaryFunc: 156,
    reason: 122,
    values: 116, 
    lists: 158,
    statement: 119,
    punctuation: 154,
    string: 229,
    number: 226,
    undefined: 141,
    boolean: 80,
    object: 136,
    function: 209,
    error: 202,
}

var max_depth = 4;
var max_height = 150;

exports.set_max_height = function (height) {
    max_height = height;
}

exports.set_max_depth = function (depth) {
    max_depth = depth;
}

/**
 * Values: mainFunc, secondaryFunc, reason, values, lists, statement, 
 * string, number,undefined, boolean, object, function. Find color scheme here: 
 * https://www.tweaking4all.com/software/linux-software/xterm-color-cheat-sheet/
 * @param {Object} data 
 */
exports.set_logger_theme = function (data) {
    for (const key in data) {
        colors[key] = data[key];
    }
}

//Does a formatted log
exports.log = function (funcName, reason, ...values) {

    let error = false;

    //Lof the name of the function it came from and the given reason
    if (values.length === 0) {
        console.log(color_string('[', colors.punctuation) + color_string(funcName.toUpperCase(), colors.mainFunc) + color_string(']: ', colors.punctuation) + color_string(reason, colors.reason));
    } else {
        //Log provided values that go with it
        console.log(color_string('[', colors.punctuation) + color_string(funcName.toUpperCase(), colors.mainFunc) + color_string(']: ', colors.punctuation) + color_string(reason, colors.reason) + color_string(':', colors.punctuation));

        let strLen = 0;
        values.map(v => { Object.keys(v).map(s => { if (s.length > strLen) { strLen = s.length; } }) });
        strLen += 2;
        // strLen = Math.min(strLen, 10);

        //Print out all the values passed in
        let size = { height: 0, depth: 0 };
        values.map(v => {
            Object.keys(v).map(k => {
                stringify_value(v[k], color_string(k.padStart(strLen), colors.values) + color_string('] ', colors.punctuation), size, 0, color_string('|'.padStart(strLen), colors.punctuation));
            });
        });

        //Print a new line
        console.log('');
    }
}
/**
 * 
 * @param {String} funcName 
 * @param {String} innerFuncName 
 * @param {String} reason 
 * @param {...any} values 
 */
exports.log_in = function (funcName, innerFuncName, reason, ...values) {

    let error = false;

    //Lof the name of the function it came from and the given reason
    if (values.length === 0) {
        console.log(color_string('[', colors.punctuation) + color_string(funcName.toUpperCase(), colors.mainFunc) + color_string(':', colors.punctuation) + color_string(innerFuncName, colors.secondaryFunc) + color_string(']: ', colors.punctuation) + color_string(reason, colors.reason));
    } else {
        //Log provided values that go with it
        console.log(color_string('[', colors.punctuation) + color_string(funcName.toUpperCase(), colors.mainFunc) + color_string(':', colors.punctuation) + color_string(innerFuncName, colors.secondaryFunc) + color_string(']: ', colors.punctuation) + color_string(reason, colors.reason) + color_string(':', colors.punctuation));

        let strLen = 0;
        values.map(v => { Object.keys(v).map(s => { if (s.length > strLen) { strLen = s.length; } }) });
        strLen += 2;
        // strLen = Math.min(strLen, 10);

        //Print out all the values passed in
        let size = { height: 0, depth: 0 };
        values.map(v => {
            Object.keys(v).map(k => {
                stringify_value(v[k], color_string(k.padStart(strLen), colors.values) + color_string('] ', colors.punctuation), size, 0, color_string('|'.padStart(strLen), colors.punctuation));
            });
        });
    }
    //Print a new line
    console.log('');
}



function log_error(mes) {
    console.log(color_string(mes, colors.error));
    return true;
}



//Returns a formatted string based on the value
function stringify_value(value, pre, size, dent, next) {
    // console.log(pre);
    // console.log(value);

    //Create Spaces
    size.height++;
    if (size.height > max_height) {
        return log_error('Max height reached');
    } else if (size.depth > max_depth) {
        console.log(next + color_string('-> ', colors.punctuation) + color_string('Max depth reached', colors.error));
        return;
    }

    let print_string = pre;

    //If it is an array, call strinify_value on all the internals
    if (Array.isArray(value)) {
        //Print the start of the array
        print_string += color_string('Array: ', colors.lists) + ((value.length === 0) ? color_string('-Empty-', colors.error) : '');
        console.log(print_string);

        //Set array counter
        let i = -1;

        size.depth++;
        //Map out the array
        value.map(k => {
            if (size.height <= max_height) {
                ++i;
                stringify_value(value[k], next + color_string((i.toString()).padStart(2), colors.values) + color_string('] ', colors.punctuation), size, 2, next + color_string('|'.padStart(2), colors.punctuation));
            }
        });

        size.depth--;

        //If it is an object, call stringify_value on all key/value pairs
    } else if (typeof value === 'object' && value !== null) {
        let keys = Object.keys(value);
        print_string += color_string('Object: ', colors.lists) + ((keys.length === 0) ? color_string('-Empty-', colors.error) : '');
        console.log(print_string);

        let strLen = 0;
        keys.forEach(s => { if (s.length > strLen) { strLen = s.length; } });
        strLen++;

        size.depth++;
        
        keys.map(k => {
            if (size.height <= max_height) {
                stringify_value(value[k], next + color_string(k.padStart(strLen), colors.values) + color_string('] ', colors.punctuation), size, strLen + 2, next + color_string('|'.padStart(strLen), colors.punctuation));
            }
        });

        size.depth--;

        //If it's a primitive value, print it
    } else {
        console.log(print_string + exports.color_by_type(value));
    }

}



/**
 * dim: [30-37], 
 * bright: [90-97], xterm-255
 * @param {int} color 
 */
function color_string(string, color) {
    return '\u001b[38;5;' + color + 'm' + string + '\u001b[0m';
}



exports.statement = function (statement, ...value) {
    if (value.length > 0) {
        console.log(color_string(statement, colors.statement) + color_string(':', colors.punctuation), exports.color_by_type(...value));
    } else {
        console.log(color_string(statement, colors.statement));
    }
}



exports.color_by_type = function (...value) {
    return value.reduce((a, c) => {
        if (typeof c === 'string') {
            return a + color_string(c, colors.string) + color_string(', ', colors.punctuation);
        } else if (typeof c === 'number') {
            return a + color_string(c, colors.number) + color_string(', ', colors.punctuation);
        } else if (typeof c === 'undefined') {
            return a + color_string(c, colors.undefined) + color_string(', ', colors.punctuation);
        } else if (typeof c === 'boolean') {
            return a + color_string(c, colors.boolean) + color_string(', ', colors.punctuation);
        } else if (typeof c === 'object') {
            return a + color_string(c, colors.object) + color_string(', ', colors.punctuation);
        } else if (typeof c === 'function' || typeof c === 'symbol') {
            if(typeof c === 'function'){
                return a + color_string('{ ', colors.punctuation) + color_string('Function: ' + c.name, colors.function) + color_string(' }', colors.punctuation) + color_string(', ', colors.punctuation);
            } else {
                return a + color_string(c.toString(), colors.function) + color_string(', ', colors.punctuation);
            }
        } else {
            return a + c;
        }
    }, '').slice(0, -18 - (colors.punctuation).toString().length);
}