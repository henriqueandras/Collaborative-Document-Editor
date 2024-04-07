// This file has utils to assist in formatting data to be sent back to our text editor
function getInsertedDataFromQuill(delta) {
  if (!delta) {
    return { insert: "" };
  }
  if (!delta.ops) {
    return { insert: "" };
  }

  if (delta.ops.length === 0) {
    return { insert: "" };
  }

  for (const op of delta.ops) {
    if ("insert" in op) {
      return op;
    }
  }
  return { insert: "" };
}

module.exports = {
  getInsertedDataFromQuill: getInsertedDataFromQuill,
};
