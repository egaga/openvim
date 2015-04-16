function init_testing() {
  runTests('.testview');
}

function runTests(context) {
  var delayBetweenTests = 0;

  var doc = create_VIM_DOCUMENT(context);

  var context_help = create_VIM_CONTEXT_HELP(context);
  var messager = create_VIM_MESSAGER();
  var executor = create_VIM_EXECUTOR(doc, context);
  var interpreter = create_VIM_INTERPRETER(doc, executor, context_help, messager);

  create_VIM_VISUAL_COMMANDS(interpreter.environment, messager, doc);
  create_VIM_VISUALBLOCK_COMMANDS(interpreter.environment, messager, doc);
  create_VIM_SEARCH_COMMANDS(interpreter.environment, messager);

  var timesCommansd = create_VIM_TIMESCOMMANDS(interpreter.environment, messager);
  create_VIM_COMMANDS(interpreter.environment, timesCommansd);

  var testengine = create_VIM_TESTENGINE(interpreter, doc, messager, delayBetweenTests, context);
  create_VIM_TESTS(interpreter, testengine);

  testengine.runTests();
}

