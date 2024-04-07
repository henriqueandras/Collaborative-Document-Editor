const { Schema, model } = require("mongoose");
// Our MongoDB Schema for the Documents.
// Contains a string for the document id, and an Object type for the data inside the document (It is a Quill text editor object)
const Document = new Schema({
  _id: String,
  data: Object,
});

module.exports = model("Document", Document);
