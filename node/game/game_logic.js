"use strict"

const { response } = require('express');
const { log, log_in, statement, set_logger_theme, set_max_height, set_max_depth } = require('../logger.js');
const { createPacks, getPack } = require('./pack_control.js');
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

        this.pack_count = 0;
        this.curr_pack_set = 0;
        this.returned = 0;

        this.num_users = 4;
        this.packs = [];

        this.get_packs();
    }

    async get_packs() {
        for (let i = 0; i < this.num_users * 3; ++i) {
            let response = await getPack();
            this.packs.push(response);
            if (this.state === DRAFTING && (this.curr_pack_set + 1) * this.num_users === this.packs.length) {
                this.send_hand_request();
            }
        }
    }

    /**
     * Sends a notification to all table users that they can get their cards
     */
    send_hand_request() {
        this.tobj.notify_all('get_hand');
    }

    /**
     * Sets the draft state to Drafting and locks the table so no other users can join
     */
    start_draft() {
        this.pack_count = 0;
        this.curr_pack_set = 0;
        this.returned = 0;
        this.state = DRAFTING;
        this.tobj.lock();
        this.num_users = this.tobj.users.length;
    }

    reduce_num_packs(pack_set) {
        this.packs[pack_set] = this.packs[pack_set].slice(0, this.num_users);
        log('reduce_num_packs', 'deleting extras', { packs: this.packs[pack_set].length });
    }

    /**
     * Gets quick data from the server
     * @param {String} cmd 
     * @param {*} msg 
     * @param {User} uobj 
     */
    ping(cmd, msg, uobj) {
        switch (cmd) {
            case 'request_hand':
                uobj.socket.emit('get_hand');
                break;
            default:
                break;
        }
    }

    is_loaded() {
        return this.packs.length >= (this.curr_pack_set + 1) * this.num_users;
    }

    /**
     * Takes in a request and data and completes the request
     * @param {String} request 
     * @param {Object} data 
     * @param {Integer} user_id
     */
    make_request(request, data, uobj) {
        switch (request) {
            case 'update_user_pack':
                this.packs[data.pack.id] = data.pack.cards;
                this.returned++;
                if (this.returned >= this.num_users) {
                    this.returned = 0;
                    if (data.pack.cards.length === 0) {
                        this.pack_count = 0;
                        this.curr_pack_set++;
                    } else {
                        this.pack_count = (this.pack_count + 1) % this.num_users;
                    }

                    //Only load the new hands if the cards exist
                    if (this.is_loaded()) {
                        this.tobj.notify_all('get_hand');
                    }
                }
                return { ok: true };

            case 'get_user_pack':
                /**
                 * Sends a pack to the user based on the users table_id
                 */
                if (this.is_loaded()) {
                    let id = ((this.get_user_table_id(uobj) + this.pack_count) % this.num_users) + (this.curr_pack_set * this.num_users);
                    return { ok: true, pack: { id: id, cards: this.packs[id] } }
                } else {
                    return { ok: false }
                }
            case 'get_state':
                return { ok: true, state: this.state };

            //Sets the game state to the drafting mode
            case 'start_game':
                this.start_draft(); //Change the state
                uobj.notify_self('reload'); //Notify the user sending the request to reload
                uobj.notify_table('reload'); //Notify the table to reload
                return { ok: true, state: this.state }; //Return the new game state
            default:
                log_in('Make_request', 'Default', 'game request made: no request detected', { data: data });
                return { ok: false };
        }

    }

    /**
     * Returns an ID that is referencing the users position in the table user array
     * @param {User} uobj 
     */
    get_user_table_id(uobj) {
        return this.tobj.users.indexOf(uobj);
    }

}