function init_problems() {
  $('.screen_view').each(function() {
    initProblemScreen($(this));
  });
}

function initProblemScreen(context) {
  var doc = create_VIM_DOCUMENT(context);

  var messager = create_VIM_MESSAGER();
  var context_help = create_VIM_CONTEXT_HELP(context);
  var executor = create_VIM_EXECUTOR(doc, context);
  var interpreter = create_VIM_INTERPRETER(doc, executor, context_help, messager);
  var view = create_VIM_VIEW(interpreter.environment, messager, context);

  var searchCommands = create_VIM_SEARCH_COMMANDS(interpreter.environment, messager);
  var timesCommansd = create_VIM_TIMESCOMMANDS(interpreter.environment, messager);
  create_VIM_COMMANDS(interpreter.environment, timesCommansd);
  
  function isActiveContext() { return context.hasClass('active_context'); }

  create_VIM_EVENTLISTENER(interpreter.interpretOneCommand, interpreter.environment, messager, isActiveContext);
  create_VIM_CURSOR_BLINKING(context, 700, messager).blink();
  context.show();
}
