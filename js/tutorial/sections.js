function register_VIM_TUTORIAL_SECTIONS(interpreter, messager, createSection, registerSection, showCommandOneByOne, doc) {
  var G = VIM_GENERIC;

  var pressEnterToContinue = "Press enter to continue.";

  function showInfo(text) { $('.info').text(text); } //.show(); }

  function sendMessageAsync(message) { setTimeout(function() { messager.sendMessage(message); }, 0); }
  
  function requireEnterToContinue() { showCommandOneByOne(["Enter"], accepterCreator); }
  function waitPressToGotoPractice(waitCode, waitKey) {
      messager.sendMessage('waiting_for_code', { 'end': false, 'code': waitCode });
      var forAbortId = messager.listenTo('pressed_key', function (key) {
        console.log("key", key)
          if (key === waitKey) {
              window.location = 'sandbox.html';
              messager.removeListener('pressed_key', forAbortId);
          }
      });
  }

  function defaultPre() { interpreter.environment.setInsertMode(); }

  function defaultPost() {
    interpreter.environment.setCommandMode();
    showInfo(pressEnterToContinue);
    requireEnterToContinue();
  }

  /** FIXME: should reuse existing code/key functionality */
  var accepterCreator = function(command) {
    var accepter = function(key) {
      if(command === 'ctrl-v') return key === 22 || ($.browser.mozilla && key === 118); //XXX: ugly and don't even work properly
      if(command === "Esc") return key === 27;
      if(command === "Enter") return key === 13;

      var keyAsCode = G.intToChar(key);
      var neededCode = command;
      
      return keyAsCode === neededCode;
    };

    return accepter;
  };

  function cmd(code, postFun) {
      return {
        'code': code,
        'postFun': postFun
      };
    }

    /** TEMPORARY duplication */
    function writeChar(code) {
      var $ch = $(doc.getChar(code));
      $ch.insertBefore($('.cursor'));
    }

    function insertText(text, newline) {
      var mode = interpreter.environment.getMode();

      interpreter.environment.setInsertMode();
      
      newline = newline !== undefined ? newline : true;

      if(newline) {
        interpreter.interpretSequence(["Esc", "o"]);
      }

      var words = text.split(" ");

      G.for_each(words, function(word) {
        //interpreter.interpretSequence(word);
        G.for_each(word, writeChar);
        interpreter.interpretOneCommand("Space");
      });

      interpreter.environment.setMode(mode);
    }

  var introduction_section = createSection("Introduction",
        defaultPre,
    [
        "Hello.",
        "I am an interactive |Vim| tutorial.",
        "I'll teach you what Vim is about without hassle. If you are in a hurry, press any key to fast forward.",
        "To practice what you've learned, try out the |practice| page. It has a context sensitive reference for commands.",
        "Now, let me introduce you to basics of Vim."
    ], defaultPost);

    var two_modes_section = createSection("Two modes, insert and normal",
        defaultPre,
    [
        "Vim has two basic modes. One is |insert| mode, in which you write text as if in normal text editor.",
        "Another is |normal| mode which provides you efficient ways to navigate and manipulate text.",
        "At any time, you can see which mode you are in on the status bar which is located at the top of the editor.",
        "To change between modes, use |Esc| for normal mode and |i| for insert mode",
        "Let's try it out! First, change to insert mode."
    ],
    function() {
        interpreter.environment.setCommandMode();
        showCommandOneByOne(
            [
             cmd("i", function() {
               $('.screen_view').addClass('active_context');
               insertText("Good, now you're in insert mode. Write something and change back to normal mode.");
             }),
             cmd("Esc", function() {
               $('.screen_view').removeClass('active_context');
               interpreter.environment.interpretOneCommand("G");
               insertText("Good. Let's move on to another section.");
             }),
             "Enter"
            ],
            accepterCreator);
    }
    );

    var basic_movement = createSection("Basic movement: h, j, k, and l",
        defaultPre,
    [
        "In contrast to regular text editor, you use keys |h|, |j|, |k|, and |l| instead of arrow keys to move the cursor.",
        "Let's see how it works in practice!"
    ], function() {
        interpreter.environment.setCommandMode();
        showCommandOneByOne([
          "h", "h", "h", "k", "l", "l", "h", "h", "j",
          cmd("Enter", function() {
            insertText("Let's move on.");
          }), "Enter"],
          accepterCreator);
    });

    var word_movement = createSection("Word movement: w, e, b",
        defaultPre,
      [
        "To navigate the text in terms of words, you can use keys |w|, |b|, and |e| (also W, B, E in real Vim).",
        "|w| moves to the start of next word; |e| moves to the end of the word; and |b| moves to beginning of the word."
      ], function() {
        interpreter.environment.setCommandMode();
        showCommandOneByOne([
          "b", "b", "w", "b", "e", "w",
          cmd("Enter", function() {
            insertText("Word! Let's move on.");
          }), "Enter"],
          accepterCreator);
    });

    var times_movement = createSection("Number powered movement, e.g. 5w",
      defaultPre,
      [
          "Moving within the text is not limited to individual keys; you can combine movement keys with a |number|. For example, |3w| is the same as pressing w three times."
      ],
      function() {
        interpreter.environment.setCommandMode();
        interpreter.interpretSequence("0");
        showCommandOneByOne(["3", "w", "9", "l", "2", "b",
            cmd("Enter", function() { insertText("With numbers, ain't no numbness.") }),
            "Enter"
        ],
        accepterCreator)
      });

    var times_inserting = createSection("Insert text repeatedly, e.g. 3iYes",
        defaultPre,
        [
            "You can insert text multiple times.",
            "For example, an underline of a header might consist of 30 |-|s.",
            "------------------------------",
            "With |30i-| |Esc|, there's no need to press |-| 30 times.",
            "Let's try it out: insert |go| three times."
        ],
        function() {
            interpreter.environment.setCommandMode();
            showCommandOneByOne(
                ["3", "i", "g", "o", "Esc",
                cmdWithText("Enter", "See? 10iAll work is only playEsc."),
                "Enter"
                ], accepterCreator)
        });

    var find_occurrence = createSection("Find a character, f and F",
        defaultPre,
        [
            "To find and move to the next (or previous) occurrence of a character, use |f| and |F|, e.g. |fo| finds next o.",
            "You can combine f with a number. For example, you can find 3rd occurrence of 'q' with |3fq|, que?"
        ],
        function() {
          interpreter.environment.setCommandMode();
          interpreter.interpretSequence("0");
          showCommandOneByOne(["f", "w", "f", "s", "3", "f", "q",
              cmd("Enter", function() { insertText("F-f-f-ast!") }),
              "Enter"
          ], accepterCreator)
        });

    var matching_parentheses = createSection("Go to matching parentheses, %",
      defaultPre,
      [
        "In text that is structured with parentheses or brackets, |(| or |{| or |[|, use |%| to jump to the matching parenthesis or bracket.",
        "Here is (a sample) text to try that."
      ],
      function() {
        interpreter.environment.setCommandMode();
        interpreter.interpretSequence(["F", "("]);
        showCommandOneByOne(["%", "%", "Enter"], accepterCreator)
      });

    var start_and_end_of_line = createSection("Go to start/end of line, 0 and $",
      defaultPre,
      [
        "To reach the beginning of a line, press |0|.",
        "For the end of a line, there's |$|"
      ],
      function() {
        interpreter.environment.setCommandMode();
        showCommandOneByOne(["0", "$", "0", "Enter"], accepterCreator)
      });

    var word_under_cursor = createSection("Find word under cursor, * and #",
      defaultPre,
        [
         "Find the next occurrence of the word under cursor with |*|, and the previous with |#|."
        ],
        function() {
          interpreter.environment.setCommandMode();
          interpreter.interpretSequence(["0", "w"]);
          showCommandOneByOne(["*", "*", "#",
              cmd("#", function() {
                insertText("Nothing new under the cursor.")
              }), "Enter"], accepterCreator)
        });

    var goto_line = createSection("Goto line, g and G",
        defaultPre,
        [
         "|gg| takes you to the beginning of the file; |G| to the end.",
         "To jump directly to a specific line, give its |line number| along with |G|.",
         "Now go to the beginning of this screen with |gg| and then back to end with |G|."
        ],
        function() {
          interpreter.environment.setCommandMode();
          showCommandOneByOne(["g", "g", "G",
             cmd("Enter", function() {
                 insertText("Go to line 2 with 2G.");
             }),
             "2", "G",
             cmd("Enter", function() {
                insertText("gg! G majorly rocks.")
             }), "Enter"
          ], accepterCreator)
        });

    var search_match = createSection("Search, /text with n and N",
      defaultPre,
      [
        "Searching text is a vital part of any text editor. In Vim, you press |/|, and give the text you are looking for.",
        "You can repeat the search for next and previous occurrences with |n| and |N|, respectively.",
        "For advanced use cases, it's possible to use regexps that help to find text of particular form (In real Vim).",
        "Let's try a simple text search.",
        "Search for |text| and find the subsequent matches with |n|."
      ],
      function() {
        interpreter.environment.setCommandMode();
        interpreter.interpretSequence("1G");
        showCommandOneByOne(
          ["/", "t", "e", "x", "t", "Enter", "n", "n", "N", "N",
          cmd("Enter",
            function() {
              interpreter.interpretSequence(["/", "Esc"]);
              insertText("Slash through the needles with /n/e/e/d/l/e/s");
            }),
          "Enter"], accepterCreator
        )
      });

    var removing = createSection("Removing a character, x and X",
        defaultPre,
      [
      "|x| and |X| delete the character under the cursor and to the left of the cursor, respectively",
      "Try pressing |x| to remove the last word."
      ], function() {
        interpreter.environment.setCommandMode();
        showCommandOneByOne([
          "x", "x", "x", "x", "x",
          cmd("x", function() {
             insertText("Sometimes the treasure is the indicator (x).");
          }),
            /*
          "X", "X", "X", "X", "X",
          cmd("X", function() {
            //insertText("You removed yourself from this section. Next!");
          }),
          */
          "Enter"],
          accepterCreator);
    });

    var replacing = createSection("Replacing letter under cursor, r",
        defaultPre,
      [
      "When you need to replace only one character under your cursor, without changing to insert mode, use |r|.",
      "Replace my"
      ], function() {
        interpreter.environment.setCommandMode();
        interpreter.interpretSequence("Fy");
        showCommandOneByOne([
          "r", "e", "Enter"],
          accepterCreator);
    });

    function cmdWithText(command, text) {
        return cmd(command, function() {
                 insertText(text);
               });
    }

    function setActiveContext() { $('.screen_view').addClass('active_context'); }
    function unsetActiveContext() { $('.screen_view').removeClass('active_context'); }

    var adding_line = createSection("Insert new line, o and O",
      defaultPre,
        [
            "To insert text into a new line, press |o| or |O|",
            "After new line is created, the editor is set to |insert| mode.",
            "Write a bit and get back to |normal| mode."
        ], function() {
            interpreter.environment.setCommandMode();
            interpreter.interpretSequence(["2", "G"]);
            showCommandOneByOne([
                cmd("o", function() {
                    setActiveContext();
                }),
                cmd("Esc", function() {
                    unsetActiveContext();
                    insertText("Yep! Now big O to insert new line above the current line.");
                    interpreter.environment.setCommandMode();
                }),
                cmd("O", setActiveContext),
                cmd("Esc",
                    function() {
                        insertText("I bet you feel like O___o");
                        unsetActiveContext();
                    }), "Enter"
            ], accepterCreator)
        });

    var deleting = createSection("Deleting, d",
        defaultPre,
      [
      "|d| is the delete command",
      "You can combine it with movement, e.g. |dw| deletes the first word on the right side of the cursor",
      "It also copies the content, so that you can paste it with |p| to another location (on real Vim)."
      ], function() {
        interpreter.environment.setCommandMode();
        interpreter.environment.interpretOneCommand("0");
        showCommandOneByOne([
          "d", "w",
          cmd("Enter", function() {
            insertText("The word is gone. Now let's remove two words with d2e.");
            interpreter.environment.interpretSequence(["0"]);
          }),
          "d", "2", "e",
          cmd("Enter", function() {
            insertText("To 'de' or not to 'de', is not the question, anymore.");
          }), "Enter"],
          accepterCreator);
    });

  var repetition = createSection("Repetition with .",
    defaultPre,
    [
        "To repeat the previous command, just press |.|",
        "First, remove two words with |d2w|.",
        "After that, remove the rest of the words in this line with |.|"
    ],
      function() {
        interpreter.environment.setCommandMode();
        interpreter.interpretOneCommand("0");
        showCommandOneByOne([
            "d", "2",
            "w", ".", ".", ".", ".", ".",
          cmd("Enter", function() {
            insertText("Repetition is the root of all periods.")
          }),
            "Enter"
        ], accepterCreator)
      });

  var visual_mode = createSection("Visual mode, v",
    defaultPre,
    [
      "Besides insert and normal mode, Vim has also |visual| mode.",
      "In visual mode, you select text using movement keys before you decide what to do with it.",
      "Let's see how. Goto visual mode with |v|. Then select a word with |e|. After you've selected the text, you can delete it with |d|.",
      "This sentence has not seen the light."
    ],
    function() {
      interpreter.environment.setCommandMode();
      interpreter.interpretSequence("4b");
      showCommandOneByOne(
        ["v", "e", "l", "d",
          cmdWithText("Enter", "(Visually gifted, I lost my words.)"), "Enter"
        ], accepterCreator)
    });

  var visual_block_mode = createSection("Visual block mode, ctrl-v",
    defaultPre,
    [
      "There is yet another mode: |visual block|. This makes it possible to insert text on many lines at once. Let's see how with an example list.",
      "<> A smart girl",
      "<> Ulysses",
      "<> Learn and teach",
      "First, move cursor to insert position. Then press |ctrl-v| to go into visual block mode. Move cursor vertically to select lines. Now press |I|, and prepend text to the selected area. |Esc| completes the insertion."
    ],
    function() {
      interpreter.environment.setCommandMode();
      interpreter.interpretSequence("2G");
      showCommandOneByOne(["l", "ctrl-v", "j", "j", "I", "o", "Esc",
        cmdWithText("Enter", "Blocks are obstacles for making progress."), "Enter"],
        accepterCreator);
    });

  var last_commands = createSection("Real Vim awaits",
        defaultPre,
    [
        "Now you should be quite confident to enter the real Vim.",
        "Most important commands to remember are |:w| (save), |:q| (quit), and |:q!| (quit without saving).",
        "Also don't |PANIC!| If you make a mistake, press |u| for undo and |ctrl+R| for redo",
        "If you have a problem, or want to learn more about what Vim offers, type |:help|"
    ],
        defaultPost
    );

  var the_end = createSection("The end", defaultPre,
      [
        "Thank you for your time. I hope you enjoyed.",
        "Press |space| if you want to test out the commands freely in the practice editor.",
        "Bye!"
      ], () => waitPressToGotoPractice('Space', 32));

  // append a and A
  // J join lines

  /**********************************************
   * Later
   **********************************************/

  // undo
  // change inside parentheses
  // macro

  /**********************************************
   * Register sections
   **********************************************/

    registerSections([
      introduction_section,
      two_modes_section,
      basic_movement,
      word_movement,
      times_movement,
      times_inserting,
      find_occurrence,
      matching_parentheses,
      start_and_end_of_line,
      word_under_cursor,
      goto_line,
      search_match,
      adding_line,
      removing,
      replacing,
      deleting,
      repetition,
      visual_mode,
      //visual_block_mode, // TODO enable when ctrl-v works with most browsers
      last_commands,
      the_end
    ]);

  function registerSections(sections) {
    G.for_each(sections, function(section) {
      registerSection(section);
    });
  }
}
