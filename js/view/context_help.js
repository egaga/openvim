function create_VIM_CONTEXT_HELP(context) {
  var G = VIM_GENERIC;

  function getCommandHelp(keys, description, contexthelp_key) {
    var helpElem = $('<p />', {'class': 'commandhelp'});
    var keyCombination = $('<span />', {'class': 'command_keycombination', 'text': keys});
    var commandDescription = $('<span />', {'class': 'command_description', 'text': description});
    helpElem.append(keyCombination).append(commandDescription);

    if(!!contexthelp_key)
      return helpElem.addClass("helpkey_" + contexthelp_key).addClass('conditional');
		else
      return helpElem;
	}
  
  function addCommandHelp(elem, keys, description, contexthelp_key) {
    getCommandHelp(keys, description, contexthelp_key).appendTo(elem);
  }

  function commandHelp(keys, description, contexthelp_key) {
    var commandMode = $('.command-mode', context);
    addCommandHelp(commandMode, keys, description, contexthelp_key); 
	}

  function addCommandHelps() {
    var insertMode = $('.insert-mode', context);
    
    addCommandHelp(insertMode, "Esc", "change to normal mode");
    commandHelp("i, I", "change to insert mode");
    commandHelp("h, j, k, l", "move left, down, up, right");
    commandHelp("w, b, e, ge", "move word at a time");
    commandHelp("[n][action/movement]", "do n times, e.g. 3w");
    commandHelp("x, X", "remove a character");
    commandHelp("a, A", "append");
    commandHelp("f[char]", "move to next given char in line");
    commandHelp("F[char]", "move to previous char in line");
    commandHelp("; and ,", "repeat last f or F");
    commandHelp("f[char]", "move to n:th next given char in line", "number_f_char");
    commandHelp("/yourtext and then: n, N", "Search text");
    commandHelp("d[movement]", "delete by giving movement");
    commandHelp("r[char]", "replaces character below cursor");
    commandHelp("0, $", "move to start/end of line");
    commandHelp("o, O", "add new line");
    commandHelp("%", "Goto corresponding parentheses");
//    commandHelp("[( or ])", "Goto next/previous parentheses");
    commandHelp("ci[movement]", "change inside of given movement");
    commandHelp("D", "delete to end of line");
    commandHelp("S", "clear current line; to insert mode");
    commandHelp("g", "move to the start of buffer", "g");
    commandHelp("e", "move to end of previous word", "ge");
    commandHelp("gg / G", "move to start / end of buffer");
    commandHelp("G or [number]G", "move to line", "goto_line_g");
    commandHelp("d", "the whole line", "dd");
    commandHelp("$", "the rest of the line", "end_of_line");
    commandHelp("0", "the beginning of line to here", "start_of_line");
    commandHelp("w", "to the beginning of next word", "w");
    commandHelp("e", "to the end of current word", "e");
    commandHelp("b", "to the beginning of current word", "b");
    commandHelp("h, j, k, l", "left, down, up, right", "hjkl");
    commandHelp("[n][movement]", "movement n times", "num_movement");
    commandHelp("[char]", "single character", "char");
    commandHelp("[movement]", "movement, e.g. j", "movement");
    commandHelp("yy", "copy current line");
    commandHelp("y", "copy current line", "copy_line");
    commandHelp("p", "Paste copied text after cursor.");
    commandHelp("i[YourText]", "Repeats inserted text", "repeat_insert");
    commandHelp("ESC", "cancel action/movement", "chained"); 
    show_help();
	}

  function set_help(contexthelp_keys, chainedActions) {
    $('.commandhelp', context).hide();
    G.for_each(contexthelp_keys, function(key) {
      $('.commandhelp.helpkey_' + key, context).show();
    });
 
    showChainedActions(chainedActions);   
	}

  function showChainedActions(chainedActions) {
     var result = "";
     G.for_each(chainedActions, function(action) {
       result += action + " ";
    });

    result = $.trim(result); 
    $('.context_pressed', context).text(result);
  } 

  
  function show_help() { 
    $('.context_pressed', context).text('');
    $('.commandhelp', context).show();
    $('.commandhelp.conditional', context).hide();
  }

  return {
    'initialize': addCommandHelps,
    'show_help': show_help,
    'set_help': set_help
  };
}
