function create_VIM_TIMESCOMMANDS(environment, messager) {
  var G = VIM_GENERIC;
  var exe = environment.executor;
  var env = environment;

  function register(key, fun) { env.registerCommand(key, fun); }
  function cursor() { return exe.cursor(); }
  
  function movementCommand(input) {
    var int_ = parseInt(input, 10);

    if(!isNaN(int_)) {
      function do_move(target) {
        if(!isEmptyMovement(target) && !isDelayedMovement(target))
          exe.changeCursorTo(target.to);
      }

      env.addAction(input, createTimesAction(int_, do_move),
                ['repeat_insert', '.', 'goto_line_g', 'number_f_char', 'w', 'e', 'b', 'hjkl', "num_movement", "chained"]);
    }
  }

  function inside_target(obj, target) {
    if(target === 'w') {
      return new_movement(exe.moveToStartOfWord(obj),
                          exe.moveToEndOfWord(obj));
    } else if(target === "(") {
      return new_movement(exe.moveRight(exe.findBackwardStartingFrom("(", obj, exe.chars())),
                          exe.moveLeft(exe.findForwardStartingFrom(")", obj, exe.chars())));
    } else {
      return empty_movement;
    }
  }

  //FIXME change obj to other name, like cursor/target
  //FIXME refactor
  function move(obj, movement, times) {
    if(isDelayedMovement(movement)) return; // FIXME what to do?
    else if(movement === 'i') {
      env.setInsertMode();

      var alreadyProcessingRepeatInsert = false;

      messager.listenTo('updated_mode', function(newmode) {
          if(env.isCommandMode() && !alreadyProcessingRepeatInsert) {
            alreadyProcessingRepeatInsert = true;
            var repeatableChars = env.getInsertedCharsInLastInsertModeSession(); // need to have a reference before setting insertmode again

            env.setInsertMode();

            for(var i = 0; i < times - 1; ++i) // -1 because user enters the text once himself
              env.interpretSequence(repeatableChars);

            env.setCommandMode(); // alreadyProcessingRepeatInsert ensures that recursion is not triggered for this listener
            return messager.REMOVE_THIS_LISTENER;
          }
      });

      return empty_movement;
    } else if(movement === 'f') {
      function wait_for_input(input) {
        //TODO use continuation to support d3fa
        //return new_movement(obj, exe.findForwardStartingFrom(input, obj, exe.line(obj), times));

        var found = exe.findForwardStartingFrom(input, obj, exe.chars(exe.line(obj)), times);
        if(!!found) exe.changeCursorTo(found);
      }

      env.addAction("f", wait_for_input, ["char"]);
      return delayed_movement;
    } else if(movement.charAt(0) === 'i')
      return inside_target(obj, movement.substring(1));
    else if(movement === '.') {
      env.setCommandChainChangeIsAllowed(false);

      for(var i = 0; i < times; ++i)
        env.interpretSequence(env.getLastCommandChain());

      env.setCommandChainChangeIsAllowed(true);

      return empty_movement;
    } else if(movement === 'G') {
      var linesTotal = exe.lines().length;
      var index = times + 1 > linesTotal ? linesTotal - 1 : times - 1;

      exe.changeCursorTo(exe.moveToStartOfLine(exe.lineByIndex(index)));
      return empty_movement;
    } else if(movement === 'h') {
      return new_movement(obj, exe.moveLeft(obj, times - 1));
    } else if(movement === 'l') {
      return new_movement(obj, exe.moveRight(obj, times));
    } else if(movement === 'j') {
      var from = exe.moveToStartOfLine(obj);
      var to = exe.moveToEndOfLine(exe.moveDown(obj, times));
      return new_movement(from, to);
    } else if(movement === 'k') {
      var from = exe.moveToEndOfLine(obj);
      var to = exe.moveToStartOfLine(exe.moveUp(obj, times));
      return new_movement(from, to);
    } else if(movement === 'w') {
      var to = exe.moveToStartOfNextWord(obj, times);

      if(to.lastPossible !== undefined) {
        // because lastPossible is defined, we couldn't reach the next word
        var inclusiveAtEnd = true;
        var toObj = to.lastPossible;
      } else {
        var inclusiveAtEnd = false;
        var toObj = to;
      }

      return new_movement(obj, toObj, true, inclusiveAtEnd);
    } else if(movement === 'e') {
      var to = exe.moveToEndOfWord(obj, times);
      return new_movement(obj, to);
    } else if(movement === 'b') {
      var from = exe.moveLeft(obj);
      var to = exe.moveToStartOfWord(obj, times);
      return new_movement(from, to);
    } else {
      return empty_movement;
      //return obj;
    }
  }

  var empty_movement = {};
  var delayed_movement = 'delayed_movement';

  function isDelayedMovement(obj) { return obj === delayed_movement; }
  function isEmptyMovement(obj) { return obj === empty_movement; }

  function new_movement(from, to, inclusiveFrom, inclusiveTo) {
    inclusiveFrom = inclusiveFrom !== undefined ? inclusiveFrom : true;
    inclusiveTo = inclusiveTo !== undefined ? inclusiveTo : true;

    return {
      'from': from,
      'to': to,
      'inclusiveFrom': inclusiveFrom,
      'inclusiveTo': inclusiveTo
    }
  }

  function asNumber(value) { return parseInt(value, 10); }

  function createTimesAction(times, continuation) {
    function movementWaitingAction(movement) {
      if(isNumber(movement)) {
        // number chaining "95" => 9*10 + 5 = 95
        var num = asNumber(movement);
        var action = createTimesAction(10 * times + num, continuation);
        env.addAction(movement, action, ['repeat_insert', 'goto_line_g', '.', 'number_f_char', 'w', 'e', 'b', 'num_movement', 'hjkl', 'chained']);
      } else {
        continuation(move(cursor(), movement, times));
      }
    }

    return movementWaitingAction;
  }

  function isNumber(value) {
    var num = parseInt(value, 10);
    return !isNaN(num) && num >= 0 && num <= 9;
  }

  function toTheEndOfLine(input) { return input === "$"; }
  function toTheStartOfLine(input) { return input === "0"; }

  function doActionFor(target, continuation) {
    if(toTheEndOfLine(target)) {
      exe.removeStartingFrom(exe.currentColumnIndex());
    } else if(toTheStartOfLine(target)) {
      var from = exe.moveToStartOfLine(cursor());
      exe.removeBetween(from, exe.moveLeft(cursor()));
    } else {
      var amount = parseInt(target, 10);
      if(!isNaN(amount) && amount >= 1 && amount <= 9) {
        env.addAction(target, createTimesAction(amount, continuation), '.',
                                               ['repeat_insert', 'goto_line_g', 'number_f_char', 'w', 'e', 'b', 'num_movement', 'hjkl', 'chained']);
      } else {
        var m = move(cursor(), target, 1);
        if(!isDelayedMovement(m) && !isEmptyMovement(m)) {
          exe.removeBetween(m.from, m.to, m.inclusiveFrom, m.inclusiveTo);
        } else {
          // nothing to do?
        }
      }
    }
  }

  function applyActionTo(target, action) {
    // should test whether supported by action?
    var m = move(cursor(), target, 1);
    action(m);
  }


  /**
   * Register
   */
  G.for_each([1, 2, 3, 4, 5, 6, 7, 8, 9], function(number) {
    register(number, function() { movementCommand(number); })
  });

  return {
    'doActionFor': doActionFor,
    'applyActionTo': applyActionTo,
    'isEmptyMovement': isEmptyMovement
  }
}