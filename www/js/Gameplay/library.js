//Methods that adjust the library

const ls = window.localStorage;

export class library {
    constructor() {
        this.userDeck = [];
        this.commandZone = [];
        if (JSON.parse(ls.getItem('deckObj') === null)) {
            this.userDeck = [];
        }
        else {
            this.userDeck = JSON.parse(ls.getItem('deckObj')).deck;
            this.commandZone = JSON.parse(ls.getItem('deckObj')).commandZone;
        }
    }
    drawCard() {
        return this.userDeck.shift();
    }
    shuffleDeck() {
        // Fisher-Yates shuffle, used for random decoder cipher below    
        let m = this.userDeck.length;

        // While there remain elements to shuffle…                                                                                
        while (m) {

            // Pick a remaining element…                                                                                          
            let i = Math.floor(Math.random() * m--);

            // And swap it with the current element.                                                                              
            let t = this.userDeck[m];
            this.userDeck[m] = this.userDeck[i];
            this.userDeck[i] = t;
        }
    }
    drawN(n) {
        let newHand = [];
        for (let i = 0; i < n; i++) {
            newHand[i] = this.userDeck.shift();
        }
        return newHand;
    }
    getLibrarySize(){
        return this.userDeck.length;
    }
    putOnTop(card){
        this.userDeck.unshift(card);
    }
    putOnBottom(card){
        this.userDeck.push(card);
    }
}


export class observer {
    constructor() {
        this.subscribers = [];
    }
    subscribe(func) {
        this.subscribers.push(func);
    }
    update() {
        for (const sub of this.subscribers) {
            sub();
        }
    }
}
