// locks.js
let locks = {};

function lockDocument(documentId, userId) {
  locks[documentId] = userId;
}

function unlockDocument(documentId) {
  delete locks[documentId];
}

function isLocked(documentId, userId) {
  return locks[documentId] && locks[documentId] !== userId;
}

module.exports = { lockDocument, unlockDocument, isLocked };