"use strict"

const { log, log_in, statement, set_logger_theme, set_max_height, set_max_depth } = require('../logger.js');
const { createPacks } = require('./pack_control.js');
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
        //Basic game data
        this.tobj = table;
        this.state = WAITING;

        this.num_users = 1;
        this.packs = createPacks(this.num_users);
        this.loaded = false;
        this.packs.then((response) => {
            this.loaded = true;
            console.log('got hand');
            if (this.state === DRAFTING) {
                this.send_hand_request();
            }
        });
    }

    send_hand_request(){
        this.tobj.notify_all('get_hand');
    }

    start_draft() {
        this.state = DRAFTING;
    }

    /**
     * Gets quick data from the server
     * @param {*} cmd 
     * @param {*} msg 
     * @param {*} uobj 
     */
    ping(cmd, msg, uobj){
        switch(cmd){
            case 'request_hand':
                uobj.socket.emit('get_hand');
        }
    }

    /**
     * Takes in a request and data and completes the request
     * @param {String} request 
     * @param {Object} data 
     * @param {Integer} user_id
     */
    make_request(request, data, uobj) {
        switch (request) {
            case 'get_user_pack':


            case 'get_state':
                return { state: this.state };

            //Sets the game state to the drafting mode
            case 'start_game':
                this.start_draft(); //Change the state
                uobj.notify_self('reload'); //Notify the user sending the request to reload
                uobj.notify_table('reload'); //Notify the table to reload
                return { state: this.state }; //Return the new game state
            default:
                log_in('Make_request', 'Default', 'game request made: no request detected', { data: data });
                return undefined;
        }

    }

}