"use_strict";

import * as cookie from './cookie.js';
import { Logger } from './logger.js';

const socket = io();

socket.on('make_host', function (data) {
    console.log('You are host!');
});

socket.on('get_hand', function (data) {
    console.log('get hand pls');
});

socket.emit('request_hand');