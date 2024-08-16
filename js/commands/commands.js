function create_VIM_COMMANDS(environment, timesCommands) {
  var G = VIM_GENERIC;
  var exe = environment.executor;
  var env = environment;

  /******************************************
   * Helper functions
   *****************************************/
  
  function cursor() { return exe.cursor(); }
  function changeCursorTo(newCursor) { exe.changeCursorTo(newCursor); }
  function moveCursor(moveFun) { changeCursorTo(moveFun(cursor())); }

  /******************************************
   * Commands
   *****************************************/

  function vim_h() { moveCursor(exe.moveLeft); }
  function vim_j() { moveCursor(exe.moveDown); }
  function vim_k() { moveCursor(exe.moveUp); }
  function vim_l() { moveCursor(exe.moveRight); }

  function vim_w() { moveCursor(exe.moveToStartOfNextWord); }
  function vim_b() { moveCursor(exe.moveToStartOfWord); }
  function vim_e() { moveCursor(exe.moveToEndOfWord); }
  function vim_0() { moveCursor(exe.moveToStartOfLine); }
  function vim_$() { moveCursor(exe.moveToEndOfLine); }

  function vim_i() { env.setInsertMode(); }

  function vim_r() {
    function replace(input) {
        if(env.isInsertableCharacter(input))
            exe.replaceTargetWithInput(cursor(), input);
    }

    env.addAction("r", replace, ["char", "chained"]);
  }

  function vim_o() {
    var newrow = exe.createNewRow();
    exe.insertAfter(newrow, exe.currentRow());
    changeCursorTo(exe.firstChar(newrow));
    env.setInsertMode();
  }

  function vim_shifted_o() {
    var newRow = exe.createNewRow();
    exe.insertBefore(newRow, exe.currentRow());
    changeCursorTo(exe.firstChar(newRow));
    env.setInsertMode();
  }

  function vim_d() {
    /* target is movement or text object */
    function d_command(target) {
      if(target === 'd') {
        exe.removeCurrentLine();
      } else {
        // cps: removes when targetObject has been totally constructed
        timesCommands.doActionFor(target,
          function(targetObject) {
            if(!timesCommands.isEmptyMovement(targetObject))
              exe.removeBetween(targetObject.from, targetObject.to, targetObject.inclusiveFrom, targetObject.inclusiveTo);
          });
      }
    }

    env.addAction("d", d_command, ['dd', 'end_of_line', 'start_of_line', 'w', 'e', 'b', 'num_movement', 'hjkl', 'chained']);
  }

  /************************************
   * Find  (TODO: refactor to own file)
   ************************************/
  var lastFind;
  var FIND_FORWARD = true;
  var FIND_BACKWARD = !FIND_FORWARD;

  function setLastFind(input, direction) {
      if(env.isInsertableCharacter(input)) {
          lastFind = {
              'character': input,
              'direction': direction
          };
      }
  }

  function vim_repeat_last_find() {
    if(!lastFind) return;

    var findFun = lastFind.direction === FIND_FORWARD ? find : findBackward;
    findFun(lastFind.character, false);
  }

  function vim_repeat_last_find_in_opposite_direction() {
    if(!lastFind) return;

    var findFun = lastFind.direction === FIND_FORWARD ? findBackward : find;
    findFun(lastFind.character, false);
  }

    var find = function(input, shouldSetLastFind) {
      if(shouldSetLastFind)
          setLastFind(input, FIND_FORWARD);

      var nextCharInLine = exe.moveRight(cursor());
      var found = exe.findForwardStartingFrom(input, nextCharInLine, exe.charsInSameLine(nextCharInLine));

      if(!!found)
        changeCursorTo(found);
    };

    function vim_f() {
        var findAndSetLastFind = function(input) { find(input, true); }
        env.addAction("f", findAndSetLastFind, ["char", "chained"]);
    }

    var findBackward = function(input, shouldSetLastFind) {
      if(shouldSetLastFind)
        setLastFind(input, FIND_BACKWARD);

      var previousCharInLine = exe.moveLeft(cursor());
      var found = exe.findBackwardStartingFrom(input, previousCharInLine, exe.charsInSameLine(previousCharInLine));

      if(!!found)
        changeCursorTo(found);
    };

  function vim_shifted_f() {
    var findBackwardAndSetLastFind = function(input) { findBackward(input, true); }
    env.addAction("shift-f", findBackwardAndSetLastFind, ["char", "chained"]);
  }

  function vim_shifted_d() {
    var index = exe.currentColumnIndex();
    exe.removeStartingFrom(index);
  }

  function vim_x() { exe.removeCharUnderCursor(); }
  function vim_shifted_x() { exe.removePreviousCharInCurrentLine(); }

  function vim_backspace() { vim_h(); }

  function vim_g() {
    var wait_for_input = function(input) {
      if(input === 'g')
        changeCursorTo(exe.first(exe.chars()));
      else if(input === 'e') {
        moveCursor(exe.moveToEndOfPreviousWord);
      } 
    };

    env.addAction("g", wait_for_input, ["g", "ge", "chained"]);
  }

  function vim_shifted_g() {
    var last = exe.last(exe.chars());
    changeCursorTo(last);
  }

  function vim_u() {
    env.undo();
  }

  function vim_shifted_y() { }

  function vim_insertmode_esc() { env.setCommandMode(); }
  function vim_insertmode_space() {
      exe.divideCurrentWordWithSpace();
      env.addedInsertModeChar(" ");
  }
  function vim_insertmode_backspace() {
      exe.removePreviousCharInCurrentLine();
      env.removedInsertModeChar();
  }

  function vim_insertmode_enter() {
    // commented lines show an example text that is being manipulated

    // example l[i]ne
    exe.divideCurrentWordWithSpace();
    // example l [i]ne
    moveCursor(exe.moveLeft);
    // example l[ ]ine
    var contentCopy = exe.cutLineContent(cursor(), exe.moveToEndOfLine(cursor()));
    // example l
    var newLine = $(exe.createNewRow(contentCopy));
    exe.insertAfter(newLine, exe.currentRow());
    // example l| in[e] <-- the place of cursor might not be that
    changeCursorTo(exe.first(exe.chars(newLine)));
    // example l|[ ]ine
    vim_x(); // remove the space that was made with divideCurrentWordWithSpace
    // example l|[i]ne
  }

  function vim_c() {
    function wait_for_i(input) {
      if(input === 'i') {
        function wait_for_target(target) {
          timesCommands.applyActionTo("i" + target,
            function(targetObject) {
              if(!timesCommands.isEmptyMovement(targetObject)) {
                exe.removeBetween(targetObject.from, targetObject.to, targetObject.inclusiveFrom, targetObject.inclusiveTo);
                env.setInsertMode();
              }
            });
        }

        env.addAction("i", wait_for_target, ['ci', 'end_of_line', 'start_of_line', 'w', 'e', 'b', 'num_movement', 'hjkl', 'chained']);
      }
    }

    env.addAction("c", wait_for_i, ['ci[movement]', 'end_of_line']);
  }

  function repeatingRepeat(commandChain) {
    return G.exists(commandChain, function(command) { return command === '.'; }); //TODO hard reference to dot (.)
  }

  function vim_repeat() {
    var commandChain = env.getLastCommandChain();
    if(!repeatingRepeat(commandChain))
      env.interpretSequence(commandChain);
  }

  function vim_shifted_j() {
    var currentLine = exe.line(cursor());
    var nextLine = exe.line(exe.nextWord(exe.moveToEndOfLine(cursor())));
    
    if(currentLine !== nextLine)
      exe.joinLines(currentLine, nextLine);
  }

  function vim_a() {
    var current = cursor();
    var next = exe.moveRight(current);

    if(exe.charIndex(current) === exe.charIndex(next))
      exe.insertAfter(exe.createNewChar(), exe.currentWord());

    vim_l();
    exe.withAttribute(cursor(), "appendable");
    env.setInsertMode();
  }

  function vim_shifted_a() {
    vim_$();
    vim_a();
  }

  function vim_shifted_i() {
    vim_first_nonblank_char_in_current_line();
    vim_i();
  }

  function vim_star() {
    searchWordUnderCursor(exe.findForward);
  }

  function searchWordUnderCursor(searchFun) {
    var searchable = exe.currentWord();
    var all = exe.words();
    var startIndex = all.index(searchable);
    var searchableText = exe.text(searchable);

    var found = searchFun(startIndex, all, function(word) {
      return searchableText === exe.text(word);
    });

    if(!found) throw "Not found word. Should not happen as the searchable belongs to the search objects!";

    changeCursorTo(exe.first(exe.chars(found)));
  }

  function vim_hash() { searchWordUnderCursor(exe.findBackward); }

  function vim_first_nonblank_char_in_current_line() {
    var found = exe.findFirstNonBlankCharInLine(exe.currentRow());
    
    if(!!found)
      changeCursorTo(found);
    else
      vim_$();
  }

  function vim_y() {
    //TODO: accept general movement
    function wait_for_y(input) {
      if(input == 'y') {
        var copy = exe.copy(exe.currentRow());
        env.saveToRegister(copy);
      }
    }

    env.addAction("y", wait_for_y, ["copy_line", "chained"]);
  }

  function vim_p() {
    var copy = env.loadFromRegister();

    if(!!copy && exe.isLine(copy)) {
      exe.insertAfter(copy, exe.currentRow());
      changeCursorTo(exe.firstChar(exe.nextWord(exe.moveToEndOfLine(cursor()))));
    } else { //FIXME: should take into account a heterogenous array of lines, words...
      exe.insertAfter(copy, cursor());
    }
  }

  function vim_goto_corresponding_parentheses() {
    var found = exe.findCorrespondingParentheses();

    if(!!found)
      exe.changeCursorTo(found);
  }

  function vim_macro_recording() {
    if(env.isRecordingMacro())
      env.endMacroRecording();
    else {
      function waitForMacroKey(input) {
        env.startMacroRecording(input);
      }

      env.addAction("q", waitForMacroKey);
    }
  }

  function vim_macro_play() {
    function waitForMacroKey(input) {
      env.playMacro(input);
    }

    env.addAction("@", waitForMacroKey);
  }

  function vim_S() {
    exe.removeStartingFrom(0); 
    env.setInsertMode();
  }
  
  function vim_m() {
    function wait_for(mark_key) {
      var location = { 
        'lineIndex': exe.currentRowIndex(),
	      'columnIndex': exe.currentColumnIndex()
      };

      env.setMark(mark_key, location);
    }

    env.addAction('m', wait_for);
  }

  function vim_goto_mark_location() {
    private_mark_goto('`', function(location) {
      var line = exe.moveToLineNumber(location.lineIndex);
      changeCursorTo(exe.moveToColumnIndex(line, location.columnIndex));
    });
  }

  function vim_goto_mark_line() {
    private_mark_goto('\'', function(location) {
      var line = exe.moveToLineNumber(location.lineIndex);
      changeCursorTo(exe.moveToStartOfLine(line));
    });
  }

  function private_mark_goto(command, fun) {
    function wait_for(mark_key) {
      var location = env.getMark(mark_key);
  
      if(location !== undefined) {
        fun(location);
      }
    }
    
    env.addAction(command, wait_for);
  }

  function private_goto_next_parenthesis(command, parenthesesCollection, findFun) {
    function wait_for(input) {
      if(G.existsIn(input, parenthesesCollection)) { 
        var found = findFun(exe.cursorIndex(), exe.chars(), 
                           function(ch) { return exe.text(ch) === input; });
        if(!!found)
          exe.changeCursorTo(found);
      } 
    }
    
    env.addAction(command, wait_for);
  }

  function vim_goto_previous_parenthesis() {
    private_goto_next_parenthesis('[', ['(', '{', '['], exe.findBackward);
  }
 
  function vim_goto_next_parenthesis() {
    private_goto_next_parenthesis(']', [')', '}', ']'], exe.findForward);
  }
 
  /******************************************
   Register commands
  *****************************************/

  registerInsertModeCommand('Esc', vim_insertmode_esc);
  registerInsertModeCommand('Space', vim_insertmode_space);
  registerInsertModeCommand('Backspace', vim_insertmode_backspace);
  registerInsertModeCommand('Enter', vim_insertmode_enter);
  register('i', vim_i);
  register('h', vim_h);
  register('j', vim_j);
  register('k', vim_k);
  register('l', vim_l);
  register('f', vim_f);
  register('F', vim_shifted_f);
  register('r', vim_r);
  register('w', vim_w);
  register('b', vim_b);
  register('e', vim_e);
  register('d', vim_d);
  register('D', vim_shifted_d);
  register('x', vim_x);
  register('X', vim_shifted_x);
  register('0', vim_0);
  register('$', vim_$);
  register('o', vim_o);
  register('O', vim_shifted_o);
  register('Backspace', vim_backspace);
  register('G', vim_shifted_g);
  register('g', vim_g);
  register('c', vim_c);
  register('.', vim_repeat);
  register('a', vim_a);
  register('A', vim_shifted_a);
  register('J', vim_shifted_j);
  register('*', vim_star);
  register("#", vim_hash);
  register('I', vim_shifted_i);
  register('y', vim_y);
  register('p', vim_p); 
  register('u', vim_u);
  register('%', vim_goto_corresponding_parentheses);
  register('q', vim_macro_recording);
  register('@', vim_macro_play);
  register('S', vim_S);
  register('m', vim_m);
  register('`', vim_goto_mark_location);
  register('\'', vim_goto_mark_line);
  register(']', vim_goto_next_parenthesis);
  register('[', vim_goto_previous_parenthesis);
  register('^', vim_first_nonblank_char_in_current_line);
  register(';', vim_repeat_last_find);
  register(',', vim_repeat_last_find_in_opposite_direction);

  function register(key, fun) { env.registerCommand(key, fun); }
  function registerInsertModeCommand(key, fun) { env.registerInsertModeCommand(key, fun); }
}
