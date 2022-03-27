"use strict"

const users = require('./user.js');
const { log } = require('./logger.js');

var TABLES = [];
var tableCount = 0;

exports.get_table_arr = function () {
    return TABLES;
}

//A table object
class Table {

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

        //TODO: Add separate game instance for each table
    }

    set_host() {
        this.host = this.users.find(uobj => !uobj.inactive);
        log('set_host', 'Host', { table: this.id }, { host: this.host });
    }

    //Removes a user from the table
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


    notify(cmd, message, sender) {
        this.users.map(uobj => {
            if (uobj.id !== sender.id && sender !== null && uobj.socket !== null) {
                uobj.socket.emit(cmd, message);
            }
        });
    }


    has_user(user_id) {
        return this.users.find(uobj => uobj.id === user_id) !== undefined;
    }

}
//Makes a new table with a unique ID
exports.create_table = function (max_size) {
    //Creates a table with an ID equal to the number of tables created
    let tobj = new Table(tableCount++, max_size);
    TABLES.push(tobj);

    //Returns the object for reference
    return tobj;
}
//Returns the table object with the specified ID
exports.get_table = function (table_id) {
    if (table_id !== -1) {
        return TABLES.find(x => { if (table_id === x.id) { return x; } });;
    } else {
        return undefined;
    }
}

exports.exists = function (table_id) {
    if (table_id === -1) { return false; }
    return TABLES.filter(tobj => { return tobj.id === table_id }).length > 0;
}

//Removes user from the table they are currently in
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

//Adds a user to the detrmined table and removes it from the table it was previously in
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