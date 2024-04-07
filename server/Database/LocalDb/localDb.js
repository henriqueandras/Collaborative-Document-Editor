// We created a command to run a local database so that we can quickly test things without always using Docker
// This class helps us accomplish that
class Document {
  constructor() {
    this.db = {};
  }

  create({ _id, data }) {
    this.db[_id] = {
      data: data,
    };
  }

  findById(id) {
    if (id in this.db) {
      return this.db[id];
    }
    return null;
  }

  findByIdAndUpdate(id, dataObj) {
    if (id in this.db) {
      this.db[id] = dataObj;
    } else {
      this.db[id] = dataObj;
    }
  }
}

module.exports = new Document();
