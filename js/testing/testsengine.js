function create_VIM_TESTENGINE(interpreter, doc, messager, delayBetweenTests) {
  var G = VIM_GENERIC;
  var environment = interpreter.environment;
  var executor = interpreter.environment.executor;
  var testview = create_VIM_TESTVIEW(messager);

  var succeededTests = 0;
  var failedTests = 0;

  var tests = [];

  function normalizeText(text) { // a hack for problem with space
    return G.reduce('', text, function(result, char_) {
      if(G.charToInt(char_) === 160) {
        return result + ' ';
      } else return result + char_;
    });
  }

  function test(setting, keyPresses, result) {
    setup(setting);
    logKeypresses(keyPresses);
    interpreter.interpretSequence(keyPresses);
    shouldBe(result);
  }

  function logKeypresses(keyPresses) {
    var presses = G.isPrimitiveArray(keyPresses) ? keyPresses.join("") : keyPresses;
    log2(presses, 'test_keypress', "[key presses]", 'test_generic_message');
  }

  function countChars(ch, text, beforeIndex) {
    var total = 0;

    var lastIndex = 0;
    while(true) {
      lastIndex = text.indexOf(ch, lastIndex + 1);

      if(lastIndex === -1 || lastIndex >= beforeIndex)
        return total;

      total = total + 1;
    }
  }

  function setup(text) {
    log2(text, 'test_initial', '[initial]', 'test_generic_message');
    checkCursorIsSetupCorrectly(text);
    var indexOfCursorStart = text.indexOf('[');
    var cursorIndex = 1 + indexOfCursorStart; // TODO: should assert that indexOf(']') is + 2
    var amountOfLineBreakers = countChars('|', text, cursorIndex);
    var cleanText = text.replace(/\[/g, '').replace(/\]/g, ''); // removes cursor's '[' and ']'
    cleanText = cleanText.replace(/\|/g, doc.lineBreakMarker);
    executor.initializeWithText(cleanText);
    executor.changeCursorToIndex(cursorIndex - 1 - amountOfLineBreakers); // -1 because [ before cursor was moved
  }

  function checkCursorIsSetupCorrectly(text) {
    var index = text.indexOf('[');
    if(index === -1) throw "Cursor start marker [ has not been set. Use [ and ] to wrap one and only one character of the setup text.";
    if(text.indexOf("[", index+1) >= 0) throw "Only one [ (cursor start) can be setup.";
    var index2 = text.indexOf(']');
    if(index2 === -1) throw "Cursor end marker ] has not been set. Use [ and ] to wrap one and only one character of the setup text.";
    if(index + 2 !== index2) throw "Cursor start marker [ and cursor end marker ] are not correctly setup. There must be only one character between them. Like foo[b]ar.";
    if(text.indexOf("]", index2+1) >= 0) throw "Only one ] (cursor end) can be setup.";
  }

  function shouldBe(expectedText) {
    var expected = normalizeText(expectedText);
    var testable = normalizeText(doc.documentAsTextWithCursorAndLineBreak('|'));

    log2(expected, 'test_expected', "[expected]", 'test_generic_message');
    log2(testable, 'test_result', "[result]", 'test_generic_message');
    
    if(expected !== testable) {
      testFailed();
    } else {
      testSucceeded();
    }
  }

  function testFailed() {
    log("Test failed.", '', 'failed');
    failedTests++;
  }

  function testSucceeded() {
    log("Test succeeded.", '', 'succeeded');
    succeededTests++;
  }

  function interpretOneCommand(code) {
    logKeypresses(code);
    interpreter.interpretOneCommand(code);
  }

  function interpretSequence(code) {
    logKeypresses(code);
    interpreter.interpretSequence(code);
  }

  function runTests() {
    if(tests.length === 0) {
      log("No tests registered!");
    } else {
      var tests_reversed = G.reverse(tests);

      var number = 1;
      
      function run_one_test() {
        var test = tests_reversed.pop();
        try {
          run(test, number);
        } catch(exception) {
          testFailed();
          consoleLog("exception", exception);
          log2(exception.name, 'failed', 'exception name', 'test_generic_message');
          log2(exception.message, 'failed', 'exception message', 'test_generic_message');
          endTest();
        }
        
        number = number + 1;

        if(tests_reversed.length > 0) {
          if(tests_reversed.length % 3 === 0)
            setTimeout(run_one_test, delayBetweenTests);
          else
            run_one_test();
        } else {
          testview.showEndResult();
        }
      }

      run_one_test();
      
      /*
      G.for_each(tests, function(test) {
        run(test);
      });*/
    }
  }

  function run(test, number) {
    testview.logStartUnit();
    log(number + ". " + test.description, '', 'test_description');
    initializeTestEnvironment();
    test.testFun();
    endTest();
  }

  function endTest() {
    testview.updateValues(succeededTests, failedTests);
    testview.updateStatisticsView();
    testview.logEndUnit();
  }

  function initializeTestEnvironment() {
    environment.setCommandMode();
    executor.initializeEmptyText();
  }

  function assertThat(text, value) {
    if(value !== true) {
      log("assert failed for: ", text, 'failed');
    } else  {
      log("assert was ok for: ", text, 'succeeded');
    }
  }

  function log2(message1, clazz, message2, clazz2) {
    testview.log2(message1, clazz, message2, clazz2);
  }

  function log(message1, message2, clazz) {
    testview.log(message1, message2, clazz);
  }

  function registerTest(description, testFun) {
    consoleLog("registering test", description);
    
    tests.push({
      'description': description,
      'testFun': testFun
    });
  }

  function consoleLog(message, message2) {
    if(typeof console !== "undefined") {
      if(message2 === undefined)
        console.log(message);
      else
        console.log(message, message2);
    }
  }

  return {
    'runTests': runTests,
    'registerTest': registerTest,
    'test': test,
    
    /* for advanced use cases */
    'assertThat': assertThat,
    'shouldBe': shouldBe,
    'setup': setup,
    'interpretOneCommand': interpretOneCommand,
    'interpretSequence': interpretSequence
  }
}
