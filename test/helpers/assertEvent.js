var _ = require("lodash");

module.exports = (contract, filter) =>
  new Promise((resolve, reject) => {
    var event = contract[filter.event]();
    event.watch();
    event.get((error, logs) => {
      var log = _.filter(logs, filter);
      if (log.length > 0) {
        resolve(log);
      } else {
        throw Error("Failed to find filtered event for " + filter.event);
      }
    });
    event.stopWatching();
  })
