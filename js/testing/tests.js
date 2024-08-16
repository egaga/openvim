function create_VIM_TESTS(interpreter, testengine) {
  var G = VIM_GENERIC;
  var environment = interpreter.environment;

  /*****************************
  Helper functions
  ******************************/
  
  var setup = testengine.setup;
  var interpretSequence = testengine.interpretSequence;
  var interpretOneCommand = testengine.interpretOneCommand;
  var shouldBe = testengine.shouldBe;
  var assertThat = testengine.assertThat;

  function registerBasic(description, setup, keyPresses, shouldBe) {
    register(description, function() {
      test(setup, keyPresses, shouldBe);
    });
  }

  function test(setup, keyPresses, shouldBe) { testengine.test(setup, keyPresses, shouldBe); }
  function register(description, testFun) { testengine.registerTest(description, testFun); }

  /*****************************
  Tests
  ******************************/

  register("Visual mode: yank and paste a word", function() {
    setup("Hello, [t]his is really nice.");
    interpretSequence("vw"); // visually select a word
    shouldBe("Hello, this [i]s really nice.");
    interpretSequence("y"); // yank
    shouldBe("Hello, [t]his is really nice."); // after yanking cursor should be back to original location
    interpretSequence("2w");
    shouldBe("Hello, this is [r]eally nice.");
    interpretSequence("p"); // paste
    shouldBe("Hello, this is rthis [i]eally nice");
  });

  register("Visual mode: yank and paste more than a line", function() {
    setup("He[l]lo, this is|really nice.");
    interpretSequence("vj"); // visually select a word
    shouldBe("Hello, this is|re[a]lly nice.");
    interpretSequence("y"); // yank
    shouldBe("He[l]lo, this is|really nice."); // after yanking cursor should be back to original location
    interpretSequence("p"); // paste
    shouldBe("He[l]llo, this is|realo, this is|really nice.");
  });

  registerBasic("Visual mode: delete word",
                "Hello, [t]his is really nice.",
                "vwd",
                "Hello, [s] really nice."); // notice: the start of the word is removed also

  registerBasic("Visual mode: delete two words",
                "Hello, [t]his is really nice.",
                "vwwd",
                "Hello, [e]ally nice.");

  registerBasic("Visual mode: find until next 'n' and delete",
                "Hello, [t]his is really nice.",
                "vfnd",
                "Hello, [n]ice.");

  register("Visual block mode: add prefix for lines", function() {
    setup("Zero|[F]irst|Second|Third|Fourth");
    interpretOneCommand("ctrl-v"); // set visual block mode
    interpretSequence("jj"); // go down two lines
    interpretOneCommand("I"); // insert before block
    interpretSequence(["-", "Space"]); // characters to insert before all selected lines
    interpretOneCommand("Esc");

    shouldBe("Zero|[-] First|- Second|- Third|Fourth");
  });

  register("Visual block mode: advanced movement is allowed", function() {
    setup("Zero|First|Second|[T]hird|Fourth");
    interpretOneCommand("ctrl-v"); // set visual block mode
    interpretSequence("bjj"); // go left and down two lines
    interpretOneCommand("I"); // insert before block
    interpretSequence(["-", "Space"]); // characters to insert before all selected lines
    interpretOneCommand("Esc");

    shouldBe("Zero|First|[-] Second|- Third|Fourth");
  });

  register("Visual block mode: add text to the end of lines", function() {
	  setup("Zero|Firs[t]|SecondLongIsThis|Third|Fourth");
    interpretOneCommand("ctrl-v"); // set visual block mode
    interpretSequence("jj"); // go down two lines
	  interpretOneCommand("$"); // insert at the end of each line (does not care about columns)
    interpretSequence("?!"); // characters to insert after all selected lines
    interpretOneCommand("Esc");

    shouldBe("Zero|[F]irst?!|- SecondLongIsThis?!|- Third?!|Fourth?!");
  });

  register("Visual block mode: add text after block", function() {
	  setup("Zero|12[3]|1|12345|Fourth");
    interpretOneCommand("ctrl-v"); // set visual block mode
    interpretSequence("jj"); // go down two lines
	  interpretOneCommand("A"); // insert at the end of each line (does not care about columns)
    interpretSequence("?!"); // characters to insert after all selected lines
    interpretOneCommand("Esc");

    shouldBe("Zero|[1]23?!|- 1  ?!|- 123?!45|Fourth?!");
  });

  register("Insert 3 times given text", function() {
    setup("Fooba[r]?");
    interpretSequence(["3", "i", "Hey!"]);
    interpretOneCommand("Esc");
    shouldBe("FoobaHey!Hey!Hey![r]?");
  });

  register("Repeating insert goes back to command mode", function() {
    setup("a[b]c");
    interpretSequence(["3", "i", "d"]);
    interpretOneCommand("Esc");

    assertThat("Is in command mode", environment.isCommandMode());
  });

  register("Repeat last find with ;", function() {
    setup("[T]his is a nice sentence.");
    interpretSequence("fs");
    shouldBe("Thi[s] is a nice sentence."); // ensure testing condition

    interpretOneCommand(";"); // repeat find
    shouldBe("This i[s] a nice sentence.");
    interpretOneCommand(";"); // repeat find
    shouldBe("This is a nice [s]entence.");
  });

  register("Repeat last find in opposite direction", function() {
    setup("[T]his is a nice sentence.");
    interpretSequence("fsfsfs");
    shouldBe("This is a nice [s]entence."); // ensure testing condition

    interpretOneCommand(","); // repeat find in opposite direction
    shouldBe("This i[s] a nice sentence.");
    interpretOneCommand(","); // repeat find in opposite direction
    shouldBe("Thi[s] is a nice sentence.");
  });

    register("Repeat last backward find", function() {
      setup("This is a nice sentenc[e].");
      interpretSequence("Fs");
      shouldBe("This is a nice [s]entence."); // ensure testing condition

      interpretOneCommand(";"); // repeat backward find
      shouldBe("This i[s] a nice sentence.");
      interpretOneCommand(";"); // repeat backward find
      shouldBe("Thi[s] is a nice sentence.");
    });

    register("Repeat last backward find in opposite direction", function() {
      setup("This [i]s a nice sentence.");
      interpretSequence("Fs");
      shouldBe("Thi[s] is a nice sentence."); // ensure testing condition

      interpretOneCommand(","); // repeat backward find in opposite direction
      shouldBe("This i[s] a nice sentence.");
      interpretOneCommand(","); // repeat backward find in opposite direction
      shouldBe("This is a nice [s]entence.");
    });

  register("Search for pattern, case: simple text", function() {
        setup("h[e]llo. what is up. what is?");
        interpretOneCommand("/"); // there will be search of something 
        interpretSequence("what"); // text to be found
        interpretOneCommand("Enter"); // first occurrence is searched 
        
        shouldBe("hello. [w]hat is up. what is?");
        interpretOneCommand("n"); // move to next occurrence
        shouldBe("hello. what is up. [w]hat is?");

        interpretOneCommand("N"); // move to previous occurrence
        shouldBe("hello. [w]hat is up. what is?");
  });

  register("Search for pattern, two words (tests space)", function() {
        setup("h[e]llo. what is up. what is?");
        interpretOneCommand("/"); // there will be search of something 
        interpretSequence("what is"); // text to be found
        interpretOneCommand("Enter"); // first occurrence is searched 
        
        shouldBe("hello. [w]hat is up. what is?");
        interpretOneCommand("n"); // move to next occurrence
        shouldBe("hello. what is up. [w]hat is?");

        interpretOneCommand("N"); // move to previous occurrence
        shouldBe("hello. [w]hat is up. what is?");
  });

  registerBasic("Goto previous word's last character",
                "This is not n[i]ce",
                "ge",
                "This is no[t] nice");

  registerBasic("Go to start of current word if no previous word",
                "Th[i]s is",
                "ge",
                "[T]his is");

  registerBasic("Goto previous word's last character, start from first character",
                "This is not [n]ice",
                "ge",
                "This is no[t] nice");

  registerBasic("Goto next )",
                "He[r]e|is ), right.",
                "])",
                "Here|is [)], right.");

  registerBasic("Goto previous (",
                "Here is a(b,|ri[g]ht.",
                "[(",
                "Here is a[(]b,|right.");

  registerBasic("Goto next }",
                "He[r]e is }, right.",
                "]}",
                "Here is [}], right.");

  registerBasic("Goto first non-blank character in current line and set to insert mode",
                "  Hey, this is c[o]ol.",
                "I",
                "  [H]ey, this is cool.");

  registerBasic("Line starts with non-blank character",
                 "Hey, nic[e]",
                 "I",
                 "[H]ey, nice");
   
  registerBasic("If there is not a non-blank character in the line, go to the end",
                " [ ]     ",
                "I",
                "      [ ]");
  register("I goes to insert mode", function() {
     setup("Foo[b]ar");
     interpretOneCommand("I");
     assertThat("In insert mode", environment.isInsertMode());
  });

   register("mark position with ma, and go to it with `a", function() {
  	    setup("Hi the[r]e. This is great.");
        interpretSequence("ma");
        interpretOneCommand("$"); // goto the end of the line
        interpretSequence("mb"); // another mark for making sure there can be more than one
        shouldBe("Hi there. This is great[.]"); // just makes sure that testing has correct assumption 

        interpretSequence("`a"); // go to exact location marked by a
        shouldBe("Hi the[r]e. This is great.");

        interpretSequence("`b"); // go to exact location marked by b
        shouldBe("Hi there. This is great[.]");

	      interpretSequence("db0"); // let's delete a bit so that mark b cannot be found, and go to start of line
        shouldBe("[H]i there. This is ."); // just make sure delete and moving worked
        interpretSequence("`b"); // cannot go to exact location but goes as far as it is possible
        shouldBe("Hi there. This is [.]");
  });

   register("mark and goto start of that line with 'a", function() {
  	    setup("First|Hi the[r]e.|This is great.");
        interpretSequence("ma");
        interpretSequence("gg"); // goto the start of text
  	    shouldBe("[F]irst|Hi there.|This is great."); // only ensures test assumption is correct
        //interpretSequence("2G"); // go to line marked by a

        interpretSequence("\'a"); // go to line marked by a
  	    shouldBe("First|[H]i there.|This is great.");
  });

  registerBasic("Clear current line",
   		"First line|Current [l]ine|Third line",
		"S",
		"First line|[ ]|Third line");

  registerBasic("Clear empty text",
                "[ ]",
                "S",
                "[ ]");

  register("S goes to insert mode", function() {
        setup("Setu[p].");
  	    interpretOneCommand("S");
 	      assertThat("In insert mode", environment.isInsertMode());
  });

  registerBasic("Goto next word, ignore punctuation",
		            "Hel[l]o, what's up.",
  		          "W",
                "Hello, [w]hat's up.");

  registerBasic("Goto previous word, ignore punctuation",
                "Hello, [w]hat's up.",
                "B",
                "Hell[o], what's up.");

  registerBasic("Goto end of word, ignore punctuation",
                "He[l]lo, nice.",
                "E",
                "Hello[,] nice.");
  
  registerBasic("Goto first non-blank character in current line",
                "  Hey, this is [c]ool.",
                "^",
                "  [H]ey, this is cool.");

  registerBasic("Remove the only word, cursor at the beginning",
                "[a]bc",
                "dw",
                "[ ]"); // TODO test also that the empty char is appendable

  registerBasic("Remove the only word, cursor at second char",
                "a[b]c",
                "dw",
                "[a]");

  register("Enter moves rest of the line to the next line, cursor at space between two words", function() {
     setup("F[ ]oobar hello");
     environment.setInsertMode();
     environment.interpretOneCommand("Enter");
     shouldBe("F|[ ]oobar hello");
  });

  register("Enter moves rest of the line to the next line, cursor in middle of text", function() {
    setup("Foo[b]ar");
    environment.setInsertMode();
    environment.interpretOneCommand("Enter");
    shouldBe("Foo|[b]ar");
  });

  registerBasic("Go to corresponding (, skipping one",
                "Foo ( bar ( | zet ) [)]",
                "%",
                "Foo [(] bar ( | zet ) )");

  registerBasic("Go to corresponding ), skipping one )",
                "Foo bar [(] ( ) )",
                "%",
                "Foo bar ( ( ) [)]");

  registerBasic("Go to corresponding )",
                "Foo bar [(] )",
                "%",
                "Foo bar ( [)]");

  registerBasic("Go to corresponding {",
                "Foo bar { ( ) [}]",
                "%",
                "Foo bar [{] ( ) }");

  registerBasic("Go to corresponding }",
                "Foo bar [{] ( ) }",
                "%",
                "Foo bar { ( ) [}]");

  register("Undo restores the state before last command", function() {
    var original = "[a]bc";
    setup(original);
    interpretSequence("de");
    shouldBe("[ ]"); // prerequisite before actual undo test
    interpretSequence("u");
    shouldBe(original);
  });

  register("Macro recording and replaying", function() {
    setup("[f]oobar taaperi lamppu sumppi");
    interpretSequence("q");
    interpretSequence("a");
    assertThat("is recording", environment.isRecordingMacro());
    interpretSequence("w");
    interpretSequence("q");

    assertThat("is not recording macro", !environment.isRecordingMacro());
    assertThat("is in command mode", environment.isCommandMode());
    interpretSequence("0"); // for testing purposes go to start of line
    interpretSequence("@a@a@a");
    assertThat("is in command mode", environment.isCommandMode());
    shouldBe("foobar taaperi lamppu [s]umppi");
  });
  
  registerBasic("Trying to delete downwards more lines than there is won't break things",
                "first|s[e]cond|third",
                "d9j",
                "[f]irst");
  
  registerBasic("Go to line number 3",
                "F[i]rst|second|third|fourth",
                "3G",
                "First|second|[t]hird|fourth");

  registerBasic("If line number too large, go to last line",
                "[F]irst|second|third|fourth",
                "22G",
                "First|second|third|[f]ourth");

  registerBasic("Repeat command 3 times",
                 "Fo[o] bar cue dumdi right",
                 "w3.", //FIXME: actually Vim does not let repeat movements
                 "Foo bar cue dumdi [r]ight");

  registerBasic("Repeat command: w",
                 "Fo[o] bar cue right",
                 "w..", //FIXME: actually Vim does not let repeat movements
                 "Foo bar cue [r]ight");

  registerBasic("Repeat delete word",
                 "Fo[o] bar cue right",
                 "de.",
                 "Fo[ ]right");

  registerBasic("Trying to delete upwards more lines than there is won't break things",
                "first|second|th[i]rd|fourth",
                "d9k",
                "[f]ourth");


  registerBasic("Trying to delete downwards all existing lines",
                "fi[r]st|second|third",
                "d9j",
                "[ ]");

  registerBasic("Trying to delete upwards all existing lines",
                "first|second|t[h]ird",
                "d9k",
                "[ ]");

  registerBasic("Delete starting from cursor, maximum of 2 words, to the right",
                "one t[w]o three four",
                "d2w",
                "one t[f]our");
  
  registerBasic("Delete three lines upwards",
                "first|second|third|fo[u]rth|fifth",
                "d2k",
                "first|[f]ifth");

  registerBasic("Delete two lines upwards",
                "first|second|th[i]rd|fourth",
                "dk",
                "first|[f]ourth");

  registerBasic("Delete two lines downwards",
                "fir[s]t|second|third|fourth",
                "dj",
                "[t]hird|fourth");

  registerBasic("Delete three lines downwards",
                "fir[s]t|second|third|fourth|fifth",
                "d2j",
                "[f]ourth|fifth");

  registerBasic("Find the 3rd occurrence of a",
           "Fo[o] bar har nar",
           "3fa",
           "Foo bar har n[a]r");


  registerBasic("A jump of a couple of words",
                "H[e]llo this is fun, yea?",
                "3w",
                "Hello this is [f]un, yea?");

  register("Enter should create a new line in insert mode", function() {
    setup("Fooba[r]");
    environment.setInsertMode();
    environment.interpretOneCommand("Enter");
    shouldBe("Fooba|[r]");
  });

  registerBasic("w moves cursor to next word's first character",
               "[h]ello world!",
               "w",
               "hello [w]orld!");
  registerBasic("b moves cursor backwards, to the beginning of a word",
                "hello wo[r]ld",
                "b",
                "hello [w]orld");
  registerBasic("b moves cursor backwards, to the beginning of the previous word",
                "hello [w]orld",
                "b",
                "[h]ello world");
  registerBasic("e moves cursor forward, to the end of a word",
                "he[l]lo world",
                "e",
                "hell[o] world");

  registerBasic("e moves cursor forward, to the end of the next word",
                "hell[o] world",
                "e",
                "hello worl[d]");

  register("i sets insert mode", function() {
    interpretOneCommand("i");
    assertThat("insert mode", environment.isInsertMode());
  });

  register("i does not change text when in command mode", function() {
    var document = "bl[a]h";
    test(document, "i", document);
  });

  register("key press writes text in insert mode", function() {
    environment.setInsertMode();
    test(
         "ab[c]",
         "t",
         "abt[c]");
  });

  register("Insert at the beginning of a line", function() {
    setup("Not this|Foobar is [r].");
    interpretOneCommand("I");
    shouldBe("Not this|[F]oobar is r.");
    assertThat("Insert mode", environment.isInsertMode());
  });

  register("x removes character under cursor", function() {
    test(
        "foo[b]ar",
         "x",
         "foo[a]r");

    test(
        "fooba[r]",
        "x",
        "foob[a]");

    test("[ ]",
         "x",
         "[ ]");
  });

  registerBasic("h moves cursor one character to left",
                "foo[b]ar",
                "h",
                "fo[o]bar");

  registerBasic("l moves cursor one character to right",
                "foo[b]ar",
                "l",
                "foob[a]r");

  registerBasic("2l moves cursor two (2) characters to right",
                "foo[b]ar",
                "2l",
                "fooba[r]");

  registerBasic("if l movement is greater than area in which it can move, stop",
                "foo[b]ar",
                "3l",
                "fooba[r]");

  registerBasic("delete starting from cursor, maximum of 2 words, to the right",
                "first foo[b]ar barfoo last",
                "d2e",
                "first foo[ ]last");

  registerBasic("Find next given character",
                "f[i]nd the char4cter",
                "f4",
                "find the char[4]cter"
  );

  register("find backwards with F", function() {
    setup("find the ch4racter, backwar[d]s");
    interpretOneCommand("F"); // FIXME shouldn't need to do use non-Sequential interpret function
    interpretOneCommand("4");
    shouldBe("find the ch[4]racter, backwards");
  });

  registerBasic("Replace character under cursor",
                "h[e]llo",
                "ra",
                "h[a]llo");

  registerBasic("Delete starting from cursor (but exclude), max two words, to the left",
                "foo bar z[i]p zap",
                "d2b",
                "foo [i]p zap");

  registerBasic("Go to the start of line.",
                "This is a se[n]tence.",
                "0",
                "[T]his is a sentence.");

  registerBasic("Go to the end of line",
                "This [i]s a sentence.",
                "$",
                "This is a sentence[.]");

  registerBasic("Delete current line",
                "First line|Second [l]ine|Third line",
                "dd",
                "First line|[T]hird line");

  registerBasic("Go to the start of buffer",
                "First line|Second [l]ine",
                "gg",
                "[F]irst line|Second line");

  register("Go to the end of buffer", function() {
    setup("First li[n]e|Second line");
    interpretOneCommand("G");
    shouldBe("First line|Second lin[e]");
  });

  registerBasic("Change inside word",
                "Hello, D[o]rian Gray!",
                "ciwMaster",
                "Hello, Master[ ]Gray!");

  registerBasic("Change inside parentheses",
                "Hello, (cr[i]es) it is a nice day!",
                "ci(smiles",
                "Hello, (smiles[)] it is a nice day!");

  registerBasic("Repeat command: w",
                "Fo[o] bar cue",
                "w.",
                "Foo bar [c]ue");

  registerBasic("Repeat command: f",
                "F[o]o bar cue all",
                "fa.",
                "Foo bar cue [a]ll");

  registerBasic("Repeat command: dd",
                "First|Sec[o]nd|Third",
                "dd.",
                "Firs[t]");

  register("Insert after cursor, stay in insert mode", function() {
    setup("F[o]o is bar");
    interpretOneCommand("a"); // FIXME shouldn't need to do use non-Sequential interpret function
    shouldBe("Fo[o] is bar");
    assertThat("Insert mode", environment.isInsertMode());
  });

  register("Insert after cursor, back to command mode", function() {
    setup("F[o]o is bar");
    interpretOneCommand("a"); // FIXME shouldn't need to do use non-Sequential interpret function
    assertThat("Insert mode", environment.isInsertMode());
    interpretSequence("t");
    interpretOneCommand("Esc");
    assertThat("Insert mode", environment.isCommandMode());
    shouldBe("Fo[t]o is bar");
  });

  register("Ready to append to line", function() {
    setup("F[o]o is bar");
    interpretOneCommand("A"); // FIXME shouldn't need to do use non-Sequential interpret function
    shouldBe("Foo is bar[ ]");
  });

  register("Append to line", function() {
    setup("F[o]o is bar");
    interpretOneCommand("A"); // FIXME shouldn't need to do use non-Sequential interpret function
    interpretSequence("ista");
    shouldBe("Foo is barista[ ]");
  });

  register("Append to line, last space is removed", function() {
    setup("F[o]o is bar");
    interpretOneCommand("A"); // FIXME shouldn't need to do use non-Sequential interpret function
    interpretSequence("ista");
    interpretOneCommand("Esc");
    shouldBe("Foo is barist[a]");
  });

  register("Join two lines", function() {
      setup("Fl[o]oba|Bar");
      interpretOneCommand("J"); // FIXME shouldn't need to do use non-Sequential interpret function
      shouldBe("Flooba[ ]Bar");
  });
  
  register("Yank current line and paste it below", function() {
    setup("Foo[b]ar|Another");
    interpretSequence("yy");
    interpretSequence("p");
    shouldBe("Foobar|[F]oobar|Another");
  });

  register("Yank current line and paste it twice below", function() {
    setup("Foo[b]ar|Another");
    interpretSequence("yy");
    interpretSequence("pp");
    shouldBe("Foobar|Foobar|[F]oobar|Another");
  });

  register("Search next occurrence of a word under cursor", function() {
    setup("Here is a wo[r]d that is searched word is.");
    interpretOneCommand("*");
    shouldBe("Here is a word that is searched [w]ord is.");
  });

  register("Searching a next word starts from beginning of buffer if not found at the end", function() {
    setup("A rabbit goes down a rabb[i]t hole.");
    interpretOneCommand("*");
    shouldBe("A [r]abbit goes down a rabbit hole.");
  });

  register("Searching a next word goes right", function() {
    setup("A rabbit goes rabbit down a rabb[i]t hole.");
    interpretOneCommand("*");
    shouldBe("A [r]abbit goes rabbit down a rabbit hole.");
  });

  register("Search previous occurrence of a word under cursor", function() {
    setup("Here is a word that is searched w[o]rd is.");
    interpretOneCommand("#");
    shouldBe("Here is a [w]ord that is searched word is.");
  });

  register("Searching a previous word starts from end of buffer if not found at the start", function() {
    setup("A rabb[i]t goes down a rabbit hole.");
    interpretOneCommand("#");
    shouldBe("A rabbit goes down a [r]abbit hole.");
  });

  register("Searching a previous word goes left", function() {
    setup("A rabb[i]t goes down rabbit a rabbit hole.");
    interpretOneCommand("#");
    shouldBe("A rabbit goes down rabbit a [r]abbit hole.");
  });

}
