"use strict"

const { response } = require('express');
const { log, log_in, statement, set_logger_theme, set_max_height, set_max_depth } = require('../logger.js');
const { createPacks, getPack, getCube } = require('./pack_control.js');
const { load_cube } = require('./cube_import.js');
const WAITING = 'waiting',
    DRAFTING = 'drafting',
    BUILDING = 'building',
    PLAYING = 'playing',
    PLAY_WAIT = 'play_wait';

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
        this.users = () => this.tobj.users;

        //Drafting
        this.pack_count = 0;
        this.curr_pack_set = 0;
        this.returned_packs = [];
        this.pack_rounds = 3;
        this.pack_size = 5;
        this.num_users = 4;
        this.packs = [];

        //Deck Building
        this.returned_decks = [];

        //Activate below for random packs
        // this.get_packs();

        //Playing
        this.sub_tables = [];
    }

    /**
     * Calls getPack enough times to collect a set of cards for each pack for each player
     */
    async get_packs() {
        for (let i = 0; i < this.num_users * this.pack_rounds; ++i) {
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

    async get_cube(card_array, num_packs, num_cards_per_pack) {
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
     * Sends a notification to all table users that they can get their cards
     */
    force_user_reload() {
        this.tobj.notify_all('reload');
    }

    //Notifies both parties of the table
    notify_sub_table(uobj, cmd, msg) {
        let u1 = this.sub_tables[this.get_sub_table_id(uobj)].u1
        let u2 = this.sub_tables[this.get_sub_table_id(uobj)].u2
        this.users()[u1].notify_self(cmd, msg);
        this.users()[u2].notify_self(cmd, msg);
    }

    //Notifies the other person in the table
    notify_other_table_participant(uobj, cmd, msg) {
        let tableID = this.get_sub_table_id(uobj);
        if (tableID >= 0) {
            let table = this.sub_tables[tableID];
            let selfID = this.get_relative_user_id(uobj);
            if (table.u1 === selfID) {
                this.users()[table.u2].notify_self(cmd, msg);
            } else {
                this.users()[table.u1].notify_self(cmd, msg);
            }
        }
    }

    get_sub_table_id(uobj) {
        let id = this.get_relative_user_id(uobj);
        for (let i = 0; i < this.sub_tables.length; ++i) {
            let table = this.sub_tables[i]
            if (table.u1 === id || table.u2 === id) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Sets the draft state to Drafting and locks the table so no other users can join
     */
    start_draft(cube_data) {
        let import_result = load_cube(cube_data);
        if (import_result.ok) {
            this.pack_count = 0;
            this.curr_pack_set = 0;
            this.state = DRAFTING;
            this.num_users = this.tobj.users.length;
            this.packs = this.get_cube(import_result.cardArray, this.num_users * this.pack_rounds, this.pack_size);
            for (let i = 0; i < this.num_users; ++i) { this.returned_decks.push(false); } //Populate the returned-deck array with false
            for (let i = 0; i < this.num_users; ++i) { this.returned_packs.push(false); } //Populate the returned-pack array with false
            this.tobj.lock();
        } else {
            console.log(import_result.error);
        }
    }

    /**
     * Initializes the gameplay, creates subtables, and reloads players screens
     */
    prepare_gameplay() {
        this.state = PLAY_WAIT;
        let table_count = (this.num_users - (this.num_users % 2)) / 2;
        for (let i = 0; i < table_count; ++i) {
            this.make_table(this.users()[i * 2], this.users()[(i * 2) + 1]);
        }
        this.force_user_reload();
    }

    make_table(uobj1, uobj2) {
        let id1 = this.get_relative_user_id(uobj1);
        let id2 = this.get_relative_user_id(uobj2);
        for (let i = 0; i < this.sub_tables.length; ++i) {
            let table = this.sub_tables[i];
            if (table.u1 === id1 || table.u2 === id1 || table.u1 === id2 || table.u2 === id2) {
                return { ok: false };
            }
        }

        this.sub_tables.push({
            u1: id1,
            u2: id2,
            u1Update: {},
            u2Update: {},
            // data: {},
            game_state: PLAYING
        });
        return { ok: true, table_id: this.sub_tables.length }
    }

    remove_table(table_id) {
        if (this.sub_tables.length < table_id) {
            let removed = {
                ok: true,
                table_id: table_id,
                user1: this.sub_tables[table_id].u1,
                user2: this.sub_tables[table_id].u2,
                data: this.sub_tables[table_id].data
            };
            this.sub_tables.splice(table_id, 1);
            return removed;
        } else {
            return { ok: false }
        }
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
        let tableId;
        let user_id;
        let id;
        let table;

        switch (request) {
            case 'update_user_pack':
                this.packs[data.pack.id] = shuffle(data.pack.cards);
                this.returned_packs[this.get_relative_user_id(uobj)] = true;
                if (!this.returned_packs.includes(false)) {
                    this.returned_packs = this.returned_packs.map(e => false);
                    if (data.pack.cards.length === 0) {
                        this.pack_count = 0;
                        this.curr_pack_set++;
                        console.log(this.curr_pack_set);
                        if (this.curr_pack_set >= this.pack_rounds) {
                            this.state = BUILDING;
                            this.force_user_reload();
                        }
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
                    //If the current set is even
                    if ((this.curr_pack_set % 2) == 0) {
                        //Index to the right in the pack array
                        id = modulo((this.get_relative_user_id(uobj) + this.pack_count), this.num_users) + (this.curr_pack_set * this.num_users);
                    } else {
                        //Index to the left in the pack array
                        id = modulo((this.pack_count - this.get_relative_user_id(uobj)), this.num_users) + (this.curr_pack_set * this.num_users);
                    }
                    return { ok: true, pack: { id: id, cards: this.packs[id] } }
                } else {
                    return { ok: false };
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

            case 'complete_building':
                this.returned_decks[this.get_relative_user_id(uobj)] = true;
                if (!this.returned_decks.includes(false)) {
                    this.prepare_gameplay();
                }
                return { ok: true };

            case 'get_table_id':
                user_id = this.get_relative_user_id(uobj);
                for (let i = 0; i < this.sub_tables.length; ++i) {
                    if (this.sub_tables[i].u1 === user_id || this.sub_tables[i].u2 === user_id) {
                        return { ok: true, table_id: i };
                    }
                }

                return { ok: false };

            case 'start_matches':
                this.state = PLAYING;
                this.force_user_reload('reload');

            case 'updata_game_state':
                // table = this.get_sub_table_id(uobj);
                // if (table >= 0) {
                //     this.sub_tables[table].data = data.data;
                //     this.notify_other_table_participant(uobj, 'get_state');
                //     return { ok: true };
                // } else {
                //     return { ok: false }
                // }

                tableId = this.get_sub_table_id(uobj);
                if (tableId >= 0) {
                    table = this.sub_tables[tableId];
                    if (table.u1 === this.get_relative_user_id(uobj)) {
                        table.u1Update = data.data;
                    } else {
                        table.u2Update = data.data;
                    }
                    this.notify_other_table_participant(uobj, 'get_state');
                    return { ok: true };
                } else {
                    return { ok: false }
                }

            case 'get_table_state':
                tableId = this.get_sub_table_id(uobj);
                if (tableId >= 0) {
                    table = this.sub_tables[tableId];
                    if (table.u1 === this.get_relative_user_id(uobj)) {
                        return { ok: true, data: table.u2Update };
                    } else {
                        return { ok: true, data: table.u1Update };
                    }
                } else {
                    return { ok: false }
                }

            case 'concede_game':
                tableId = this.get_sub_table_id(uobj);
                if (tableId >= 0) {
                    this.sub_tables[tableId].game_state = PLAY_WAIT;
                    return { ok: true }
                } else {
                    return { ok: false }
                }

            default:
                log_in('Make_request', 'Default', 'game request made: no request detected', { data: data });
                return { ok: false };
        }

    }

    /**
     * Returns an ID that is referencing the users position in the table user array
     * @param {User} uobj 
     */
    get_relative_user_id(uobj) {
        return this.users().indexOf(uobj);
    }









    get_game_html(uobj) {
        let table;
        let state;
        switch (this.state) {

            case DRAFTING:
                return 'draft_room.html';

            case PLAY_WAIT:
                return 'pre_play_room.html';

            case PLAYING:
                table = this.get_sub_table_id(uobj);

                if (table > -1) {
                    state = this.sub_tables[table].game_state;
                }

                if (state === PLAYING) {
                    return 'board.html';
                } else {
                    return 'waiting_room.html';
                }

            case BUILDING:
                return 'deck_builder.html';

            case WAITING:
                return 'waiting_room.html';

            default:
                return 'waiting_room.html';
        }
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