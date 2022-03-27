"use strict";

var USERS = [];
var userCount = 0;

const tables = require('./table.js');
const { log } = require('./logger.js');

//User object
class User {

    constructor(user_id) {
        this.id = user_id;
        this.table_id = -1;
        this.is_host = false;
        this.inactive = false;
        this.display_name = '';



        this.socket = null;
    }


    /**
     * Sets the id of the table the user is in
     * @param {int} table_id 
     */
    set_table(table_id) {
        this.table_id = table_id;
    }

    /**
     * Sets the playsers tableID to empty. DOES NOT REMOVE THEM FROM THE TABLE'S USER ARRAY
     */
    leave_table() {
        this.table_id = -1;
    }

    deactivate() {
        this.inactive = true;
    }

    activate() {
        this.inactive = true;
    }

    /**
     * Sends a command with a message to everyone in the user's table except themselves
     * @param {String} cmd 
     * @param {String} message 
     */
    notify_table(cmd, message) {
        //Tell the table to notify everyone that is not the sender
        let tobj = tables.get_table(this.table_id);
        if (tobj !== undefined) {
            tobj.notify(cmd, message, this);
        } else {
            log('notify_table', 'table does not exist', { table: this.table_id });
        }
    }

    /**
     * Sets the users socket
     * @param {Socket} socket 
     */
    set_socket(socket) {
        this.socket = socket;
    }

    /**
     * Sets the display name of the user
     * @param {String} name 
     */
    set_display_name(name) {
        this.display_name = name;
    }

    user_table_match() {
        let tobj = tables.get_table(this.table_id);
        if (tobj !== undefined) {
            return tobj.users.includes(this);
        } else {
            return false;
        }
    }

    get_table(){
        return tables.get_table(this.table_id);
    }

}


exports.user_table_match = function (user_id) {
    let uobj = exports.get_user(user_id);
    if (uobj !== undefined) {
        return uobj.user_table_match();
    } else {
        return false;
    }
}


/**
 * Creates a new user object and adds it to the array
 * @returns {User}
 */
exports.add_user = function (name) {
    //Make a new user and add it to the users list
    let uobj = new User(userCount++);
    USERS.push(uobj);
    uobj.set_display_name(name)

    //Return the object for reference
    return uobj;
}


//Return the user object based on ID if it exists
exports.get_user = function (user_id) {
    if (user_id !== -1) {
        return USERS.find(uobj => {
            return uobj.id == user_id;
        });
    } else {
        return undefined;
    }
}

//Return true if the object exists
exports.exists = function (user_id) {
    if (user_id !== -1) {
        return USERS.find(uobj => { return uobj.id == user_id; }) != undefined;
    } else {
        return false;
    }
}


exports.get_user_arr = function () {
    return USERS;
}