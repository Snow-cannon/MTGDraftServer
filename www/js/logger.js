"use strict";

class Logger {

    constructor(active) {
        this.active = active;
    }

    log(funcName, reason, ...values) {
        if (this.active) {
            //Lof the name of the function it came from and the given reason
            if (values.length === 0) {
                console.log(this.color_string('[' + funcName + ']: ', 94) + reason);
            } else {
                //Log provided values that go with it
                console.log(this.color_string('[' + funcName + ']: ', 94) + reason + ':');
                values.map(v => { console.log(' ~> ' + v); });
            }
        }
    }

    /**
     * dim: [30-37], 
     * bright: [90-97], order: 0=black, 1=red, 2=green, 3=yellow, 4=blue, 5=purple, 6=light-blue, 7=white
     * @param {int} color 
     */
    color_string(string, color) {
        return '\u001b[' + color + 'm' + string + '\u001b[0m';
    }

}

export { Logger };