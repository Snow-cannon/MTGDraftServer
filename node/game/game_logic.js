"use strict"

const { response } = require('express');
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

        this.num_users = 4;
        this.loaded = false;
        this.packs = undefined;
        this.pack_promise = createPacks(this.num_users);
        this.pack_promise.then((response) => {
            this.packs = response;
            this.loaded = true;
            if (this.state === DRAFTING) {
                this.reduce_num_packs();
                this.send_hand_request();
            }
        });
    }

    /**
     * Sends a notification to all table users that they can get their cards
     */
    send_hand_request(){
        this.tobj.notify_all('get_hand');
    }

    /**
     * Sets the draft state to Drafting and locks the table so no other users can join
     */
    start_draft() {
        this.state = DRAFTING;
        this.tobj.lock();
        this.num_users = this.tobj.users.length;
        if(this.loaded){
            if(this.packs !== undefined){
                this.reduce_num_packs();
            }
        }
    }

    reduce_num_packs(){
        this.packs = this.packs.slice(0, this.num_users);
        log('reduce_num_packs', 'deleting extras', { packs: this.packs.length });
    }

    /**
     * Gets quick data from the server
     * @param {String} cmd 
     * @param {*} msg 
     * @param {User} uobj 
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
                /**
                 * Sends a pack to the user based on the users table_id
                 */
                if(this.loaded){
                    return { ok: true, pack: this.packs[this.get_user_table_id(uobj)] }
                } else {
                    return { ok: false }
                }
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

    /**
     * Returns an ID that is referencing the users position in the table user array
     * @param {User} uobj 
     */
    get_user_table_id(uobj){
        return this.tobj.users.indexOf(uobj);
    }

}