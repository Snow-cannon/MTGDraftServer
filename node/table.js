"use strict"

const users = require('./user.js');
const { log } = require('./logger.js');
const { Game_Logic } = require('./game/game_logic.js');

var TABLES = [];
var tableCount = 0;

exports.get_table_arr = function () {
    return TABLES;
}

//A table object
class Table {

    /**
     * Takes in an id and a maximum number iof users
     * @param {Integer} table_id 
     * @param {Integer} max_size 
     */
    constructor(table_id, max_size) {
        this.id = table_id;
        this.users = [];

        //The greatest number of users a table can have
        this.user_limit = max_size;
        this.lifespan = 5; //Number of minutes the table is allows to live
        this.countdown = this.lifespan;

        //Determins if no more users can join
        this.locked = false;
        this.host = undefined;

        this.game_state = new Game_Logic(this);
    }

    /**
     * Changes which user is the host of the table
     */
    set_host() {
        this.host = this.users.find(uobj => !uobj.inactive);
        log('set_host', 'Host', { table: this.id }, { host: this.host });
    }

    /**
     * Removes a user from the table
     * @param {Integer} user_id 
     */
    remove_user(user_id) {
        //Find the user with the given ID in the table
        let uobj = this.users.find(u => { return u.id === user_id; });

        //Check if the user was found
        if (uobj !== undefined) {

            //If the user was found, remove it from the table
            let index = this.users.indexOf(uobj);
            this.users.splice(index, 1);

            if (this.users.length === 0) {
                let removed = delete_table(this.id);


                if (removed !== undefined) {
                    log('leave_table', 'Table was removed due to vacancy', { table: this.id });
                }
            } else {
                //Notify the table that the user left
                uobj.notify_table('log', 'User ' + users.get_user(user_id).display_name + ' left');
            }

            //Set the user to be no longer in the table
            uobj.leave_table();
            this.set_host();

            log('remove_user', 'User left table', { user: user_id }, { table: this.id });
        } else {
            log('remove_user', 'User is undefined');
        }
    }

    /**
     * Attempts to add a user to the table. Returns true if successful, false otherwise
     * @param {Integer} user_id 
     * @returns {boolean}
     */
    add_user(user_id) {
        if (!this.locked && this.users.length < this.user_limit) {
            let uobj = users.get_user(user_id);
            if (uobj !== undefined) {
                //Push the user to the table's user array
                this.users.push(uobj);

                //If the user is already in a table, remove them from that table
                if (uobj.table_id !== -1) {
                    let tobj = exports.get_table(uobj.table_id);
                    if (tobj !== undefined) {
                        tobj.remove_user(uobj.id);
                    }
                }

                //Set the user object's table to this table
                uobj.set_table(this.id);
                this.set_host();
                log('add_user', 'Added User', { user: user_id });

                return true;
            } else {
                log('add_user', 'User is undefined', { user: user_id });
                return false;
            }
        } else if (this.locked) {
            log('add_user', 'Table is locked, join failed', { table: this.id }, { user: user_id });
            return false;
        } else {
            log('add_user', 'Table is full, join failed', { table: user_id }, { user: user_id });
            return false;
        }
    }

    /**
     * Sends a message to the users within the table except for the sender
     * @param {String} cmd 
     * @param {any} message 
     * @param {uobj} sender 
     */
    notify(cmd, message, sender) {
        this.users.map(uobj => {
            if (uobj.id !== sender.id && sender !== null && uobj.socket !== null) {
                uobj.socket.emit(cmd, message);
            }
        });
    }

    /**
     * Returns if the user id exists within the table
     * @param {Integer} user_id 
     * @returns 
     */
    has_user(user_id) {
        return this.users.find(uobj => uobj.id === user_id) !== undefined;
    }

    /**
     * Takes in a request name and a set of parameters and returns the result from game logic
     * @param {String} request 
     * @param {Object} params 
     * @returns 
     */
    game_request(request, params, user_id) {
        return this.game_state.make_request(request, params, user_id);
    }

}
/**
 * Takes in the maximum number of users. adds to the table if the table is not full
 * @param {Integer} max_size 
 * @returns 
 */
exports.create_table = function (max_size) {
    //Creates a table with an ID equal to the number of tables created
    let tobj = new Table(tableCount++, max_size);
    TABLES.push(tobj);

    //Returns the object for reference
    return tobj;
}

/**
 * Returns a table object if the table with the given id exists. returns undefined otherwise
 * @param {Integer} table_id 
 * @returns {Table|undefined}
 */
exports.get_table = function (table_id) {
    if (table_id !== -1) {
        return TABLES.find(x => { if (table_id === x.id) { return x; } });;
    } else {
        return undefined;
    }
}

/**
 * Returns true if the table with the given id exists
 * @param {id} table_id 
 * @returns {boolean}
 */
exports.exists = function (table_id) {
    if (table_id === -1) { return false; }
    return TABLES.filter(tobj => { return tobj.id === table_id }).length > 0;
}

/**
 * Removes a user from it's table if the user is in a table already
 * @param {Integer} user_id 
 */
exports.leave_table = function (user_id) {
    //Get the user object
    let uobj = users.get_user(user_id);

    //Make sure the user exists
    if (uobj !== undefined) {

        //Get the users table
        let tobj = exports.get_table(uobj.table_id);

        //Make sure the table exists
        if (tobj !== undefined) {


            //Remove the user from the table
            tobj.remove_user(user_id);

        } else {

            //Lof that the table does not exist
            log('leave_table', 'User\'s table is undefined', { table: uobj.table_id });
        }
    } else {

        //Log that the user does not exist
        log('leave_table', 'User is undefined', { user: user_id });
    }
}

/**
 * Tries to add a user with the given user_id to the table with the given table_id.
 * Returns true if successful
 * @param {Integer} user_id 
 * @param {Integer} table_id 
 * @returns {boolean}
 */
exports.join_table = function (user_id, table_id) {
    //Get related objects
    let uobj = users.get_user(user_id);
    let tobj = exports.get_table(table_id);

    //Check if the table and user exist
    if (uobj !== undefined && tobj !== undefined) {

        /**
         * This function will remove the user from it's current table,
         * and add them to the new table
         */
        let success = tobj.add_user(user_id);
        if (success) {
            log('join_table', 'User joined table', { user: uobj.id }, { table: tobj.id });
        } else {
            log('join_table', 'join failed', { table: tobj.id });
        }

        return success;
    } else {
        //Log if the user does not exist
        if (!users.exists(user_id)) {
            log('join_table', 'User does not exist', { user: user_id }, { all_users: users.get_user_arr() });
        }

        //Log if the table does not exist
        if (!exports.exists(table_id)) {
            log('join_table', 'Table does not exist', { table: table_id });
        }

        return false;
    }
}

/**
 * Removes a table object from the array and returns the removed object. Returns undefined if the table does not exist
 * @param {Integer} table_id 
 * @returns {Table|undefined}
 */
function delete_table(table_id) {
    //Get the index of the table with the given ID
    let index = TABLES.indexOf(exports.get_table(table_id));
    //If the table exists within the array, splice it
    if (index > -1) {

        //Return the deleted table for reference
        return TABLES.splice(index, 1);
    } else {
        //Log that the table was missing
        log('delete_table', 'Table with specified ID was not in the array', { table: table_id });

        //Return undefined if the table was not removed
        return undefined;
    }
}