/**
 * Visual block mode commands.
 * Allows prepending and appending text to selected rows
 *
 * FIXME: this needs SOME refactoring
 * FIXME: move jQuery dependent code to executor/view
 * FIXME: should not depend on doc
 */
function create_VIM_VISUALBLOCK_COMMANDS(environment, messager, doc) {
  var G = VIM_GENERIC;
  var exe = environment.executor;
  var env = environment;

  var originAttributeName = 'visual_block_origin';

  function register(key, fun) { env.registerCommand(key, fun); }
  function cursor() { return exe.cursor(); }  

  function insertCharactersToSelectedLines(insertLocations, repeatableChars) {
    G.for_each(insertLocations, function(location) {
          exe.changeCursorTo(location);

          G.for_each(repeatableChars, function(ch) {
            if(ch === " ") {
              exe.divideCurrentWordWithSpace();
            } else {
              var $ch = $(doc.getChar(ch));
              $ch.insertBefore(cursor()); // XXX: bypass the interpreter for speed
            }
          });
        });
  }

  function listenToInsert(insertLocations, cursorEndingLocation) {
    env.setInsertMode();
    //update_visual_view();

    var alreadyProcessingRepeatInsert = false;

    messager.listenTo('updated_mode', function(newmode) {
      if(env.isCommandMode() && !alreadyProcessingRepeatInsert) {
        alreadyProcessingRepeatInsert = true;
        var repeatableChars = env.getInsertedCharsInLastInsertModeSession(); // need to have a reference before setting insertmode again

        insertCharactersToSelectedLines(insertLocations, repeatableChars);
        exe.changeCursorTo(exe.moveLeft(cursorEndingLocation, repeatableChars.length));
        cleanup();

        return messager.REMOVE_THIS_LISTENER;
      }
    });
  }

  function createInputRecursion(continuation) {
    return function(input) { continuation(input, continuation); }
  }

  function addInputRecursiveAction(actionFun) {
    env.addAction("visual_block_select_area", createInputRecursion(actionFun));
  }

  function vim_set_visual_block_mode() {
    //env.setVisualBlockMode();
    function wait_for(input, continuation) {
      if(G.existsIn(input, ["h", "j", "k", "l"])) {
        env.interpretOneCommand(input);
        update_visual_view();
        addInputRecursiveAction(continuation);
      } else if(input === "I") {
        var locations = getPrependLocations();
        var currentLocation = locations.get(0).eq(0);
        exe.changeCursorTo(currentLocation);
        listenToInsert(locations.slice(1, locations.length), currentLocation);
      }
      /*
      else if(input === "A") { // FIXME: does not work yet
        var locations = getAppendLocations();
        var currentLocation = locations.get(0).eq(0);
        exe.changeCursorTo(currentLocation);
        listenToInsert(locations.slice(1, locations.length), currentLocation);
      }
      else if(input === "$") {
        // let user input text
        // insert that text
      } */
      else if(input === "Esc") {
        cleanup();
      } else {
        addInputRecursiveAction(wait_for);
      }
    }

    exe.withAttribute(cursor(), originAttributeName); // XXX: instead: coordinates would be more robust?

    update_visual_view();
    addInputRecursiveAction(wait_for);
  }

  function getPrependLocations() {
    var bound = getBoundaries(getOrigin());
    var lines = getSelectedLines(bound);

    return lines.map(function() {
      var $line = $(this);
      return exe.charsInLine($line).eq(bound.colStart);
    });
  }

  function getAppendLocations() {
    var bound = getBoundaries(getOrigin());
    var lines = getSelectedLines(bound);

    return lines.map(function() {
      var $line = $(this);
      return exe.charsInLine($line).eq(bound.colEnd);
    });
  }

  function getBoundaries(origin) {
    var origRow = exe.lineIndex(exe.line(origin));
    var origCol = exe.colIndex(origin);

    var curRow = exe.currentRowIndex();
    var curCol = exe.currentColumnIndex();

    return {
      'rowStart': Math.min(origRow, curRow),
      'rowEnd': Math.max(origRow, curRow),
      'colStart': Math.min(origCol, curCol),
      'colEnd': Math.max(origCol, curCol)
    }
  }

  function getSelectedLines(bound) {
    return exe.lines().slice(bound.rowStart, bound.rowEnd + 1);
  }

  function getOrigin() {
    return $(".char[" + originAttributeName + "]"); //, context);
  }

  function cleanup() {
    //exe.removeAllWithAttribute(originAttributeName);
    getOrigin().removeAttr(originAttributeName);
    removeVisualBlockClass();
  }

  function removeVisualBlockClass() {
    $('.visual_block_char').removeClass('visual_block_char');
  }

  function update_visual_view() {
    removeVisualBlockClass();

    var origin = getOrigin();

    if(origin.length === 0)
      return;

    var bound = getBoundaries(origin);
    var $selectedLines = getSelectedLines(bound);

    $selectedLines.each(function() {
      var $line = $(this);

      exe.charsInLine($line)
         .slice(bound.colStart, bound.colEnd + 1)
         .addClass('visual_block_char');
    });
  }

  register('ctrl-v', vim_set_visual_block_mode);
}
