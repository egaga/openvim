/**
 * Module for sending messages between participants that don't know each other (necessarily).
 *
 * A listener calls 'listenTo' for registering to listen a particular type of message.
 * An id token is returned for identifying listener for that message type.
 *
 * The listener gives a callback function that is called with a suitable typed message when one arrives.
 *
 * The listener can remove itself from receiving further messages of particular type with 'removeListener' by giving message type and id.
 */
function create_VIM_MESSAGER() {
  var G = VIM_GENERIC;
  
  var idGenerator = 0;
  var REMOVE_THIS_LISTENER = "REMOVE_THIS_LISTENER";

  function nextId() { return idGenerator++; }

  // supported message types (TODO maybe should be registerable on the fly)
  var messageListeners = {
    'interpreter_initialized': [],
    'cursor_changed': [],
    'interpret_code': [],
    'interpreter_interpreted': [],
    'updated_mode': [],
    'pressed_key': [],
    'tutorial_next_command': [],
    'tutorial_next_section': [],
    'waiting_for_code': [],
    'abort_section': [],
    'searchbar_visible': [],
    'updated_searchtext': []
  };

  function sendMessage(messageType, message) {
    var messageListenersForMessage = messageListeners[messageType];

    var removables = [];

    G.for_each(messageListenersForMessage, function(listener) {
      var result = listener.fun(message);

      if(result === REMOVE_THIS_LISTENER) {
        listener.fun = G.nothing;
        removables.push(listener.id);
      }
    });

    messageListeners[messageType] =
        G.filter(messageListenersForMessage,
                 function(listener) { return !G.existsIn(listener.id, removables); });
  }

  function listenTo(messageType, fun) {
    var id = nextId();

    messageListeners[messageType].push(
        {
          'id': id,
          'fun': fun
        }
    );

    return id;
  }

  //TODO: create a test
  function removeListener(messageType, id) {
    messageListeners[messageType] =
        G.filter(messageListeners[messageType],
                 function(listener) { return listener.id != id; });
  }

  return {
    sendMessage: sendMessage,
    listenTo: listenTo,
    removeListener: removeListener,
    REMOVE_THIS_LISTENER: REMOVE_THIS_LISTENER
  }
}
