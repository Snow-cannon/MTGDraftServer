"use strict"

const { log, log_in, statement, set_logger_theme, set_max_height, set_max_depth } = require('../logger.js');
const WAITING = 'waiting',
    DRAFTING = 'drafting';

/**
 * Holds all connection to the 
 */
exports.Game_Logic = class {

    /**
     * Takes in a table object for reference
     * @param {Table} table 
     */
    constructor(table) {
        this.tobj = table;
        this.state = WAITING;
    }

    start_draft(){
        this.state = DRAFTING;
    }

    /**
     * Takes in a request and data and completes the request
     * @param {String} request 
     * @param {Object} data 
     * @param {Integer} user_id
     */
    make_request(request, data, uobj) {
        switch (request) {
            case 'get_state':
                return { state: this.state };

            //Sets the game state to the drafting mode
            case 'start_game':
                this.start_draft(); //Change the state
                uobj.notify_table('reload'); //Notify the table to reload
                uobj.notify_self('reload'); //Notify the user sending the request to reload
                return { state: this.state }; //Return the new game state
            default:
                log_in('Make_request', 'Default', 'game request made: no request detected', { data: data });
                return undefined;
        }

    }

}