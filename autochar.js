// NEXT: node,npm,electron on rpi
let count = 0;

// TODO:
//   3rd character
//   sort bests by stroke count, pick the closest (part of med?)

if (typeof module != 'undefined' && process.versions.hasOwnProperty('electron')) {
  Tone = require("Tone");
}

const REPLACE_ERASE = 0;
const REPLACE_STROKE = 1;
const DELETE_ACTION = 2;
const INSERT_ACTION = 3;

class Autochar {

  constructor(util, wordCompleteCB, nextTargetCB) {

    this.tid = -1;
    this.med = -1;
    this.util = util;
    this.triggers = 0;
    this.target = null;
    this.targetCharIdx = -1;
    this.targetPartIdx = -1;
    this.currentStrokeCount = 0;
    this.word = util.randWord(2);
    this.memory = new util.HistQ(10);
    this.memory.add(this.word.literal);
    this.wordCompleteCallback = wordCompleteCB;
    this.nextTargetCallback = nextTargetCB;

    console.log('loaded ' + TRIGGERS.length + ' trigger chars');
  }

  draw(renderer, rgb) {

    this.renderWord(this.word, renderer, .65, 30, rgb);
  }

  // returns the next action to be done
  step() {
    if (!this.target) {
      let trigd = this.pickNextTarget();
      this.findEditIndices();
      if (this.nextTargetCallback) {
        this.nextTargetCallback(this.target.literal, this.currentStrokeCount, trigd);
      }
    }

    this.doNextEdit();

    return this.action;
  }

  pickNextTarget() {

    let opts = this.util.bestEditDistance(this.word.literal, null, this.memory);
    if (!opts || !opts.length) {
      throw Error('Died on ' + this.word.literal, this.word);
    }

    if (this.targetCharIdx > -1) { // alternate characters when possible
      let ideals = [];
      let justChanged = this.word.literal[this.targetCharIdx];
      //console.log('justChanged', justChanged);
      for (var i = 0; i < opts.length; i++) {
        if (opts[i][this.targetCharIdx] === justChanged) {
          ideals.push(opts[i]);
        }
      }
      //console.log('opts  ', opts.length, JSON.stringify(ideals));
      //console.log('ideals', ideals.length, JSON.stringify(ideals));
      if (ideals.length) opts = ideals;
    }

    let result;
    let triggered = false;

  // if (++count == 3) {
  //    // TMP
  //     opts[0] = '分曉';
  //     console.log('forced trigger');

      if (!this.memory.contains('trigger')) {
        OUT: for (var i = 0; i < opts.length; i++) {
          var cand = opts[i];
          for (var j = 0; j < cand.length; j++) {
            var char = cand[j];
            if (TRIGGERS.indexOf(char) > -1) {
              result = this.util.getWord(cand);
              triggered = true;
              this.triggers++;
              break OUT;
            }
          }
        }
      //}
    }
    //else console.log('skip-trigger-check');

    if (!result) result = this.util.getWord(opts[(Math.random() * opts.length) << 0]);

    this.med = this.util.minEditDistance(this.word.literal, result.literal);
    this.memory.add(result.literal);
    this.target = result;

    if (triggered) {
      console.log('trigger: "' + char + '" in "' + result.literal + '"');
      this.util.toggleLang();
      this.memory.add('trigger');
    }

    return triggered;
    //console.log("WORD: ", this.word, "\nNEXT: ", this.target, "\nMED: ", this.med);
  }

  doNextEdit() {

    if (this.action == REPLACE_ERASE) {
      if (!this.word.eraseStroke(this.targetCharIdx, this.targetPartIdx)) {
        // erasing done, now replace
        this.word = this.target;
        this.word.hide(); // TODO: simplify to one function
        this.word.show(this.targetCharIdx, this.targetPartIdx == 1 ? 0 : 1);
        this.word.show(this.targetCharIdx == 1 ? 0 : 1);
        this.action = REPLACE_STROKE;
        //return;
      }
      // else this.wordCompleteCallback(); // erase stroke change
    }

    if (this.action == REPLACE_STROKE) {
      if (this.word.nextStroke(this.targetCharIdx, this.targetPartIdx)) {
        this.wordCompleteCallback(); // draw stroke change
      } else { // flash
        this.wordCompleteCallback(this.word, this.med); // word change
        this.target = null;
      }
    }
  }

  findEditIndices() {

    this.targetCharIdx = -1;
    this.targetPartIdx = -1;

    if (this.target.length === this.word.length) {

      this.action = REPLACE_ERASE;

      for (var i = 0; i < this.word.length; i++) {
        if (this.word.literal[i] !== this.target.literal[i]) {
          this.targetCharIdx = i;
          let wchr = this.word.characters[i];
          let tchr = this.target.characters[i];
          //console.log('wchr',wchr);
          for (var j = 0; j < wchr.parts.length; j++) {

            // check the number of strokes in each part
            // if they don't match then this part needs updating
            if (wchr.cstrokes[j].length !== tchr.cstrokes[j].length) {
              this.targetPartIdx = j;

              // compute the number of strokes that need to be drawn
              if (j < 0) console.log('***pidx=' + j, this.word.literal, this.med);
              if (i > -1 && j > -1) {
                this.currentStrokeCount = tchr.paths[j].length;
              }
            }
          }
        }
      }

      //console.log('strokes: '+this.currentStrokeCount);

    } else if (this.target.length > this.word.length) {
      this.action = INSERT_ACTION; // TODO

    } else if (this.target.length < this.word.length) {
      this.action = DELETE_ACTION; // TODO
    }

    //console.log('target=' + this.target.literal[this.targetCharIdx]
    //+', charIdx=' + this.targetCharIdx + ', pIdx=' + this.targetPartIdx);
  }

  renderWord(word, renderer, scale, yoff, rgb) {

    if (word.characters) {
      for (var i = 0; i < word.characters.length; i++) {
        if (word.literal[i] !== ' ')
          this.util.renderPath(word, i, renderer, scale, yoff, rgb);
      }
    }
  }
}

const TRIGGERS = '習习審审國国門门產产藝艺罰罚監监獄狱網网腦脑書书報报傳传黨党強强憲宪劉刘曉晓隸隶臉脸權权規规條条夢梦變变禮礼競竞爭争對对優优彎弯歷历復复萬万歲岁錯错謬谬惡恶壞坏愛爱護护衛卫華华賣卖讀读學学認认識识問问檢检驗验戰战鬥斗撥拨錢钱幣币異异雜杂亂乱歸归經经濟济';

if (typeof module != 'undefined') module.exports = Autochar;