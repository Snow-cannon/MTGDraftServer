"use strict"

const { log, log_in, statement, set_logger_theme, set_max_height, set_max_depth } = require('../logger.js');

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
    }

    /**
     * Takes in a request and data and completes the request
     * @param {String} request 
     * @param {Object} data 
     * @param {Integer} user_id
     */
    make_request(request, data, user_id) {
        switch (request) {
            case 'get_usernames':

            default:
                log_in('Make_request', 'Default', 'game request made: no request detected', { data: data });
                return undefined;
        }

    }

}