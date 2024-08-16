function create_VIM_INTERPRETER(doc, executor, context_help, messager) {
  var G = VIM_GENERIC;

  var environment = {
    'getInsertedCharsInLastInsertModeSession': function() { return insertedCharsInLastInsertModeSession },
    'addedInsertModeChar': addedInsertModeChar,
    'removedInsertModeChar': removedInsertModeChar,
    'setMark': setMark,
    'getMark': getMark,
    'getMode': getMode,
    'setMode': setMode,
    'registerCommand': registerCommand,
    'registerInsertModeCommand': registerInsertModeCommand,
    'addAction': addAction,
    'isInsertableCharacter': isInsertableCharacter,
    'executor': executor,
    'setInsertMode': setInsertMode,
    'setCommandMode': setCommandMode,
    'isCommandMode': isCommandMode,
    'isInsertMode': isInsertMode,
    'getLastCommandChain': getLastCommandChain,
    'interpretOneCommand': interpretOneCommand,
    'interpretSequence': interpretSequence,
    'saveToRegister': saveToRegister,
    'loadFromRegister': loadFromRegister,
    'reset': reset,
    'undo': undo,
    'startMacroRecording': startMacroRecording,
    'endMacroRecording': endMacroRecording,
    'playMacro': playMacro,
    'isRecordingMacro': function() { return isRecordingMacro; },
    'setCommandChainChangeIsAllowed': function(allowed) { commandChainChangeIsAllowed = allowed; }
  };

  function addedInsertModeChar(character) {
    insertedCharsInLastInsertModeSession.push(character);
  }

  function removedInsertModeChar() {
      if(insertedCharsInLastInsertModeSession.length > 0)
        insertedCharsInLastInsertModeSession.pop();
  }

  function getMode() { return mode; }
  function setMode(newMode) {
    if(newMode !== insertMode && newMode !== commandMode) throw "Mode " + mode + " is not supported!";
    mode = newMode;
  }

  function getMark(markKey) { return marks[markKey]; }
  function setMark(markKey, value) { marks[markKey] = value; }

  function reset() { executor.initializeEmptyText(); }
  var commandChainChangeIsAllowed = true; // XXX: ugly special case for repeat

  var insertedCharsInLastInsertModeSession = [];
  var marks = {};
  var register = {};
  var lastState = executor.copyContent();
  var macroRegister = {}
  var lastMacroRecording = [];

  var isRecordingMacro = false;
  var lastMacroKey;
  
  function startMacroRecording(macroKey) {
    lastMacroKey = macroKey;
    lastMacroRecording = [];
    isRecordingMacro = true;
  }
  
  function playMacro(macroKey) {
    var macro = macroRegister[macroKey];

    if(!!macro) {
      G.for_each(macro, function(command) {
        if(command !== "q")
          interpretSequence(command);
      });
    }
  }

  function endMacroRecording() {
    isRecordingMacro = false;
    macroRegister[lastMacroKey] = lastMacroRecording;
    lastMacroKey = undefined;
  }

  function undo() { executor.setContent(lastState); } // TODO: state related

  function saveToRegister(obj) {
    register['anonymous'] = obj;
  }

  function loadFromRegister() {
    var result = register['anonymous'];
    return !!result ? executor.copy(result) : false;
  }
  
  var commandMode = "command";
  var insertMode = "insert";

  var mode = commandMode;

  var actions = []; // delayed action, needs e.g. a movement or text-objects
  var chainedActions = []; // names of the actions in current chain
  var commands = {}; // command mode commands
  var insertModeCommands = {}; // these are rare in practice

  var lastCommandChain = [];
  var currentCommandChain = [];

  function registerCommand(command_key, command_fun) {
    registerCommandPrivate(commands, command_key, command_fun);
  }

  function registerInsertModeCommand(command_key, command_fun) {
    registerCommandPrivate(insertModeCommands, command_key, command_fun);
  }

  function registerCommandPrivate(command_map, command_key, command_fun) {
    if(command_map[command_key] === undefined) {
      command_map[command_key] = command_fun;
    } else {
      throw "command registered already for key: " + command_key;
    }
  }

  function setMode(newmode) {
    if(newmode === insertMode)
      setInsertMode();
    else if(newmode === commandMode)
      setCommandMode();
  }

  function setInsertMode() {
    insertedCharsInLastInsertModeSession = []; // TODO: as a listener?
    mode = insertMode;
    messager.sendMessage("updated_mode", insertMode);
  }
  
  function setCommandMode() {
    executor.removeAllWithAttribute('appendable'); // XXX special case for appending, TODO get rid of if possible
    mode = commandMode;

    messager.sendMessage("updated_mode", commandMode);
  }
  
  function isCommandMode() { return mode === commandMode; }
  function isInsertMode() { return mode === insertMode; }

  function interpretSequence(sequenceOfInputs) {
    G.for_each(sequenceOfInputs, function(input) {
      saveCurrentState(input);
      interpret(input);
    });
  }

  function interpretOneCommand(input) {
    saveCurrentState(input);
    interpret(input);
  }
  
  function saveCurrentState(input) {
    if(input !== 'u') //XXX ugly special case
      lastState = executor.copyContent();
  }

  function isRepeat(input) { return input === '.'; } //XXX ugly special case

  function pushToCommandChain(input) {
    if(commandChainChangeIsAllowed)
      currentCommandChain.push(input);
  }

  function interpret(input) {
    messager.sendMessage('interpret_code', input);
    executor.updatePreviousCursor();

    if(isRecordingMacro)
      lastMacroRecording.push(input);
    
    if(actions.length > 0) {
      pushToCommandChain(input);
      context_help.show_help();
      do_chained_action(input);
    } else if(isCommandMode()) {
      if(!isRepeat(input)) {
        pushToCommandChain(input);
      }
      
      interpret_command(input);

      if(chainedActions.length === 0)
        resetCommandChainHistory();
    } else {
      interpret_insert(input);
    }
    
    messager.sendMessage("interpreter_interpreted", input);
  }

  function resetCommandChainHistory() {
    if(!commandChainChangeIsAllowed) return;
    
    if(currentCommandChain.length > 0)
      lastCommandChain = currentCommandChain;
    
    currentCommandChain = [];
  }

  function interpret_command(input) {
    var fun = commands[input];

    if(fun !== undefined) fun();    
  }

  function interpret_insert(input) {
    var command = insertModeCommands[input];
    if(command !== undefined) command();
    else if(isInsertableCharacter(input)) {
      addedInsertModeChar(input);
      insertChar(input);
    }
  }

  function insertChar(ch) {
    executor.insertCharBefore(ch, executor.cursor());
  }

  function isInsertableCharacter(code) {
    return !G.existsIn(code, ["Esc", "Backspace"]) &&
           ((code >= '0' && code <= '9') ||
           (code >= 'a' && code <= 'z') || 
           (code >= 'A' && code <= 'Z') ||
           G.existsIn(code, [".", '!', '/', '?', '(', ')', '@', '#', '€', '$', '%', '&', '{', '}', '+', '-', '*', '<', '>',
                             '|', ',', ':', ';', '_', '^', '~', '\"', '£', '½', "'"]));
  }  
  
  function do_chained_action(input) {
    var action = actions.pop();
    action(input);
    // if actions(input) doesn't add new action, we can reset
    if(actions.length === 0) {
      chainedActions = [];
      resetCommandChainHistory();
    }
  }

  function addAction(name, fun, contexthelp_keys) {
    chainedActions.push(name);
    actions.push(fun);
    if(!!contexthelp_keys)
      context_help.set_help(contexthelp_keys, chainedActions);
  }
    
  function getLastCommandChain() { return G.copy_array(lastCommandChain); }

  $(function() {
    $('.text').focus();
    //comparison.compare();
    context_help.initialize();
    messager.sendMessage("interpreter_initialized");
  });
  
  return {
    'interpretOneCommand': interpretOneCommand,
    'interpretSequence': interpretSequence,
    'is_insert_mode': isInsertMode,
    'environment': environment
  }
}
