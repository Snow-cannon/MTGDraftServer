"use strict"

const { response } = require('express');
const { log, log_in, statement, set_logger_theme, set_max_height, set_max_depth } = require('../logger.js');
const { createPacks, getPack, getCube } = require('./pack_control.js');
const { load_cube } = require('./cube_import.js');
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

        // this.get_packs();
    }

    async get_packs() {
        for (let i = 0; i < this.num_users * 3; ++i) {
            let response = await getPack();
            this.packs.push(response);
            if (this.state === DRAFTING) {
                if ((this.curr_pack_set + 1) * this.num_users === this.packs.length) {
                    this.send_hand_request(); //Start draft
                } else {
                    this.send_pack_load_update(); //Send an update on the number of items loaded
                }
            }
        }
    }

    async get_cube(card_array, num_packs, num_cards_per_pack){
        let result = await getCube(card_array, num_packs, num_cards_per_pack);
        console.log('hand finished');
        this.packs = result;
        this.send_hand_request();
    }
    
    /**
     * Sends a notification to all table users that they can get their cards
     */
    send_hand_request() {
        this.tobj.notify_all('get_hand');
    }

    /**
     * Sends a notification to all table users that they can get their cards
     */
    send_pack_load_update() {
        this.tobj.notify_all('get_load_count');
    }
    
    /**
     * Sets the draft state to Drafting and locks the table so no other users can join
     */
     start_draft(cube_data) {
        let import_result = load_cube(cube_data);
        if (import_result.ok) {
            this.pack_count = 0;
            this.curr_pack_set = 0;
            this.returned = 0;
            this.state = DRAFTING;
            this.tobj.lock();
            this.num_users = this.tobj.users.length;
            this.packs = this.get_cube(import_result.cardArray, this.num_users * 3, 15);
        } else {
            console.log(import_result.error);
        }
    }

    // reduce_num_packs(pack_set) {
    //     this.packs[pack_set] = this.packs[pack_set].slice(0, this.num_users);
    //     log('reduce_num_packs', 'deleting extras', { packs: this.packs[pack_set].length });
    // }

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
                this.packs[data.pack.id] = shuffle(data.pack.cards);
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
                    let id;
                    //If the current set is even
                    if ((this.curr_pack_set % 2) == 0) {
                        //Index to the right in the pack array
                        id = modulo((this.get_user_table_id(uobj) + this.pack_count), this.num_users) + (this.curr_pack_set * this.num_users);
                    }
                    else {
                        //Index to the left in the pack array
                        id = modulo((this.pack_count - this.get_user_table_id(uobj)), this.num_users) + (this.curr_pack_set * this.num_users);
                    }
                    return { ok: true, pack: { id: id, cards: this.packs[id] } }
                } else {
                    return { ok: false }
                }
            case 'get_state':
                return { ok: true, state: this.state };

            //Sets the game state to the drafting mode
            case 'start_game':
                if (validate_host(uobj)) {
                    this.start_draft(data.cubeData); //Change the state
                    uobj.notify_self('reload'); //Notify the user sending the request to reload
                    uobj.notify_table('reload'); //Notify the table to reload
                    return { ok: true, state: this.state }; //Return the new game state
                } else {
                    return { ok: false };
                }

            case 'get_pack_load_count':
                return { ok: true, count: (this.packs.length % this.num_users), out_of: this.num_users };

            case 'get_usernames':
                let ret_data = this.tobj.users.map(uobj => { return { name: uobj.display_name, id: uobj.id } });
                return { ok: true, data: ret_data };

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

function validate_host(uobj) {
    return uobj.is_host;
}

function modulo(num, n) {
    return ((num % n) + n) % n;
}

function shuffle(array) {
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {

        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}